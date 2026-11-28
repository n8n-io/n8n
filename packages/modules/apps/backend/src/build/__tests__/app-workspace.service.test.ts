import {
	createFilesystem,
	createSandbox,
	type CommandResult,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { BadRequestError } from '@n8n/errors';
import type { InstanceSettings } from 'n8n-core';
import { v5 as uuidv5 } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { AppWorkspaceService } from '../app-workspace.service';
import { AppSandboxSettings } from '../app-sandbox-settings';
import { AppBuildError } from '../app-build.types';
import { AppsConfig } from '../../apps.config';
import { AppArchive } from '../../app-archive';

const appId = '11111111-1111-4111-8111-111111111111';
const instanceId = 'instance-1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

vi.mock('@n8n/agents/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/sandbox')>()),
	createSandbox: vi.fn(),
	createFilesystem: vi.fn(),
	getWorkspaceRoot: vi.fn(async () => '/workspace'),
}));

function setup(
	provider: 'daytona' | 'n8n-sandbox' = 'n8n-sandbox',
	options: { instanceId?: string; projectId?: string; appId?: string } = {},
) {
	const currentInstanceId = options.instanceId ?? instanceId;
	const currentProjectId = options.projectId ?? 'project';
	const currentAppId = options.appId ?? appId;
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
	const instanceSettings = mock<InstanceSettings>({ instanceId: currentInstanceId });
	const service = new AppWorkspaceService(
		settings,
		config,
		archives,
		instanceSettings,
		mock<Logger>(),
	);
	const attempt = { attemptNumber: 1, startedAt: new Date() };
	const build = async () =>
		await service.build(
			currentProjectId,
			currentAppId,
			'version',
			attempt,
			files,
			'dependency-key',
			new AbortController().signal,
		);
	return { service, settings, sandbox, filesystem, archives, files, config, build };
}

describe('AppWorkspaceService', () => {
	it.each(['daytona', 'n8n-sandbox'] as const)(
		'reconnects to the same derived app identity through %s',
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
			});
			const sandboxId = first && 'id' in first ? first.id : undefined;
			expect(sandboxId).toMatch(UUID_PATTERN);
			expect(sandboxId).not.toBe(appId);
			if (provider === 'daytona') {
				expect(first).toMatchObject({ name: `app-build-${sandboxId}` });
			}
		},
	);

	it.each(['daytona', 'n8n-sandbox'] as const)(
		'uses the same derived sandbox ID for build and delete on %s',
		async (provider) => {
			const { service, build } = setup(provider);
			await build();
			const buildConfig = vi.mocked(createSandbox).mock.calls.at(-1)?.[0];
			await service.delete('project', appId);
			const deleteConfig = vi.mocked(createSandbox).mock.calls.at(-1)?.[0];
			expect(deleteConfig).toEqual(buildConfig);
		},
	);

	it('derives a namespaced sandbox ID distinct from a pre-computed UUIDv5 app ID', async () => {
		const otherNamespace = '51989c13-3ae7-4167-8e64-d874dd068795';
		const precomputedId = uuidv5(
			JSON.stringify([instanceId, 'project', 'agent-1']),
			otherNamespace,
		);
		const { service, build } = setup('n8n-sandbox', { appId: precomputedId });

		await build();
		const buildConfig = vi.mocked(createSandbox).mock.calls.at(-1)?.[0];
		await service.delete('project', precomputedId);
		const deleteConfig = vi.mocked(createSandbox).mock.calls.at(-1)?.[0];

		const derivedId = buildConfig && 'id' in buildConfig ? buildConfig.id : undefined;
		expect(derivedId).toMatch(UUID_PATTERN);
		expect(derivedId).not.toBe(precomputedId);
		expect(deleteConfig).toEqual(buildConfig);
	});

	it('scopes derived sandbox IDs by instance and project', async () => {
		const first = setup('n8n-sandbox', { instanceId: 'instance-1', projectId: 'project-1' });
		await first.build();
		const firstConfig = vi.mocked(createSandbox).mock.calls.at(-1)?.[0];

		const otherInstance = setup('n8n-sandbox', {
			instanceId: 'instance-2',
			projectId: 'project-1',
		});
		await otherInstance.build();
		const otherInstanceConfig = vi.mocked(createSandbox).mock.calls.at(-1)?.[0];

		const otherProject = setup('n8n-sandbox', {
			instanceId: 'instance-1',
			projectId: 'project-2',
		});
		await otherProject.build();
		const otherProjectConfig = vi.mocked(createSandbox).mock.calls.at(-1)?.[0];

		const firstId = firstConfig && 'id' in firstConfig ? firstConfig.id : undefined;
		const otherInstanceId =
			otherInstanceConfig && 'id' in otherInstanceConfig ? otherInstanceConfig.id : undefined;
		const otherProjectId =
			otherProjectConfig && 'id' in otherProjectConfig ? otherProjectConfig.id : undefined;

		expect(firstId).toMatch(UUID_PATTERN);
		expect(otherInstanceId).toMatch(UUID_PATTERN);
		expect(otherProjectId).toMatch(UUID_PATTERN);
		expect(otherInstanceId).not.toBe(firstId);
		expect(otherProjectId).not.toBe(firstId);
	});

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
				'dependency-key',
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
		expect(filesystem.writeFile).toHaveBeenCalledWith(
			'/workspace/app-build/attempts/version-1/build.sh',
			expect.stringContaining(
				'npm ci --include=dev --ignore-scripts --no-audit --no-fund --prefer-offline',
			),
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
			const deleteConfig = vi.mocked(createSandbox).mock.calls.at(-1)?.[0];
			const sandboxId = deleteConfig && 'id' in deleteConfig ? deleteConfig.id : undefined;
			expect(sandboxId).toMatch(UUID_PATTERN);
			expect(sandboxId).not.toBe(appId);
			expect(deleteConfig).toMatchObject({
				enabled: true,
				provider,
				id: sandboxId,
				...(provider === 'daytona' ? { name: `app-build-${sandboxId}` } : {}),
			});
			expect(sandbox.deleteRemote).toHaveBeenCalledOnce();
			expect(sandbox._start).not.toHaveBeenCalled();
			expect(sandbox.executeCommand).not.toHaveBeenCalled();
			expect(createFilesystem).not.toHaveBeenCalled();
		},
	);
});
