import type { AppTheme } from '@n8n/api-types';
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

import type { App } from '../app.entity';
import { AppThemeBuildService } from '../app-theme-build.service';
import type { AppsService } from '../apps.service';

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	buildApp: vi.fn(),
	restoreApp: vi.fn(),
}));

class TestableAppThemeBuildService extends AppThemeBuildService {
	constructor(
		appsService: AppsService,
		urlService: UrlService,
		settingsService: InstanceAiSettingsService,
		aiService: AiService,
		globalConfig: GlobalConfig,
		logger: Logger,
		errorReporter: ErrorReporter,
		private readonly sandboxServiceMock: ReturnType<typeof mock<InstanceAiSandboxService>>,
	) {
		super(appsService, urlService, settingsService, aiService, globalConfig, logger, errorReporter);
	}

	protected getSandboxService() {
		return this.sandboxServiceMock;
	}
}

const APP = {
	id: 'app-1',
	name: 'Greeter',
	namespace: 'greeter',
	activeVersionId: 'v-0',
	bindings: [{ key: 'greet', workflowId: 'wf-1' }],
} as App;
const USER = { id: 'user-1' } as User;
const THEME: AppTheme = {
	mode: 'dark',
	vars: { '--primary': 'oklch(0.6 0.2 280)', '--radius': '1rem' },
};

const ok = () => ({ exitCode: 0, stdout: '', stderr: '' });
const fail = () => ({ exitCode: 1, stdout: '', stderr: '' });

function createService() {
	const appsService = mock<AppsService>();
	appsService.getApp.mockResolvedValue(APP);

	const executeCommand = vi.fn().mockResolvedValue(ok());
	const writeFile = vi.fn().mockResolvedValue(undefined);
	// No existing theme-overrides.css by default — most tests don't care what's already there.
	const readFile = vi.fn().mockResolvedValue('');
	const workspace = { sandbox: { executeCommand }, filesystem: { writeFile, readFile } };
	const sandboxServiceMock = mock<InstanceAiSandboxService>();
	sandboxServiceMock.getOrCreateWorkspaceEntry.mockResolvedValue({ workspace } as never);

	const service = new TestableAppThemeBuildService(
		appsService,
		mock<UrlService>(),
		mock<InstanceAiSettingsService>(),
		mock<AiService>(),
		mock<GlobalConfig>(),
		mock<Logger>(),
		mock<ErrorReporter>(),
		sandboxServiceMock,
	);
	return { service, appsService, executeCommand, writeFile, readFile, sandboxServiceMock };
}

describe('AppThemeBuildService', () => {
	beforeEach(() => {
		vi.mocked(buildApp).mockReset();
		vi.mocked(restoreApp).mockReset();
	});

	it('refuses without touching the sandbox when the app has never been built', async () => {
		const { service, appsService, sandboxServiceMock } = createService();
		appsService.getApp.mockResolvedValue({ ...APP, activeVersionId: null } as App);

		const result = await service.applyTheme('app-1', THEME, USER);

		expect(result).toEqual({ error: true, message: expect.stringContaining('Build the app once') });
		expect(sandboxServiceMock.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
	});

	it('reports an error when no sandbox is available', async () => {
		const { service, sandboxServiceMock } = createService();
		sandboxServiceMock.getOrCreateWorkspaceEntry.mockResolvedValue(undefined);

		const result = await service.applyTheme('app-1', THEME, USER);

		expect(result).toEqual({ error: true, message: expect.stringContaining('sandbox') });
	});

	it('skips restore when the app directory already has files, then writes the theme and builds', async () => {
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

		const result = await service.applyTheme('app-1', THEME, USER);

		expect(restoreApp).not.toHaveBeenCalled();
		expect(writeFile).toHaveBeenCalledWith(
			expect.stringContaining('apps/greeter/src/theme-overrides.css'),
			expect.stringContaining('--primary: oklch(0.6 0.2 280);'),
			undefined,
		);
		expect(writeFile).toHaveBeenCalledWith(
			expect.stringContaining('apps/greeter/src/theme-mode.ts'),
			expect.stringContaining("'dark'"),
			undefined,
		);
		expect(result).toEqual({ versionId: 'v-1', url: 'http://localhost:5678/apps/greeter/' });
	});

	it('merges onto whatever is already in theme-overrides.css instead of replacing it', async () => {
		const { service, readFile, writeFile } = createService();
		// Instance AI set --chart-1 directly; the payload only carries the Theme tab's own keys.
		readFile.mockResolvedValue(':root {\n\t--chart-1: #ff00ff;\n\t--primary: #000000;\n}\n');
		vi.mocked(buildApp).mockResolvedValue({
			appId: 'app-1',
			name: 'Greeter',
			namespace: 'greeter',
			projectId: 'proj-1',
			versionId: 'v-1',
			url: 'http://localhost:5678/apps/greeter/',
			warnings: [],
		});

		await service.applyTheme('app-1', THEME, USER);

		const written = writeFile.mock.calls.find((call) =>
			(call[0] as string).endsWith('apps/greeter/src/theme-overrides.css'),
		)?.[1] as string;
		expect(written).toContain('--chart-1: #ff00ff;');
		expect(written).toContain('--primary: oklch(0.6 0.2 280);');
	});

	it('restores the source first when the app directory is empty', async () => {
		const { service, appsService, executeCommand } = createService();
		executeCommand.mockResolvedValue(fail());
		appsService.describeBindings.mockResolvedValue({ bindings: [], warnings: ['draft only'] });
		vi.mocked(restoreApp).mockResolvedValue({
			appId: 'app-1',
			name: 'Greeter',
			namespace: 'greeter',
			projectId: 'proj-1',
			versionId: 'v-0',
			workspacePath: '/ws/apps/greeter',
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

		const result = await service.applyTheme('app-1', THEME, USER);

		expect(restoreApp).toHaveBeenCalledWith(expect.anything(), {
			action: 'restore',
			appId: 'app-1',
		});
		expect(result).toEqual({ versionId: 'v-1', url: 'http://localhost:5678/apps/greeter/' });

		// Real restore rewrites the bindings types through the adapter it is handed.
		const adapter = vi.mocked(restoreApp).mock.calls[0][0].appService;
		await expect(adapter?.getBindings('app-1')).resolves.toEqual({
			bindings: [],
			warnings: ['draft only'],
			stored: APP.bindings,
		});
		expect(appsService.describeBindings).toHaveBeenCalledWith(APP);
	});

	it('surfaces a restore failure without attempting a build', async () => {
		const { service, executeCommand } = createService();
		executeCommand.mockResolvedValue(fail());
		vi.mocked(restoreApp).mockResolvedValue({
			denied: true,
			reason: 'App "Greeter" has no stored version to restore.',
		});

		const result = await service.applyTheme('app-1', THEME, USER);

		expect(result).toEqual({ error: true, message: expect.stringContaining('no stored version') });
		expect(buildApp).not.toHaveBeenCalled();
	});

	it('surfaces a build failure with its log', async () => {
		const { service } = createService();
		vi.mocked(buildApp).mockResolvedValue({
			error: true,
			stage: 'build',
			message: '`npm run build` exited with code 1.',
			log: 'Module not found',
		});

		const result = await service.applyTheme('app-1', THEME, USER);

		expect(result).toEqual({
			error: true,
			message: '`npm run build` exited with code 1.',
			log: 'Module not found',
		});
	});
});
