import type { Workspace } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { buildApp } from '@n8n/instance-ai';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AppSourceSnapshotService } from '@/modules/instance-ai/app-preview/app-source-snapshot.service';
import type { InstanceAiSandboxService } from '@/modules/instance-ai/sandbox';
import type { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';
import type { AiService } from '@/services/ai.service';
import type { UrlService } from '@/services/url.service';

import { AppPublishService, buildResetAppDirScript } from '../app-publish.service';
import type { AppVersion } from '../app-version.entity';
import type { App } from '../app.entity';
import type { AppsService } from '../apps.service';

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	buildApp: vi.fn(),
}));
vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/user/workspace')),
}));

class TestableAppPublishService extends AppPublishService {
	constructor(
		appsService: AppsService,
		snapshotService: AppSourceSnapshotService,
		private readonly sandboxServiceMock: ReturnType<typeof mock<InstanceAiSandboxService>>,
	) {
		const urlService = mock<UrlService>();
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
		super(
			appsService,
			urlService,
			snapshotService,
			mock<InstanceAiSettingsService>(),
			mock<AiService>(),
			mock<GlobalConfig>(),
			mock<Logger>(),
			mock<ErrorReporter>(),
		);
	}

	protected getSandboxService() {
		return this.sandboxServiceMock;
	}
}

const ROOT = '/home/user/workspace';
const APP = { id: 'app-1', name: 'Greeter', namespace: 'greeter', activeVersionId: 'v-0' } as App;
const USER = { id: 'user-1' } as User;
const SOURCE = { fileName: 'greeter-v-3.tgz', data: Buffer.from([0x1f, 0x8b, 0x08, 0x00]) };
const UNBUILT = { id: 'v-3', appId: 'app-1', distStorageKey: null } as unknown as AppVersion;
const BUILT_VERSION = { ...UNBUILT, distStorageKey: 'blob/dist' } as AppVersion;
const BUILT = {
	appId: 'app-1',
	name: 'Greeter',
	namespace: 'greeter',
	projectId: 'proj-1',
	versionId: 'v-3',
	url: 'http://localhost:5678/apps/greeter/',
	warnings: [],
};

const ok = (stdout = '') => ({ exitCode: 0, stdout, stderr: '' });
const fail = (stdout = '', stderr = '') => ({ exitCode: 1, stdout, stderr });

function createService() {
	const appsService = mock<AppsService>();
	appsService.getApp.mockResolvedValue(APP);
	appsService.getNewestVersion.mockResolvedValue(UNBUILT);
	appsService.getVersion.mockResolvedValue(UNBUILT);
	appsService.getVersionSource.mockResolvedValue(SOURCE);
	const snapshotService = mock<AppSourceSnapshotService>();
	snapshotService.snapshotAfterRun.mockResolvedValue({ outcome: 'unchanged' });

	const executeCommand = vi.fn().mockResolvedValue(ok());
	const writeFile = vi.fn().mockResolvedValue(undefined);
	const workspace = { sandbox: { executeCommand }, filesystem: { writeFile } };
	const sandboxServiceMock = mock<InstanceAiSandboxService>();
	sandboxServiceMock.getOrCreateWorkspaceEntry.mockResolvedValue({ workspace } as never);

	const service = new TestableAppPublishService(appsService, snapshotService, sandboxServiceMock);
	return { service, appsService, snapshotService, executeCommand, writeFile, sandboxServiceMock };
}

describe('buildResetAppDirScript', () => {
	it('empties only the app directory, keeping node_modules', () => {
		expect(buildResetAppDirScript({ root: ROOT, namespace: 'greeter' })).toBe(
			`mkdir -p '${ROOT}/apps/greeter' '${ROOT}/.app-builds' && ` +
				`find '${ROOT}/apps/greeter' -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +`,
		);
	});
});

describe('AppPublishService', () => {
	beforeEach(() => {
		vi.mocked(buildApp).mockReset();
		vi.mocked(buildApp).mockResolvedValue(BUILT);
	});

	it('replaces the sources in the build sandbox with the newest stored ones, then builds', async () => {
		const { service, appsService, executeCommand, writeFile, sandboxServiceMock, snapshotService } =
			createService();

		const result = await service.publish('app-1', USER);

		expect(result).toEqual({ versionId: 'v-3', url: 'http://localhost:5678/apps/greeter/' });
		expect(snapshotService.snapshotAfterRun).not.toHaveBeenCalled();
		expect(appsService.setActiveVersion).toHaveBeenCalledWith('app-1', 'v-3');
		expect(sandboxServiceMock.getOrCreateWorkspaceEntry).toHaveBeenCalledWith(
			'app-publish-app-1',
			USER,
		);
		const commands = executeCommand.mock.calls.map((call: unknown[]) => String(call[0]));
		expect(commands[0]).toBe(buildResetAppDirScript({ root: ROOT, namespace: 'greeter' }));
		// The scoped filesystem resolves the root-relative staging path before the sandbox sees it.
		expect(writeFile).toHaveBeenCalledWith(
			expect.stringMatching(new RegExp(`^${ROOT}/\\.app-builds/greeter-\\d+-publish\\.tgz$`)),
			SOURCE.data,
			undefined,
		);
		expect(commands[1]).toMatch(
			new RegExp(
				`^tar -xzf ${ROOT}/\\.app-builds/greeter-\\d+-publish\\.tgz -C ${ROOT}/apps/greeter;`,
			),
		);
		expect(commands[1]).toContain('npm install --ignore-scripts');
		expect(executeCommand.mock.calls[1][2]).toEqual({ env: { CI: 'true' }, timeout: 600_000 });
		expect(buildApp).toHaveBeenCalledWith(
			expect.objectContaining({ appService: expect.any(Object), appWorkspace: expect.any(Object) }),
			{ action: 'build', appId: 'app-1' },
		);
	});

	it('snapshots the thread draft before reading the newest source', async () => {
		const { service, appsService, snapshotService } = createService();
		const workspace = mock<Workspace>();
		const order: string[] = [];
		snapshotService.snapshotAfterRun.mockImplementation(async () => {
			order.push('snapshot');
			return { outcome: 'stored', versionId: 'v2' };
		});
		appsService.getNewestVersion.mockImplementation(async () => {
			order.push('read');
			return UNBUILT;
		});

		await service.publish('app-1', USER, { draft: workspace });

		expect(snapshotService.snapshotAfterRun).toHaveBeenCalledWith('app-1', USER, workspace);
		expect(order).toEqual(['snapshot', 'read']);
	});

	it('reports the snapshot stage and does not build when the draft cannot be stored', async () => {
		const { service, snapshotService, sandboxServiceMock } = createService();
		snapshotService.snapshotAfterRun.mockRejectedValue(new Error('blob store down'));

		const result = await service.publish('app-1', USER, {
			draft: mock<Workspace>(),
		});

		expect(result).toEqual({ error: true, stage: 'snapshot', message: 'blob store down' });
		expect(sandboxServiceMock.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
		expect(buildApp).not.toHaveBeenCalled();
	});

	it('reports the snapshot stage when the sandbox holds the app but its source could not be packed', async () => {
		const { service, snapshotService, sandboxServiceMock } = createService();
		snapshotService.snapshotAfterRun.mockResolvedValue({
			outcome: 'failed',
			message: 'Could not pack the app source (exit code 1). tar: error',
		});

		const result = await service.publish('app-1', USER, { draft: mock<Workspace>() });

		expect(result).toEqual({
			error: true,
			stage: 'snapshot',
			message: 'Could not pack the app source (exit code 1). tar: error',
		});
		expect(sandboxServiceMock.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
		expect(buildApp).not.toHaveBeenCalled();
	});

	it('reports the restore stage when the app has no stored source', async () => {
		const { service, appsService, sandboxServiceMock } = createService();
		appsService.getNewestVersion.mockResolvedValue(null);

		const result = await service.publish('app-1', USER);

		expect(result).toEqual({
			error: true,
			stage: 'restore',
			message: expect.stringContaining('no stored source'),
		});
		expect(sandboxServiceMock.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
	});

	it('reports the sandbox stage when no sandbox is available', async () => {
		const { service, sandboxServiceMock } = createService();
		sandboxServiceMock.getOrCreateWorkspaceEntry.mockResolvedValue(undefined);

		const result = await service.publish('app-1', USER);

		expect(result).toEqual({
			error: true,
			stage: 'sandbox',
			message: expect.stringContaining('sandbox'),
		});
		expect(buildApp).not.toHaveBeenCalled();
	});

	it('reports the restore stage with the log tail when the unpack or install fails', async () => {
		const { service, executeCommand, writeFile } = createService();
		executeCommand.mockResolvedValueOnce(ok()).mockResolvedValueOnce(fail('npm ERR! 404', 'oops'));

		const result = await service.publish('app-1', USER);

		expect(writeFile).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			error: true,
			stage: 'restore',
			message: expect.stringContaining('install'),
			log: 'npm ERR! 404\noops',
		});
		expect(buildApp).not.toHaveBeenCalled();
	});

	it('passes a build failure through with its stage and log', async () => {
		const { service } = createService();
		const failure = {
			error: true as const,
			stage: 'build' as const,
			message: 'vite failed',
			log: 'x',
		};
		vi.mocked(buildApp).mockResolvedValue(failure);

		await expect(service.publish('app-1', USER)).resolves.toEqual(failure);
	});

	it("attaches the dist to the version it built and drops the build's own source", async () => {
		const { service, appsService } = createService();
		vi.mocked(buildApp).mockImplementation(async (context) => {
			const stored = await context.appService!.storeVersion('app-1', {
				source: Buffer.from('s'),
				dist: Buffer.from('d'),
			});
			return { ...BUILT, versionId: stored.versionId };
		});

		const result = await service.publish('app-1', USER);

		expect(appsService.attachDist).toHaveBeenCalledWith('app-1', 'v-3', Buffer.from('d'));
		expect(appsService.createVersion).not.toHaveBeenCalled();
		expect(result).toMatchObject({ versionId: 'v-3' });
	});

	it('serves an already built newest version without building', async () => {
		const { service, appsService, sandboxServiceMock } = createService();
		appsService.getNewestVersion.mockResolvedValue(BUILT_VERSION);

		const result = await service.publish('app-1', USER);

		expect(result).toEqual({ versionId: 'v-3', url: 'http://localhost:5678/apps/greeter/' });
		expect(appsService.setActiveVersion).toHaveBeenCalledWith('app-1', 'v-3');
		expect(sandboxServiceMock.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
		expect(buildApp).not.toHaveBeenCalled();
	});

	describe('buildVersion', () => {
		it('shares one build between concurrent requests for the same version', async () => {
			const { service } = createService();

			const [a, b] = await Promise.all([
				service.buildVersion('app-1', USER, 'v-3'),
				service.buildVersion('app-1', USER, 'v-3'),
			]);

			expect(a).toEqual(b);
			expect(buildApp).toHaveBeenCalledTimes(1);
		});

		it('runs builds of one app one after another', async () => {
			const { service, appsService } = createService();
			const order: string[] = [];
			vi.mocked(buildApp).mockImplementation(async (_context, input) => {
				const versionId = appsService.getVersion.mock.calls.at(-1)?.[1];
				order.push(`start ${versionId}`);
				await new Promise((resolve) => setTimeout(resolve, 5));
				order.push(`end ${versionId}`);
				return { ...BUILT, appId: input.appId, versionId: String(versionId) };
			});
			appsService.getVersion.mockImplementation(
				async (_appId, versionId) => ({ ...UNBUILT, id: versionId }) as AppVersion,
			);

			await Promise.all([
				service.buildVersion('app-1', USER, 'v-3'),
				service.buildVersion('app-1', USER, 'v-4'),
			]);

			expect(order).toEqual(['start v-3', 'end v-3', 'start v-4', 'end v-4']);
		});

		it('does not rebuild a version that gained its dist in the meantime', async () => {
			const { service, appsService, sandboxServiceMock } = createService();
			appsService.getVersion.mockResolvedValue(BUILT_VERSION);

			await expect(service.buildVersion('app-1', USER, 'v-3')).resolves.toEqual({
				versionId: 'v-3',
				url: 'http://localhost:5678/apps/greeter/',
			});
			expect(sandboxServiceMock.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
		});
	});

	describe('scheduleBuild', () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('builds the newest unbuilt version once after a burst of schedules', async () => {
			const { service } = createService();

			service.scheduleBuild('app-1', USER);
			await vi.advanceTimersByTimeAsync(4_000);
			service.scheduleBuild('app-1', USER);
			await vi.advanceTimersByTimeAsync(4_000);
			expect(buildApp).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1_000);
			expect(buildApp).toHaveBeenCalledTimes(1);
		});

		it('does nothing when the newest version is built already', async () => {
			const { service, appsService, sandboxServiceMock } = createService();
			appsService.getNewestVersion.mockResolvedValue(BUILT_VERSION);

			service.scheduleBuild('app-1', USER);
			await vi.advanceTimersByTimeAsync(5_000);

			expect(sandboxServiceMock.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
			expect(buildApp).not.toHaveBeenCalled();
		});
	});
});
