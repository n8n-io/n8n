/**
 * OmiGroup n8n External Hooks - Main Entry Point
 *
 * This file is loaded by n8n via the EXTERNAL_HOOK_FILES environment variable.
 * It is the ONLY bridge between n8n core and OmiGroup extensions.
 *
 * n8n core is NOT modified in any way. All extensions are loaded and
 * executed through this hook file.
 *
 * Environment:
 *   EXTERNAL_HOOK_FILES=/path/to/omi-n8n-extensions/dist/hooks/omi-hooks.js
 *   N8N_CUSTOM_EXTENSIONS=/path/to/omi-n8n-extensions/dist/nodes
 *
 * Hook context:
 *   `this.dbCollections` provides access to n8n's DB repositories:
 *     - User (UserRepository)
 *     - Settings (SettingsRepository)
 *     - Credentials (CredentialsRepository)
 *     - Workflow (WorkflowRepository)
 *
 * Initialization order (verified from n8n source):
 *   1. Server.configure() runs → frontend.settings hook fires
 *   2. cookieParser() is applied
 *   3. Controllers are activated
 *   4. n8n.ready hook fires ← our main init point (cookies available!)
 */

import express from 'express';
import { loadConfig } from '../config';
import { initOmiDb, closeOmiDb } from '../database';
import { mountGoogleSsoRoutes } from '../auth/google-oidc';
import { initUserSync } from '../auth/google-oidc/user-sync';
import { initAuthGuard } from '../middleware/auth-guard';
import { mountDomainWhitelistRoutes } from '../admin/domain-whitelist';
import { mountDepartmentRoutes } from '../departments';
import { mountUsageStatsRoutes, recordExecution, cleanupOldStats } from '../admin/usage-stats';
import { mountUserManagementRoutes, initUserManagement } from '../admin/user-management';
import { mountTemplateRoutes } from '../templates';
import type { HookDbCollections } from '../utils/n8n-db';

// Cleanup timer reference for graceful shutdown
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Export hooks in the format n8n expects:
 *
 * {
 *   [resource]: {
 *     [operation]: [async function(...args) { ... }]
 *   }
 * }
 */
module.exports = {
	/**
	 * Server lifecycle hooks
	 */
	n8n: {
		/**
		 * Called when n8n is fully started and the Express app is ready.
		 * This is our main initialization point.
		 *
		 * At this point:
		 * - cookieParser middleware is already applied
		 * - bodyParser middleware is already applied
		 * - All n8n controllers are activated
		 * - server.app is the Express application
		 *
		 * @param server - The AbstractServer instance (has .app property = Express app)
		 * @param _config - n8n convict config object
		 */
		ready: [
			async function (
				this: { dbCollections: HookDbCollections },
				server: { app: express.Express; restEndpoint: string },
			) {
				try {
					console.log('[OmiGroup] Initializing extensions...');

					// 1. Load configuration (reads env vars, detects cookie config)
					const config = loadConfig();

					// 2. Initialize OmiGroup's separate database
					initOmiDb();

					// 3. Initialize services that need n8n's DB access
					// The User repository is used for:
					// - SSO user creation (user-sync)
					// - Auth middleware (auth-guard) to resolve JWT→user
					// - User management admin APIs
					initUserSync(this.dbCollections.User);
					initAuthGuard(this.dbCollections.User);
					initUserManagement(this.dbCollections.User);

					// 4. Add JSON body parser for /omi routes
					// n8n applies bodyParser before n8n.ready, but only for
					// certain content types. We ensure JSON parsing for our routes.
					server.app.use('/omi', express.json({ limit: '5mb' }));

					// 5. Mount all OmiGroup routes
					mountGoogleSsoRoutes(server.app);
					mountDomainWhitelistRoutes(server.app);
					mountDepartmentRoutes(server.app);
					mountUsageStatsRoutes(server.app);
					mountUserManagementRoutes(server.app);
					mountTemplateRoutes(server.app);

					// Health check endpoint
					server.app.get('/omi/health', (_req, res) => {
						res.json({
							status: 'ok',
							version: '0.1.0',
							timestamp: new Date().toISOString(),
							features: {
								googleSso: true,
								templateHub: config.templates.enabled,
								usageStats: config.stats.enabled,
								domainWhitelist: config.domainWhitelist.enforced,
							},
						});
					});

					// 6. Global error handler — must be registered AFTER all routes
					// and must have exactly 4 parameters for Express to recognize it
					// as an error handler. Registered without path prefix so it can
					// catch errors from all /omi/* routes mounted above.
					server.app.use((
						err: Error,
						req: express.Request,
						res: express.Response,
						next: express.NextFunction,
					) => {
						// Only handle errors for /omi routes, pass others to n8n
						if (!req.path.startsWith('/omi')) {
							next(err);
							return;
						}
						console.error('[OmiGroup] Unhandled route error:', err);
						if (!res.headersSent) {
							res.status(500).json({ error: 'Internal server error' });
						}
					});

					// 7. Setup periodic cleanup
					if (config.stats.enabled) {
						// Run cleanup daily
						cleanupInterval = setInterval(
							() => cleanupOldStats(config.stats.retentionDays),
							24 * 60 * 60 * 1000,
						);
						// Run initial cleanup on startup (deferred)
						setTimeout(() => cleanupOldStats(config.stats.retentionDays), 30_000);
					}

					console.log('[OmiGroup] Extensions initialized successfully');
					console.log('[OmiGroup] Routes available at /omi/*');
					console.log('[OmiGroup] Google SSO: /omi/auth/google/login');
					console.log('[OmiGroup] Admin API: /omi/admin/*');
					console.log('[OmiGroup] Template Hub: /omi/templates');
				} catch (err) {
					console.error('[OmiGroup] Failed to initialize extensions:', err);
				}
			},
		],

		/**
		 * Called when n8n is shutting down.
		 * Clean up resources to avoid leaks.
		 */
		stop: [
			async function () {
				try {
					console.log('[OmiGroup] Shutting down extensions...');

					// Clear cleanup timer
					if (cleanupInterval) {
						clearInterval(cleanupInterval);
						cleanupInterval = null;
					}

					// Close our separate SQLite database
					closeOmiDb();

					console.log('[OmiGroup] Extensions shut down cleanly');
				} catch (err) {
					console.error('[OmiGroup] Error during shutdown:', err);
				}
			},
		],
	},

	/**
	 * Frontend settings hook - inject OmiGroup config into frontend settings.
	 *
	 * NOTE: This hook fires BEFORE n8n.ready, during Server.configure().
	 * Config may not be loaded yet on the very first call.
	 * We use a try/catch with safe defaults.
	 */
	frontend: {
		settings: [
			async function (frontendSettings: Record<string, unknown>) {
				try {
					// loadConfig() is safe to call multiple times (returns cached)
					// On first call during startup, env vars are already available
					const config = loadConfig();

					// Inject OmiGroup settings into n8nMetadata for frontend access
					// n8n's FrontendSettings has n8nMetadata with [key: string] index
					const metadata = (frontendSettings.n8nMetadata ?? {}) as Record<string, unknown>;
					metadata.omiGroupEnabled = 'true';
					metadata.omiGoogleSsoUrl = '/omi/auth/google/login';
					metadata.omiTemplateHubEnabled = config.templates.enabled ? 'true' : 'false';
					frontendSettings.n8nMetadata = metadata;
				} catch {
					// Config may not be loadable yet (missing env vars during startup)
					// This is non-fatal — frontend will work without OmiGroup metadata
				}
			},
		],
	},

	/**
	 * Workflow execution hooks - collect usage stats.
	 *
	 * Hook signature from n8n's external-hooks.ts:
	 *   'workflow.postExecute': [IRun | undefined, IWorkflowBase, string]
	 */
	workflow: {
		postExecute: [
			async function (
				this: { dbCollections: HookDbCollections },
				fullRunData: {
					data?: { resultData?: { runData?: Record<string, unknown[]> } };
					status?: string;
					startedAt?: Date;
					stoppedAt?: Date;
				} | undefined,
				workflowData: {
					id?: string;
					name?: string;
					settings?: { callerIds?: string };
				},
				executionId: string,
			) {
				try {
					const config = loadConfig();
					if (!config.stats.enabled) return;

					const status = fullRunData?.status ?? 'unknown';
					const startedAt = fullRunData?.startedAt;
					const stoppedAt = fullRunData?.stoppedAt;
					const durationMs =
						startedAt && stoppedAt
							? new Date(stoppedAt).getTime() - new Date(startedAt).getTime()
							: undefined;

					const runData = fullRunData?.data?.resultData?.runData;
					const nodeCount = runData ? Object.keys(runData).length : undefined;

					// n8n's postExecute hook does not reliably provide user info.
					// callerIds might be set for sub-workflow executions.
					// For manual runs, user info is not available in hook context.
					// TODO: Investigate using n8n's execution metadata or events
					// to link executions to users more reliably.
					const userId = workflowData?.settings?.callerIds ?? undefined;

					let errorMessage: string | undefined;
					if (status === 'error' || status === 'crashed') {
						if (runData) {
							for (const nodeRuns of Object.values(runData)) {
								for (const run of nodeRuns as Array<{ error?: { message?: string } }>) {
									if (run?.error?.message) {
										errorMessage = run.error.message.substring(0, 500);
										break;
									}
								}
								if (errorMessage) break;
							}
						}
					}

					recordExecution({
						userId,
						workflowId: workflowData?.id ?? 'unknown',
						workflowName: workflowData?.name,
						executionId,
						status,
						durationMs,
						nodeCount,
						errorMessage,
					});
				} catch (err) {
					// Non-fatal: stats collection should never break workflow execution
					console.error('[OmiGroup] Error in postExecute hook:', err);
				}
			},
		],
	},
};
