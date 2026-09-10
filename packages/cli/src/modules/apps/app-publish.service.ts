import { createScopedWorkspace, type Workspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	buildApp,
	type AppPublishResult,
	type AppSandboxContext,
	type InstanceAiAppService,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { AppSourceSnapshotService } from '@/modules/instance-ai/app-preview/app-source-snapshot.service';
import { buildRestoreScript } from '@/modules/instance-ai/app-preview/app-preview.service';
import { InstanceAiSandboxService } from '@/modules/instance-ai/sandbox';
import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';
import { AiService } from '@/services/ai.service';
import { UrlService } from '@/services/url.service';

import { APP_SDK_TARBALL_FILENAME, getAppSdkTarball } from './app-sdk-tarball';
import { AppsService } from './apps.service';

/** Deterministic per-app sandbox id: repeated publishes of the same app reuse a warm sandbox. */
const sandboxIdForApp = (appId: string) => `app-publish-${appId}`;
/** Same staging directory the `apps` tool uses; the scoped filesystem only writes inside the root. */
const STAGING_DIR = '.app-builds';
const RESTORE_TIMEOUT_MS = 600_000;
const LOG_TAIL_BYTES = 4096;

/**
 * Empties the app directory except `node_modules` (kept so the install after
 * the unpack is incremental) and prepares the staging directory. Scoped to
 * `apps/<namespace>` by construction; nothing outside it is touched.
 */
export function buildResetAppDirScript(input: { root: string; namespace: string }): string {
	const appDir = `${input.root}/apps/${input.namespace}`;
	return [
		`mkdir -p '${appDir}' '${input.root}/${STAGING_DIR}'`,
		`find '${appDir}' -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +`,
	].join(' && ');
}

/**
 * Publishes an app: stores the app sandbox's current draft as a snapshot,
 * unpacks the newest source into n8n's own per-app build sandbox and builds it
 * there, so a publish never competes with the dev server for the app
 * sandbox's memory. The new version becomes the served one.
 */
@Service()
export class AppPublishService {
	private sandboxService: InstanceAiSandboxService | undefined;

	constructor(
		private readonly appsService: AppsService,
		private readonly urlService: UrlService,
		private readonly snapshotService: AppSourceSnapshotService,
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
			// A headless build has no live run or background task of its own;
			// the sandbox's own idle TTL is what reclaims the cache entry.
			runState: { getActiveRunId: () => undefined, hasSuspendedRun: () => false },
			backgroundTasks: { getRunningTasks: () => [] },
			settingsService: this.settingsService,
			aiService: this.aiService,
		});
		return this.sandboxService;
	}

	/** Thin, unscoped adapter: the caller already checked the user's `app:update` on the project. */
	private createAppServiceAdapter(): InstanceAiAppService {
		const { appsService, urlService } = this;
		const unsupported = (action: string) => () => {
			throw new UnexpectedError(`${action} is not supported by the publish pipeline`);
		};
		return {
			create: unsupported('create'),
			publish: unsupported('publish'),
			setBindings: unsupported('setBindings'),
			previewBindings: unsupported('previewBindings'),
			async getBindings(appId) {
				const app = await appsService.getApp(appId);
				return { ...(await appsService.describeBindings(app)), stored: app.bindings };
			},
			async getSdkTarball() {
				return { filename: APP_SDK_TARBALL_FILENAME, data: await getAppSdkTarball() };
			},
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
		};
	}

	/** `draft`: the app's live sandbox workspace, whose edits are stored before the build reads the newest source. */
	async publish(
		appId: string,
		user: User,
		options: { draft?: Workspace } = {},
	): Promise<AppPublishResult> {
		const app = await this.appsService.getApp(appId);

		if (options.draft) {
			try {
				await this.snapshotService.snapshotAfterRun(appId, user, options.draft);
			} catch (error) {
				return { error: true, stage: 'snapshot', message: getErrorMessage(error) };
			}
		}

		const source = await this.appsService.getSourceTarball(appId);
		if (!source) {
			return {
				error: true,
				stage: 'restore',
				message: `App "${app.name}" has no stored source to publish.`,
			};
		}

		const entry = await this.getSandboxService().getOrCreateWorkspaceEntry(
			sandboxIdForApp(appId),
			user,
		);
		// `.bind`: sandbox.executeCommand reads `this.ensureRunning()` internally, so
		// hoisting the method off the instance without binding leaves `this` undefined.
		const executeCommand = entry?.workspace.sandbox?.executeCommand?.bind(entry.workspace.sandbox);
		if (!entry || !executeCommand || !entry.workspace.filesystem) {
			return {
				error: true,
				stage: 'sandbox',
				message: 'The sandbox is not available on this instance.',
			};
		}

		// `buildApp` passes root-relative paths to `workspace.filesystem`, expecting
		// it to be root-scoped the way the chat flow's sandbox is; this headless
		// sandbox skips that step by default.
		const root = await getWorkspaceRoot(entry.workspace);
		const workspace = createScopedWorkspace(entry.workspace, root);
		if (!workspace.filesystem) {
			throw new UnexpectedError('Scoped workspace unexpectedly has no filesystem.');
		}

		const tarball = `${STAGING_DIR}/${app.namespace}-${Date.now()}-publish.tgz`;
		const reset = await executeCommand(
			buildResetAppDirScript({ root, namespace: app.namespace }),
			[],
			{},
		);
		if (reset.exitCode !== 0) {
			return {
				error: true,
				stage: 'restore',
				message: 'Could not prepare the app directory in the build sandbox.',
				log: tailLog(reset),
			};
		}
		await workspace.filesystem.writeFile(tarball, source.data);
		const restored = await executeCommand(
			buildRestoreScript({
				appDir: `${root}/apps/${app.namespace}`,
				tarballPath: `${root}/${tarball}`,
			}),
			[],
			{ env: { CI: 'true' }, timeout: RESTORE_TIMEOUT_MS },
		);
		if (restored.exitCode !== 0) {
			return {
				error: true,
				stage: 'restore',
				message: 'Could not unpack the source and install its dependencies in the build sandbox.',
				log: tailLog(restored),
			};
		}

		const sandboxContext: AppSandboxContext = {
			appService: this.createAppServiceAdapter(),
			appWorkspace: workspace,
		};
		const built = await buildApp(sandboxContext, { action: 'build', appId });
		if ('denied' in built) return { error: true, stage: 'build', message: built.reason };
		if ('error' in built) return built;
		return { versionId: built.versionId, url: built.url };
	}
}

function tailLog(result: { stdout: string; stderr: string }): string {
	const log = result.stderr ? `${result.stdout}\n${result.stderr}` : result.stdout;
	return log.slice(-LOG_TAIL_BYTES);
}
