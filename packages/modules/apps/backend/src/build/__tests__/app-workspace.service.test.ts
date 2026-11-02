import {
	createFilesystem,
	createSandbox,
	type CommandResult,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { BadRequestError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AppWorkspaceService } from '../app-workspace.service';
import { AppSandboxSettings } from '../app-sandbox-settings';
import { AppBuildError } from '../app-build.types';
import { AppsConfig } from '../../apps.config';
import { AppArchive } from '../../app-archive';

const appId = '11111111-1111-4111-8111-111111111111';

vi.mock('@n8n/agents/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/sandbox')>()),
	createSandbox: vi.fn(),
	createFilesystem: vi.fn(),
	getWorkspaceRoot: vi.fn(async () => '/workspace'),
}));

function setup(provider: 'daytona' | 'n8n-sandbox' = 'n8n-sandbox') {
	const settings = mock<AppSandboxSettings>();
	settings.resolve.mockResolvedValue(
		provider === 'daytona'
			? { enabled: true, provider, daytonaApiKey: 'test-key' }
			: { enabled: true, provider, serviceUrl: 'http://sandbox.test' },
	);
	const sandbox = mock<WorkspaceSandbox>();
	const filesystem = mock<WorkspaceFilesystem>();
	filesystem.rmdir.mockResolvedValue(undefined);
	vi.mocked(createSandbox).mockResolvedValue(sandbox);
	vi.mocked(createFilesystem).mockReturnValue(filesystem);
	sandbox.executeCommand = vi
		.fn()
		.mockResolvedValue(
			mock<CommandResult>({ exitCode: 0, stdout: '', stderr: '', timedOut: false, killed: false }),
		);
	const archives = mock<AppArchive>();
	const files = new Map([['index.html', Buffer.from('built')]]);
	archives.pack.mockResolvedValue(Buffer.from('source'));
	archives.unpack.mockResolvedValue(files);
	filesystem.stat.mockResolvedValue({
		name: 'bundle.tgz',
		path: '',
		type: 'file',
		size: 10,
		createdAt: new Date(),
		modifiedAt: new Date(),
	});
	filesystem.readFile.mockResolvedValue(Buffer.from('bundle'));
	const config = new AppsConfig();
	const service = new AppWorkspaceService(settings, config, archives, mock<Logger>());
	const attempt = { attemptNumber: 1, startedAt: new Date() };
	const build = async () =>
		await service.build('project', appId, 'version', attempt, files, new AbortController().signal);
	return { service, settings, sandbox, filesystem, archives, files, config, build };
}

describe('AppWorkspaceService', () => {
	it.each(['daytona', 'n8n-sandbox'] as const)(
		'reconnects to the same app identity through %s',
		async (provider) => {
			const { build, settings } = setup(provider);
			await build();
			expect(settings.resolve).toHaveBeenCalledWith('project', {});
			const first = vi.mocked(createSandbox).mock.calls.at(-1)?.[0];
			await build();
			expect(vi.mocked(createSandbox).mock.calls.at(-1)?.[0]).toEqual(first);
			expect(first).toMatchObject({
				enabled: true,
				provider,
				ephemeral: true,
				id: appId,
			});
			if (provider === 'daytona') expect(first).toMatchObject({ name: `app-build-${appId}` });
		},
	);

	it.each(['daytona', 'n8n-sandbox'] as const)(
		'blocks builds when %s sandboxes are disabled',
		async (provider) => {
			const { build, settings } = setup(provider);
			settings.resolve.mockResolvedValue({ enabled: false, provider });

			await expect(build()).rejects.toThrow(BadRequestError);
			expect(settings.resolve).toHaveBeenCalledWith('project', {});
			expect(createSandbox).not.toHaveBeenCalled();
		},
	);

	it('passes deadlines and cancellation through command and file operations', async () => {
		const { build, sandbox, filesystem, config } = setup();
		config.buildTimeoutMs = 45_000;
		config.maxBuildLogBytes = 1234;
		await build();
		expect(sandbox.executeCommand).toHaveBeenCalledWith(
			'timeout',
			expect.arrayContaining([
				'flock',
				'/workspace/app-build/build.lock',
				String(config.maxBuildLogBytes),
			]),
			expect.objectContaining({
				timeout: expect.any(Number),
				abortSignal: expect.any(AbortSignal),
			}),
		);
		const options = vi.mocked(sandbox.executeCommand!).mock.calls[0][2];
		expect(options?.timeout).toBeGreaterThan(0);
		expect(options?.timeout).toBeLessThanOrEqual(config.buildTimeoutMs);
		expect(filesystem.writeFile).toHaveBeenCalledWith(
			'/workspace/app-build/attempts/version-1/source.tgz',
			Buffer.from('source'),
			expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
		);
	});

	it('checks compressed size before downloading output', async () => {
		const { build, filesystem, config, archives } = setup();
		filesystem.stat.mockResolvedValue({
			name: '',
			path: '',
			type: 'file',
			size: config.maxArtifactSizeBytes + 1,
			createdAt: new Date(),
			modifiedAt: new Date(),
		});
		await expect(build()).rejects.toThrow(AppBuildError);
		expect(filesystem.readFile).not.toHaveBeenCalled();
		expect(archives.unpack).not.toHaveBeenCalled();
	});

	it('returns the failed stage and command output', async () => {
		const { build, sandbox, filesystem } = setup();
		vi.mocked(sandbox.executeCommand!).mockResolvedValue(
			mock<CommandResult>({
				exitCode: 1,
				stdout: 'Compilation error',
				stderr: '',
				timedOut: false,
				killed: false,
			}),
		);
		filesystem.readFile.mockResolvedValue('build');
		await expect(build()).rejects.toMatchObject({
			stage: 'build',
			log: expect.stringContaining('Compilation error'),
			retryable: false,
		});
	});

	it('returns archive validation errors as build diagnostics', async () => {
		const { build, archives } = setup();
		archives.unpack.mockRejectedValue(new BadRequestError('Invalid compiled archive.'));
		await expect(build()).rejects.toMatchObject({
			stage: 'validate',
			message: 'Invalid compiled archive.',
			retryable: false,
		});
		expect(archives.unpack).toHaveBeenCalledWith(Buffer.from('bundle'), true);
	});

	it('passes unexpected archive errors to the build service', async () => {
		const { build, archives } = setup();
		const error = new Error('Archive operation failed.');
		archives.unpack.mockRejectedValue(error);
		await expect(build()).rejects.toBe(error);
	});

	it('leaves staging in place when a remote command may still be running', async () => {
		const { build, sandbox, filesystem } = setup();
		vi.mocked(sandbox.executeCommand!).mockRejectedValue(new Error('Connection lost.'));
		await expect(build()).rejects.toThrow('Connection lost.');
		expect(filesystem.rmdir).not.toHaveBeenCalled();
	});

	it.each(['daytona', 'n8n-sandbox'] as const)(
		'deletes the %s app sandbox when sandboxes are disabled',
		async (provider) => {
			const { service, settings, sandbox } = setup(provider);
			settings.resolve.mockImplementation(async (_projectId, options) => {
				if (options?.checkEnabled !== false) return { enabled: false, provider };
				return provider === 'daytona'
					? { enabled: true, provider, daytonaApiKey: 'test-key' }
					: { enabled: true, provider, serviceUrl: 'http://sandbox.test' };
			});

			await service.delete('project', appId);
			expect(settings.resolve).toHaveBeenCalledExactlyOnceWith('project', { checkEnabled: false });
			expect(vi.mocked(createSandbox).mock.calls.at(-1)?.[0]).toMatchObject({
				enabled: true,
				provider,
				id: appId,
				...(provider === 'daytona' ? { name: `app-build-${appId}` } : {}),
			});
			expect(sandbox.deleteRemote).toHaveBeenCalledOnce();
			expect(sandbox._start).not.toHaveBeenCalled();
			expect(sandbox.executeCommand).not.toHaveBeenCalled();
			expect(createFilesystem).not.toHaveBeenCalled();
		},
	);
});
