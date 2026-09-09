import { createScopedWorkspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { AppTheme } from '@n8n/api-types';
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

import { InstanceAiSandboxService } from '@/modules/instance-ai/sandbox';
import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';
import { AiService } from '@/services/ai.service';
import { UrlService } from '@/services/url.service';

import { APP_SDK_TARBALL_FILENAME, getAppSdkTarball } from './app-sdk-tarball';
import { AppsService } from './apps.service';

/** Deterministic per-app sandbox id: repeated theme saves for the same app reuse a warm sandbox. */
const sandboxIdForApp = (appId: string) => `app-theme-${appId}`;

type ThemeBuildResult =
	| { versionId: string; url: string }
	| { error: true; message: string; log?: string };

function themeOverridesCss(vars: Record<string, string>): string {
	const entries = Object.entries(vars);
	if (entries.length === 0) return '';
	const declarations = entries.map(([key, value]) => `\t${key}: ${value};`).join('\n');
	return `:root {\n${declarations}\n}\n`;
}

/**
 * Reads back whatever CSS custom properties are already in theme-overrides.css —
 * Instance AI can edit that file directly with its own variables, and a Theme-tab
 * save must not erase them. Simple regex, not a CSS parser: this file is only ever
 * hand-edited (by the agent) or written by `themeOverridesCss` above, both of which
 * stick to flat `--name: value;` declarations.
 */
function parseThemeOverridesCss(content: string): Record<string, string> {
	const vars: Record<string, string> = {};
	for (const match of content.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
		vars[match[1]] = match[2].trim();
	}
	return vars;
}

function themeModeTs(theme: AppTheme): string {
	return `export const THEME_MODE: 'light' | 'dark' | 'system' = '${theme.mode}';\n`;
}

/**
 * Applies a saved app theme by writing it into the app's own source and
 * rebuilding it — the served app is a plain static file stream with no
 * per-request templating, so a theme change only takes effect through a real
 * rebuild. Runs outside any Instance AI conversation: it acquires its own
 * one-shot sandbox, keyed by app id rather than a thread id.
 */
@Service()
export class AppThemeBuildService {
	private sandboxService: InstanceAiSandboxService | undefined;

	constructor(
		private readonly appsService: AppsService,
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
			// A headless theme rebuild has no live run or background task of its own;
			// the sandbox's own idle TTL is what reclaims the cache entry.
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
		return {
			create() {
				throw new UnexpectedError('create is not supported by the theme rebuild pipeline');
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
			setBindings() {
				throw new UnexpectedError('setBindings is not supported by the theme rebuild pipeline');
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

	async applyTheme(appId: string, theme: AppTheme, user: User): Promise<ThemeBuildResult> {
		const app = await this.appsService.getApp(appId);
		if (!app.activeVersionId) {
			return { error: true, message: 'Build the app once before applying a theme.' };
		}

		const entry = await this.getSandboxService().getOrCreateWorkspaceEntry(
			sandboxIdForApp(appId),
			user,
		);
		// `.bind`: sandbox.executeCommand reads `this.ensureRunning()` internally, so
		// hoisting the method off the instance without binding leaves `this` undefined.
		const executeCommand = entry?.workspace.sandbox?.executeCommand?.bind(entry.workspace.sandbox);
		if (!entry || !executeCommand || !entry.workspace.filesystem) {
			return { error: true, message: 'The sandbox is not available on this instance.' };
		}

		// `apps.tool.ts`'s handlers pass relative paths (e.g. `.app-builds/...`) to
		// `workspace.filesystem`, expecting it to be root-scoped the way the normal
		// chat flow's sandbox always is (see `scopeWorkspaceForAgent` in
		// instance-ai.service.ts). This headless sandbox skips that step by default,
		// so relative paths would otherwise resolve against the sandbox's real `/`.
		const root = await getWorkspaceRoot(entry.workspace);
		const workspace = createScopedWorkspace(entry.workspace, root);
		const filesystem = workspace.filesystem;
		if (!filesystem) {
			// Unreachable in practice: createScopedWorkspace derives this from the same
			// entry.workspace.filesystem already confirmed truthy above. Asserted, not
			// surfaced as the same user-facing "sandbox not available" outcome, so this
			// branch doesn't read as a second copy of the real check.
			throw new UnexpectedError('Scoped workspace unexpectedly has no filesystem.');
		}
		const sandboxContext: AppSandboxContext = {
			appService: this.createAppServiceAdapter(),
			workspace,
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

		const overridesPath = `${appDirRelative}/src/theme-overrides.css`;
		const existing = await filesystem.readFile(overridesPath).catch(() => '');
		const existingVars = parseThemeOverridesCss(
			Buffer.isBuffer(existing) ? existing.toString('utf8') : (existing ?? ''),
		);
		const mergedVars = { ...existingVars, ...theme.vars };

		await Promise.all([
			filesystem.writeFile(overridesPath, themeOverridesCss(mergedVars)),
			filesystem.writeFile(`${appDirRelative}/src/theme-mode.ts`, themeModeTs(theme)),
		]);

		const built = await buildApp(sandboxContext, { action: 'build', appId });
		if ('denied' in built) return { error: true, message: built.reason };
		if ('error' in built) return { error: true, message: built.message, log: built.log };
		return { versionId: built.versionId, url: built.url };
	}
}
