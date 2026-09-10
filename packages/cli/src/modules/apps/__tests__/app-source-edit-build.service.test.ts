import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiSandboxService } from '@/modules/instance-ai/sandbox';
import type { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';
import type { AiService } from '@/services/ai.service';
import type { UrlService } from '@/services/url.service';

import { buildApp, restoreApp } from '@n8n/instance-ai';

import { AppSourceEditBuildService } from '../app-source-edit-build.service';
import type { App } from '../app.entity';
import type { AppVersion } from '../app-version.entity';
import type { AppVersionService } from '../app-version.service';
import type { AppsService } from '../apps.service';

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	buildApp: vi.fn(),
	restoreApp: vi.fn(),
}));

class TestableAppSourceEditBuildService extends AppSourceEditBuildService {
	constructor(
		appsService: AppsService,
		appVersionService: AppVersionService,
		urlService: UrlService,
		settingsService: InstanceAiSettingsService,
		aiService: AiService,
		globalConfig: GlobalConfig,
		logger: Logger,
		errorReporter: ErrorReporter,
		private readonly sandboxServiceMock: ReturnType<typeof mock<InstanceAiSandboxService>>,
	) {
		super(
			appsService,
			appVersionService,
			urlService,
			settingsService,
			aiService,
			globalConfig,
			logger,
			errorReporter,
		);
	}

	protected getSandboxService() {
		return this.sandboxServiceMock;
	}
}

const APP = { id: 'app-1', name: 'Greeter', namespace: 'greeter', activeVersionId: 'v-0' } as App;
const VERSION = { id: 'v-0', appId: 'app-1' } as AppVersion;
const USER = { id: 'user-1' } as User;

const ok = () => ({ exitCode: 0, stdout: '', stderr: '' });
const fail = () => ({ exitCode: 1, stdout: '', stderr: '' });

function createService() {
	const appsService = mock<AppsService>();
	appsService.getApp.mockResolvedValue(APP);

	const appVersionService = mock<AppVersionService>();
	appVersionService.findById.mockResolvedValue(VERSION);
	appVersionService.listSourceFiles.mockResolvedValue(['src/main.ts']);

	const executeCommand = vi.fn().mockResolvedValue(ok());
	const writeFile = vi.fn().mockResolvedValue(undefined);
	const workspace = { sandbox: { executeCommand }, filesystem: { writeFile } };
	const sandboxServiceMock = mock<InstanceAiSandboxService>();
	sandboxServiceMock.getOrCreateWorkspaceEntry.mockResolvedValue({ workspace } as never);

	const service = new TestableAppSourceEditBuildService(
		appsService,
		appVersionService,
		mock<UrlService>(),
		mock<InstanceAiSettingsService>(),
		mock<AiService>(),
		mock<GlobalConfig>(),
		mock<Logger>(),
		mock<ErrorReporter>(),
		sandboxServiceMock,
	);
	return { service, appsService, appVersionService, executeCommand, writeFile, sandboxServiceMock };
}

describe('AppSourceEditBuildService', () => {
	beforeEach(() => {
		vi.mocked(buildApp).mockReset();
		vi.mocked(restoreApp).mockReset();
	});

	it('refuses without touching the sandbox when the app has never been built', async () => {
		const { service, appsService, sandboxServiceMock } = createService();
		appsService.getApp.mockResolvedValue({ ...APP, activeVersionId: null } as App);

		const result = await service.saveFile('app-1', 'src/main.ts', 'export {};', USER);

		expect(result).toEqual({ error: true, message: expect.stringContaining('Build the app once') });
		expect(sandboxServiceMock.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
	});

	it('rejects a path that is not in the active version source, without touching the sandbox', async () => {
		const { service, sandboxServiceMock } = createService();

		const result = await service.saveFile('app-1', 'nope.ts', 'export {};', USER);

		expect(result).toEqual({ error: true, message: expect.stringContaining("'nope.ts'") });
		expect(sandboxServiceMock.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
	});

	it('reports an error when no sandbox is available', async () => {
		const { service, sandboxServiceMock } = createService();
		sandboxServiceMock.getOrCreateWorkspaceEntry.mockResolvedValue(undefined);

		const result = await service.saveFile('app-1', 'src/main.ts', 'export {};', USER);

		expect(result).toEqual({ error: true, message: expect.stringContaining('sandbox') });
	});

	it('skips restore when the app directory already has files, then writes and builds', async () => {
		const { service, executeCommand, writeFile } = createService();
		executeCommand.mockResolvedValue(ok());
		vi.mocked(buildApp).mockResolvedValue({
			appId: 'app-1',
			name: 'Greeter',
			namespace: 'greeter',
			projectId: 'proj-1',
			versionId: 'v-1',
			url: 'http://localhost:5678/apps/greeter/',
			warnings: [],
		});

		const result = await service.saveFile('app-1', 'src/main.ts', 'export const x = 1;', USER);

		expect(restoreApp).not.toHaveBeenCalled();
		expect(writeFile).toHaveBeenCalledWith(
			expect.stringContaining('apps/greeter/src/main.ts'),
			'export const x = 1;',
			undefined,
		);
		expect(result).toEqual({ versionId: 'v-1', url: 'http://localhost:5678/apps/greeter/' });
	});

	it('restores the source first when the app directory is empty', async () => {
		const { service, executeCommand } = createService();
		executeCommand.mockResolvedValue(fail());
		vi.mocked(restoreApp).mockResolvedValue({
			appId: 'app-1',
			name: 'Greeter',
			namespace: 'greeter',
			projectId: 'proj-1',
			versionId: 'v-0',
			workspacePath: '/ws/apps/greeter',
			installed: true,
			warnings: [],
		});
		vi.mocked(buildApp).mockResolvedValue({
			appId: 'app-1',
			name: 'Greeter',
			namespace: 'greeter',
			projectId: 'proj-1',
			versionId: 'v-1',
			url: 'http://localhost:5678/apps/greeter/',
			warnings: [],
		});

		const result = await service.saveFile('app-1', 'src/main.ts', 'export {};', USER);

		expect(restoreApp).toHaveBeenCalledWith(expect.anything(), {
			action: 'restore',
			appId: 'app-1',
		});
		expect(result).toEqual({ versionId: 'v-1', url: 'http://localhost:5678/apps/greeter/' });
	});

	it('surfaces a restore failure without attempting a write or a build', async () => {
		const { service, executeCommand, writeFile } = createService();
		executeCommand.mockResolvedValue(fail());
		vi.mocked(restoreApp).mockResolvedValue({
			denied: true,
			reason: 'App "Greeter" has no stored version to restore.',
		});

		const result = await service.saveFile('app-1', 'src/main.ts', 'export {};', USER);

		expect(result).toEqual({ error: true, message: expect.stringContaining('no stored version') });
		expect(writeFile).not.toHaveBeenCalled();
		expect(buildApp).not.toHaveBeenCalled();
	});

	it('surfaces a build failure with its log folded into the message', async () => {
		const { service } = createService();
		vi.mocked(buildApp).mockResolvedValue({
			error: true,
			stage: 'build',
			message: '`npm run build` exited with code 1.',
			log: 'Module not found',
		});

		const result = await service.saveFile('app-1', 'src/main.ts', 'not valid ts(', USER);

		expect(result).toEqual({
			error: true,
			message: expect.stringContaining('`npm run build` exited with code 1.'),
		});
		expect((result as { message: string }).message).toContain('Module not found');
	});
});
