import { inDevelopment, inProduction } from '@n8n/backend-common';
import { SecurityConfig, WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { APIRequest, AuthenticatedRequest } from '@n8n/db';

import { Container, Service } from '@n8n/di';

export const getCspReportOnlyDirectives = (nonce: string) =>
	`script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'; object-src 'none'; base-uri 'none';`;

export const buildCspMiddleware = (
	cspDirectives: { [key: string]: Iterable<string> } | undefined,
	cspReportOnly: boolean,
	nonce: string,
) => {
	const buildHeaderFromDirectives = (directives: { [key: string]: Array<string> }) =>
		Object.entries(directives)
			.map(([k, v]) => `${k} ${v.join(' ')}`)
			.join('; ');

	// If no custom directives provided, return the predefined header string.
	if (isEmpty(cspDirectives)) {
		const header = getCspReportOnlyDirectives(nonce);
		const headerName = cspReportOnly
			? 'Content-Security-Policy-Report-Only'
			: 'Content-Security-Policy';
		return (req: any, res: any, next: () => void) => {
			res.setHeader(headerName, header);
			next();
		};
	}

	const mergedDirectives: { [key: string]: Array<string> } = {};
	Object.entries(cspDirectives).forEach(([k, v]) => {
		mergedDirectives[k] = Array.isArray(v) ? [...v] : Array.from(v as Iterable<string>);
	});

	const scriptKey = 'script-src';
	const nonceToken = `'nonce-${nonce}'`;
	// If user provided `script-src`, respect it completely (allow full overwrite).
	// Only inject a nonce when the user did not specify `script-src`.
	if (!mergedDirectives[scriptKey]) {
		mergedDirectives[scriptKey] = [nonceToken, "'strict-dynamic'", "'unsafe-eval'"];
	}

	const header = buildHeaderFromDirectives(mergedDirectives);
	const headerName = cspReportOnly
		? 'Content-Security-Policy-Report-Only'
		: 'Content-Security-Policy';
	return (req: any, res: any, next: () => void) => {
		res.setHeader(headerName, header);
		next();
	};
};

import cookieParser from 'cookie-parser';
import express from 'express';
import { access as fsAccess, readFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import helmet from 'helmet';
import isEmpty from 'lodash/isEmpty';
import { InstanceSettings, installGlobalProxyAgent } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { resolve } from 'path';

import { AbstractServer } from '@/abstract-server';
import { AuthService } from '@/auth/auth.service';
import { CLI_DIR, EDITOR_UI_DIST_DIR, inE2ETests } from '@/constants';
import { ControllerRegistry } from '@/controller.registry';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import type { ICredentialsOverwrite } from '@/interfaces';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { handleMfaDisable, isMfaFeatureEnabled } from '@/mfa/helpers';
import { PostHogClient } from '@/posthog';
import { isApiEnabled, loadPublicApiVersions } from '@/public-api';
import { Push } from '@/push';
import * as ResponseHelper from '@/response-helper';
import type { FrontendService } from '@/services/frontend.service';

import '@/controllers/active-workflows.controller';
import '@/controllers/annotation-tags.controller.ee';
import '@/controllers/auth.controller';
import '@/controllers/binary-data.controller';
import '@/controllers/ai.controller';
import '@/controllers/dynamic-node-parameters.controller';
import '@/controllers/dynamic-templates.controller';
import '@/controllers/invitation.controller';
import '@/controllers/me.controller';
import '@/controllers/node-types.controller';
import '@/controllers/oauth/oauth1-credential.controller';
import '@/controllers/oauth/oauth2-credential.controller';
import '@/controllers/orchestration.controller';
import '@/controllers/owner.controller';
import '@/controllers/password-reset.controller';
import '@/controllers/project.controller';
import '@/controllers/role.controller';
import '@/controllers/tags.controller';
import '@/controllers/translation.controller';
import '@/controllers/folder.controller';
import '@/controllers/users.controller';
import '@/controllers/user-settings.controller';
import '@/controllers/workflow-statistics.controller';
import '@/controllers/api-keys.controller';
import '@/controllers/security-settings.controller';
import '@/credentials/credentials.controller';
import '@/events/events.controller';
import '@/executions/executions.controller';
import '@/node-execution/ephemeral-node-executor';
import '@/license/license.controller';
import '@/evaluation.ee/test-runs.controller.ee';
import '@/evaluation.ee/evaluation-config.controller';
import '@/workflows/workflow-history/workflow-history.controller';
import '@/workflows/workflows.controller';
import '@/modules/workflow-index/workflow-dependency.controller';
import '@/webhooks/webhooks.controller';

import { ChatServer } from './chat/chat-server';
import { MfaService } from './mfa/mfa.service';
import { PubSubRegistry } from './scaling/pubsub/pubsub.registry';
import { ApiKeyAuthStrategy } from './services/api-key-auth.strategy';
import { AuthStrategyRegistry } from './services/auth-strategy.registry';

@Service()
export class Server extends AbstractServer {
	private endpointPresetCredentials: string;

	private presetCredentialsLoaded: boolean;

	private frontendService?: FrontendService;

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly postHogClient: PostHogClient,
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
	) {
		super();

		this.testWebhooksEnabled = true;
		this.webhooksEnabled = !this.globalConfig.endpoints.disableProductionWebhooksOnMainProcess;
	}

	async start() {
		if (!this.globalConfig.endpoints.disableUi) {
			const { FrontendService } = await import('@/services/frontend.service');
			this.frontendService = Container.get(FrontendService);
			await import('@/controllers/module-settings.controller');
			await import('@/controllers/third-party-licenses.controller');
		}

		this.presetCredentialsLoaded = false;

		this.endpointPresetCredentials = this.globalConfig.credentials.overwrite.endpoint;

		await super.start();
		this.logger.debug(`Server ID: ${this.instanceSettings.hostId}`);

		if (inDevelopment && process.env.N8N_DEV_RELOAD === 'true') {
			void this.loadNodesAndCredentials.setupHotReload();
		}

		this.markAsReady();

		this.eventService.emit('server-started');
	}

	private async registerAdditionalControllers() {
		if (!inProduction && this.instanceSettings.isMultiMain) {
			await import('@/controllers/debug.controller');
		}

		if (inE2ETests) {
			await import('@/controllers/e2e.controller');
		}

		if (isMfaFeatureEnabled()) {
			await Container.get(MfaService).init();
			await import('@/controllers/mfa.controller');
		}

		if (!this.globalConfig.endpoints.disableUi) {
			await import('@/controllers/cta.controller');
		}

		if (!this.globalConfig.tags.disabled) {
			await import('@/controllers/tags.controller');
		}

		if (this.globalConfig.diagnostics.enabled) {
			await import('@/controllers/telemetry.controller');
			await import('@/controllers/posthog.controller');
		}

		// ----------------------------------------
		// Variables
		// ----------------------------------------

		try {
			await import('@/environments.ee/variables/variables.controller.ee');
		} catch (error) {
			this.logger.warn(`Variables initialization failed: ${(error as Error).message}`);
		}
	}

	async configure(): Promise<void> {
		if (this.globalConfig.endpoints.metrics.enable) {
			const { PrometheusMetricsService } = await import('@/metrics/prometheus-metrics.service');
			await Container.get(PrometheusMetricsService).init(this.app);
		}

		const { frontendService } = this;
		if (frontendService) {
			await this.externalHooks.run('frontend.settings', [await frontendService.getSettings()]);
		}

		await this.postHogClient.init();

		const publicApiEndpoint = this.globalConfig.publicApi.path;

		// Register auth strategies in priority order. The registry evaluates them
		// sequentially — the first strategy that returns a non-null result wins.
		// API key auth is registered first so existing behavior is preserved.
		// Additional strategies (e.g. scoped JWT from the token-exchange module)
		// can be appended later during their own module initialization.
		const registry = Container.get(AuthStrategyRegistry);
		registry.register(Container.get(ApiKeyAuthStrategy));

		// ----------------------------------------
		// Public API
		// ----------------------------------------

		if (isApiEnabled()) {
			const { apiRouters, apiLatestVersion } = await loadPublicApiVersions(publicApiEndpoint);
			this.app.use(...apiRouters);
			if (frontendService) {
				(await frontendService.getSettings()).publicApi.latestVersion = apiLatestVersion;
			}
		}

		// Extract BrowserId from headers
		this.app.use((req: APIRequest, _, next) => {
			req.browserId = req.headers['browser-id'] as string;
			next();
		});

		// Parse cookies for easier access
		this.app.use(cookieParser());

		const { restEndpoint, app } = this;

		const push = Container.get(Push);
		push.setupPushHandler(restEndpoint, app);

		if (push.isBidirectional) {
			const { CollaborationService } = await import('@/collaboration/collaboration.service');

			const collaborationService = Container.get(CollaborationService);
			collaborationService.init();
		} else {
			this.logger.warn(
				'Collaboration features are disabled because push is configured unidirectional. Use N8N_PUSH_BACKEND=websocket environment variable to enable them.',
			);
		}

		if (this.globalConfig.executions.mode === 'queue') {
			const { ScalingService } = await import('@/scaling/scaling.service');
			await Container.get(ScalingService).setupQueue();
		}

		await handleMfaDisable();

		await this.registerAdditionalControllers();

		// Reinitialize the PubSubRegistry
		Container.get(PubSubRegistry).init();

		// register all known controllers
		Container.get(ControllerRegistry).activate(app);

		// ----------------------------------------
		// Options
		// ----------------------------------------

		// Returns all the available timezones
		const tzDataFile = resolve(CLI_DIR, 'dist/timezones.json');
		this.app.get(`/${this.restEndpoint}/options/timezones`, (_, res) =>
			res.sendFile(tzDataFile, { dotfiles: 'allow' }),
		);

		this.configureSettingsRoute();

		// ----------------------------------------
		// EventBus Setup
		// ----------------------------------------
		const eventBus = Container.get(MessageEventBus);
		await eventBus.initialize();
		Container.get(LogStreamingEventRelay).init();

		// ----------------------------------------
		// Workflow Indexing Setup
		// ----------------------------------------
		await this.initializeWorkflowIndexing();

		if (this.endpointPresetCredentials !== '') {
			// POST endpoint to set preset credentials
			const overwriteEndpointMiddleware =
				Container.get(CredentialsOverwrites).getOverwriteEndpointMiddleware();

			if (overwriteEndpointMiddleware) {
				this.app.use(`/${this.endpointPresetCredentials}`, overwriteEndpointMiddleware);
			}

			const authenticationEnforced = overwriteEndpointMiddleware !== null;
			this.app.post(
				`/${this.endpointPresetCredentials}`,
				async (req: express.Request, res: express.Response) => {
					try {
						// If authentication is enforced we can allow multiple overwrites
						if (!this.presetCredentialsLoaded || authenticationEnforced) {
							const body = req.body as ICredentialsOverwrite;

							if (req.contentType !== 'application/json') {
								ResponseHelper.sendErrorResponse(
									res,
									new Error(
										'Body must be a valid JSON, make sure the content-type is application/json',
									),
								);
								return;
							}

							await Container.get(CredentialsOverwrites).setData(body, true, true);

							this.presetCredentialsLoaded = true;

							// Send push event to notify frontend to refetch types
							Container.get(Push).broadcast({ type: 'nodeDescriptionUpdated', data: {} });

							ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
						} else {
							ResponseHelper.sendErrorResponse(
								res,
								new Error('Preset credentials can be set once'),
							);
						}
					} catch (error) {
						this.logger.error('Error handling credentials overwrite', { error });
						ResponseHelper.sendErrorResponse(
							res,
							new Error(
								'An error occurred while handling credentials overwrite, please check the logs for more details',
							),
						);
					}
				},
			);
		}

		const maxAge = Time.days.toMilliseconds;
		const cacheOptions = inE2ETests || inDevelopment ? {} : { maxAge };
		const { staticCacheDir } = Container.get(InstanceSettings);

		// Protect type files with authentication regardless of UI availability
		const authService = Container.get(AuthService);
		const protectedTypeFiles = [
			'/types/nodes.json',
			'/types/credentials.json',
			'/types/node-versions.json',
		];
		protectedTypeFiles.forEach((path) => {
			this.app.get(
				path,
				authService.createAuthMiddleware({ allowSkipMFA: true, allowSkipPreviewAuth: true }),
				async (_, res: express.Response) => {
					res.setHeader('Cache-Control', 'no-cache, must-revalidate');
					res.sendFile(path.substring(1), {
						root: staticCacheDir,
					});
				},
			);
		});

		if (frontendService) {
			this.app.use(
				[
					'/icons/{@:scope/}:packageName/*path/*file.svg',
					'/icons/{@:scope/}:packageName/*path/*file.png',
				],
				async (req, res) => {
					// eslint-disable-next-line prefer-const
					let { scope, packageName } = req.params;
					if (scope) packageName = `@${scope}/${packageName}`;
					const filePath = this.loadNodesAndCredentials.resolveIcon(packageName, req.originalUrl);
					if (filePath) {
						try {
							await fsAccess(filePath);
							return res.sendFile(filePath, { maxAge, dotfiles: 'allow' });
						} catch {}
					}
					res.sendStatus(404);
				},
			);

			const serveSchemas: express.RequestHandler = async (req, res) => {
				const { node, version, resource, operation } = req.params;
				const filePath = this.loadNodesAndCredentials.resolveSchema({
					node,
					resource,
					operation,
					version,
				});

				if (filePath) {
					try {
						await fsAccess(filePath);
						return res.sendFile(filePath, { ...cacheOptions, dotfiles: 'allow' });
					} catch {}
				}
				res.sendStatus(404);
			};
			this.app.use('/schemas/:node/:version{/:resource}{/:operation}.json', serveSchemas);

			const isTLSEnabled =
				this.globalConfig.protocol === 'https' && !!(this.sslKey && this.sslCert);
			const isPreviewMode = process.env.N8N_PREVIEW_MODE === 'true';
			const cspDirectives = jsonParse<{ [key: string]: Iterable<string> }>(
				Container.get(SecurityConfig).contentSecurityPolicy,
				{
					errorMessage: 'The contentSecurityPolicy is not valid JSON.',
				},
			);
			const crossOriginOpenerPolicy = Container.get(SecurityConfig).crossOriginOpenerPolicy;
			const cspReportOnly = Container.get(SecurityConfig).contentSecurityPolicyReportOnly;
			// Disable global CSP here and apply a per-request CSP middleware below so
			// we can inject a per-request nonce into `script-src` without overwriting
			// other route-specific CSP headers (some handlers set CSP directly).
			const securityHeadersMiddleware = helmet({
				contentSecurityPolicy: false,
				xFrameOptions:
					isPreviewMode || inE2ETests || inDevelopment ? false : { action: 'sameorigin' },
				dnsPrefetchControl: false,
				// This is only relevant for Internet-explorer, which we do not support
				ieNoOpen: false,
				// This is already disabled in AbstractServer
				xPoweredBy: false,
				// Enable HSTS headers only when n8n handles TLS.
				// if n8n is behind a reverse-proxy, then these headers needs to be configured there
				strictTransportSecurity: isTLSEnabled
					? {
							maxAge: 180 * Time.days.toSeconds,
							includeSubDomains: false,
							preload: false,
						}
					: false,
				crossOriginOpenerPolicy: {
					policy: crossOriginOpenerPolicy,
				},
			});

			// buildCspMiddleware is exported at module level so tests can validate
			// merging and report-only behavior.

			// Route all UI urls to index.html to support history-api
			const nonUIRoutes: readonly string[] = [
				'favicon.ico',
				'assets',
				'static',
				'types',
				this.endpointHealth,
				'metrics',
				'e2e',
				this.restEndpoint,
				this.endpointPresetCredentials,
				isApiEnabled() ? '' : publicApiEndpoint,
				...this.globalConfig.endpoints.additionalNonUIRoutes.split(':'),
			].filter((u) => !!u);
			const nonUIRoutesRegex = new RegExp(`^/(${nonUIRoutes.join('|')})/?.*$`);
			const historyApiHandler: express.RequestHandler = async (req, res, next) => {
				const {
					method,
					headers: { accept },
				} = req;
				if (
					method === 'GET' &&
					accept &&
					(accept.includes('text/html') || accept.includes('*/*')) &&
					!req.path.endsWith('.wasm') &&
					!nonUIRoutesRegex.test(req.path)
				) {
					res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');

					const nonce = randomBytes(16).toString('base64');

					// Apply CSP per-request so we can inject the nonce into
					// `script-src` while merging any directives from
					// `N8N_CONTENT_SECURITY_POLICY`. This avoids overwriting
					// route-specific CSP set elsewhere and honors the
					// `N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY` flag.
					const cspMiddleware = buildCspMiddleware(cspDirectives, cspReportOnly, nonce);

					let indexHtml = '';
					try {
						indexHtml = await readFile(resolve(staticCacheDir, 'index.html'), 'utf8');
					} catch (error) {
						this.logger.error('Could not read index.html for CSP nonce injection', { error });
						res.sendStatus(500);
						return;
					}

					// Only replace explicit nonce placeholders injected at build-time.
					// Additionally, add nonce attributes to trusted build assets (under
					// /assets/ and /static/) so Vite-injected scripts receive the nonce.
					// We do NOT add nonces to arbitrary script tags to avoid granting a
					// nonce to attacker-injected scripts.
					const content = indexHtml.replace(/nonce="\{\{CSP_NONCE\}\}"/g, `nonce="${nonce}"`);

					cspMiddleware(req, res, () => {
						securityHeadersMiddleware(req, res, () => {
							res.send(content);
						});
					});
				} else {
					next();
				}
			};
			const setCustomCacheHeader = (res: express.Response) => {
				if (/^\/types\/(nodes|credentials).json$/.test(res.req.url)) {
					res.setHeader('Cache-Control', 'no-cache, must-revalidate');
				}
			};

			this.app.use(
				'/',
				historyApiHandler,
				express.static(staticCacheDir, {
					...cacheOptions,
					setHeaders: setCustomCacheHeader,
				}),
				express.static(EDITOR_UI_DIST_DIR, cacheOptions),
			);
		} else {
			this.app.use('/', express.static(staticCacheDir, cacheOptions));
		}

		installGlobalProxyAgent();
	}

	private configureSettingsRoute() {
		const { frontendService } = this;
		const authService = Container.get(AuthService);

		if (frontendService) {
			// Returns the current settings for the UI
			this.app.get(
				`/${this.restEndpoint}/settings`,
				authService.createAuthMiddleware({ allowSkipMFA: false, allowUnauthenticated: true }),
				ResponseHelper.send(async (req: AuthenticatedRequest) => {
					return req.user
						? await frontendService.getSettings()
						: await frontendService.getPublicSettings(!!req.authInfo?.mfaEnrollmentRequired);
				}),
			);
		}
	}

	private async initializeWorkflowIndexing() {
		if (Container.get(WorkflowsConfig).indexingEnabled) {
			const { WorkflowIndexService } = await import(
				'@/modules/workflow-index/workflow-index.service'
			);
			Container.get(WorkflowIndexService).init();
		}
	}

	protected setupPushServer(): void {
		const { restEndpoint, server, app } = this;
		Container.get(Push).setupPushServer(restEndpoint, server, app);
		Container.get(ChatServer).setup(server, app);
	}
}
