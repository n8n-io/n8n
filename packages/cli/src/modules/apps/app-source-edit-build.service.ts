import { createScopedWorkspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	buildApp,
	restoreApp,
	type AppSandboxContext,
	type InstanceAiAppService,
} from '@n8n/instance-ai';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { appSandboxKey, InstanceAiSandboxService } from '@/modules/instance-ai/sandbox';
import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';
import { AiService } from '@/services/ai.service';
import { UrlService } from '@/services/url.service';

import { APP_SDK_TARBALL_FILENAME, getAppSdkTarball } from './app-sdk-tarball';
import { AppVersionService } from './app-version.service';
import { AppsService } from './apps.service';

export type FileSaveResult = { versionId: string; url: string } | { error: true; message: string };

/**
 * Saves one edited source file by writing it into the app's sandbox and
 * rebuilding — same mechanism `AppThemeBuildService` uses for
 * theme-overrides.css, generalized to any existing source file. The sandbox
 * is the one the app's threads and preview use, so a running dev server
 * picks the save up.
 *
 * Only overwrites a file already present in the active version's source;
 * creating new files is a later iteration (see the write-mode plan).
 */
@Service()
export class AppSourceEditBuildService {
	private sandboxService: InstanceAiSandboxService | undefined;

	constructor(
		private readonly appsService: AppsService,
		private readonly appVersionService: AppVersionService,
		private readonly urlService: UrlService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly aiService: AiService,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {}

	/** Protected so tests can override it with a mock sandbox rather than provisioning a real one. */
	protected getSandboxService(): InstanceAiSandboxService {
		this.sandboxService ??= new InstanceAiSandboxService({
			config: this.globalConfig.instanceAi,
			logger: this.logger,
			errorReporter: this.errorReporter,
			// A headless save has no live run or background task of its own; the
			// sandbox's own idle TTL is what reclaims the cache entry.
			runState: { getActiveRunId: () => undefined, hasSuspendedRun: () => false },
			backgroundTasks: { getRunningTasks: () => [] },
			settingsService: this.settingsService,
			aiService: this.aiService,
		});
		return this.sandboxService;
	}

	/** Thin, unscoped adapter: the controller already checked the caller's project scope. */
	private createAppServiceAdapter(): InstanceAiAppService {
		const { appsService, urlService } = this;
		const unsupported = (action: string) => () => {
			throw new UnexpectedError(`${action} is not supported by the file-save rebuild pipeline`);
		};
		return {
			create: unsupported('create'),
			publish: unsupported('publish'),
			async get(appId) {
				const app = await appsService.getApp(appId);
				return { id: app.id, name: app.name, namespace: app.namespace, projectId: app.projectId };
			},
			async getSourceTarball(appId) {
				return await appsService.getSourceTarball(appId);
			},
			async storeVersion(appId, files) {
				const [version, app] = await Promise.all([
					appsService.createVersion(appId, files.source, files.dist),
					appsService.getApp(appId),
				]);
				return {
					versionId: version.id,
					url: `${urlService.getInstanceBaseUrl()}/apps/${app.namespace}/`,
				};
			},
			setBindings() {
				throw new UnexpectedError('setBindings is not supported by the file-save rebuild pipeline');
			},
			previewBindings() {
				throw new UnexpectedError(
					'previewBindings is not supported by the file-save rebuild pipeline',
				);
			},
			async getBindings(appId) {
				const app = await appsService.getApp(appId);
				return { ...(await appsService.describeBindings(app)), stored: app.bindings };
			},
			async getSdkTarball() {
				return { filename: APP_SDK_TARBALL_FILENAME, data: await getAppSdkTarball() };
			},
		};
	}

	async saveFile(
		appId: string,
		path: string,
		content: string,
		user: User,
	): Promise<FileSaveResult> {
		const app = await this.appsService.getApp(appId);
		if (!app.activeVersionId) {
			return { error: true, message: 'Build the app once before editing its source.' };
		}

		const version = await this.appVersionService.findById(app.activeVersionId);
		if (!version) {
			return { error: true, message: 'Active version not found.' };
		}
		// The path came off a URL segment, decoded but otherwise untrusted; requiring
		// it to already be a known source file is what rules out traversal and
		// creating files outside the app's own source tree, not a separate check.
		const existingFiles = await this.appVersionService.listSourceFiles(version);
		if (!existingFiles.includes(path)) {
			return { error: true, message: `File not found: '${path}'` };
		}

		const entry = await this.getSandboxService().getOrCreateWorkspaceEntry(
			appSandboxKey(appId),
			user,
		);
		// `.bind`: sandbox.executeCommand reads `this.ensureRunning()` internally, so
		// hoisting the method off the instance without binding leaves `this` undefined.
		const executeCommand = entry?.workspace.sandbox?.executeCommand?.bind(entry.workspace.sandbox);
		if (!entry || !executeCommand || !entry.workspace.filesystem) {
			return { error: true, message: 'The sandbox is not available on this instance.' };
		}

		// Same headless-sandbox scoping `AppThemeBuildService` needs: relative
		// paths are only safe once the workspace is scoped to its own root.
		const root = await getWorkspaceRoot(entry.workspace);
		const workspace = createScopedWorkspace(entry.workspace, root);
		const filesystem = workspace.filesystem;
		if (!filesystem) {
			throw new UnexpectedError('Scoped workspace unexpectedly has no filesystem.');
		}
		const sandboxContext: AppSandboxContext = {
			appService: this.createAppServiceAdapter(),
			appWorkspace: workspace,
		};

		const appDirRelative = `apps/${app.namespace}`;
		const occupied = await executeCommand(
			`[ -d '${root}/${appDirRelative}' ] && [ -n "$(ls -A '${root}/${appDirRelative}')" ]`,
			[],
			{},
		);
		if (occupied.exitCode !== 0) {
			const restored = await restoreApp(sandboxContext, { action: 'restore', appId });
			if ('denied' in restored) return { error: true, message: restored.reason };
			if ('error' in restored) return { error: true, message: restored.message };
		}

		await filesystem.writeFile(`${appDirRelative}/${path}`, content);

		const built = await buildApp(sandboxContext, { action: 'build', appId });
		if ('denied' in built) return { error: true, message: built.reason };
		if ('error' in built) {
			// The log carries the actual compiler/build diagnostics — far more
			// actionable than the generic message for a failure in user-edited code.
			const message = built.log ? `${built.message}\n\n${built.log}` : built.message;
			return { error: true, message };
		}
		return { versionId: built.versionId, url: built.url };
	}
}
