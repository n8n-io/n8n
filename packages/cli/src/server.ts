import { inDevelopment, inProduction, ModuleRegistry } from '@n8n/backend-common';
import { SecurityConfig } from '@n8n/config';
import { HTML_NONCE_PLACEHOLDER, Time } from '@n8n/constants';
import type { APIRequest, AuthenticatedRequest } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import cookieParser from 'cookie-parser';
import express from 'express';
import { access as fsAccess, readFile } from 'fs/promises';
import helmet from 'helmet';
import { InstanceSettings } from 'n8n-core';
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
import { createContentSecurityPolicyMiddleware } from '@/middlewares/content-security-policy';
import { PostHogClient } from '@/posthog';
import { loadPublicApiVersions } from '@/public-api';
import { Push } from '@/push';
import * as ResponseHelper from '@/response-helper';
import { resolveContentSecurityPolicies } from '@/security/content-security-policy';
import type { FrontendService } from '@/services/frontend.service';
import { Telemetry } from '@/telemetry';
import * as requestPath from '@/utils/request-path';

import '@/controllers/active-workflows.controller';
import '@/controllers/annotation-tags.controller.ee';
import '@/controllers/auth.controller';
import '@/controllers/binary-data.controller';
import '@/controllers/ai.controller';
import '@/controllers/dynamic-node-parameters.controller';
import '@/controllers/instance-ai-examples.controller';
import '@/controllers/invitation.controller';
import '@/controllers/me.controller';
import '@/controllers/node-types.controller';
import '@/controllers/oauth/oauth1-credential.controller';
import '@/controllers/oauth/oauth2-credential.controller';
import '@/controllers/orchestration.controller';
import '@/controllers/owner.controller';
import '@/controllers/password-reset.controller';
import '@/controllers/project.controller';
import '@/controllers/project-pool-settings.controller.ee';
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
import '@/evaluation.ee/evaluation-collections.controller.ee';
import '@/evaluation.ee/insights/eval-insights.controller.ee';
import '@/workflows/workflow-history/workflow-history.controller';
import '@/workflows/workflows.controller';
import '@/modules/workflow-index/workflow-dependency.controller';
import '@/webhooks/test-webhooks.controller';
import '@/webhooks/webhooks.controller';

import { ChatServer } from './chat/chat-server';
import { MfaService } from './mfa/mfa.service';
import { BrowserUseServer } from './modules/instance-ai/browser/browser-use-server';
import { PubSubRegistry } from './scaling/pubsub/pubsub.registry';
import { ApiKeyAuthStrategy } from './services/api-key-auth.strategy';
import { AuthStrategyRegistry } from './services/auth-strategy.registry';
import { SessionCookieAuthStrategy } from './services/session-cookie-auth.strategy';

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
			const { FrontendService } = await import('@/services/frontend.service.js');
			this.frontendService = Container.get(FrontendService);
			await import('@/controllers/module-settings.controller.js');
			await import('@/controllers/third-party-licenses.controller.js');
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
			await import('@/controllers/debug.controller.js');
		}

		if (inE2ETests) {
			await import('@/controllers/e2e.controller.js');
		}

		if (isMfaFeatureEnabled()) {
			await Container.get(MfaService).init();
			await import('@/controllers/mfa.controller.js');
		}

		if (!this.globalConfig.endpoints.disableUi) {
			await import('@/controllers/cta.controller.js');
		}

		if (!this.globalConfig.tags.disabled) {
			await import('@/controllers/tags.controller.js');
		}

		if (this.globalConfig.diagnostics.enabled) {
			await import('@/controllers/telemetry.controller.js');
			await import('@/controllers/posthog.controller.js');
		}

		// ----------------------------------------
		// Variables
		// ----------------------------------------

		try {
			await import('@/environments.ee/variables/variables.controller.ee.js');
		} catch (error) {
			this.logger.warn(`Variables initialization failed: ${(error as Error).message}`);
		}
	}

	async configure(): Promise<void> {
		if (this.globalConfig.endpoints.metrics.enable) {
			const { PrometheusMetricsService } = await import('@/metrics/prometheus/index.js');
			Container.get(PrometheusMetricsService).init(this.app);
		}

		const { frontendService } = this;
		if (frontendService) {
			const frontendSettings = await frontendService.getSettings();
			await this.externalHooks.run('frontend.settings', [frontendSettings]);

			if (this.globalConfig.deployment.type === 'cloud') {
				Container.get(Telemetry).setUserCloudId(frontendSettings.n8nMetadata?.userId);
			}
		}

		await this.postHogClient.init();
		this.postHogClient.setupExpressSessionContext(this.app);

		const publicApiEndpoint = this.globalConfig.publicApi.path;

		// Register auth strategies in priority order. The registry evaluates them
		// sequentially — the first strategy that returns a non-null result wins.
		// API key auth is registered first so existing behavior is preserved.
		// Session cookie auth is registered last: an explicit but wrong API
		// key/bearer token fails fast rather than silently falling back to an
		// ambient browser session cookie.
		// Additional strategies (e.g. scoped JWT from the token-exchange module)
		// can be appended later during their own module initialization.
		const registry = Container.get(AuthStrategyRegistry);
		registry.register(Container.get(ApiKeyAuthStrategy));
		registry.register(Container.get(SessionCookieAuthStrategy));

		// Parse cookies for easier access
		this.app.use(cookieParser());

		// Extract BrowserId from headers
		this.app.use((req: APIRequest, _, next) => {
			req.browserId = req.headers['browser-id'] as string;
			next();
		});

		// Installed here on purpose, and the order is the mechanism: `AbstractServer` has
		// already registered the webhook and form routes, so they never reach this
		// middleware. Those pages serve HTML that a workflow author wrote, which the
		// instance policy must not constrain - including when the `sandbox` policy is
		// switched off with `N8N_INSECURE_DISABLE_*_SANDBOX`, where they carry no policy
		// at all. Moving this line above `AbstractServer` would silently change that.
		const securityConfig = Container.get(SecurityConfig);
		this.app.use(
			createContentSecurityPolicyMiddleware(
				resolveContentSecurityPolicies(
					securityConfig.contentSecurityPolicy,
					securityConfig.contentSecurityPolicyReportOnly,
					this.logger,
				),
			),
		);

		// ----------------------------------------
		// Public API
		// ----------------------------------------

		const { apiRouters, apiLatestVersion } = await loadPublicApiVersions(publicApiEndpoint);
		this.app.use(...apiRouters);
		if (frontendService) {
			(await frontendService.getSettings()).publicApi.latestVersion = apiLatestVersion;
		}

		const { restEndpoint, app } = this;

		const push = Container.get(Push);
		push.setupPushHandler(restEndpoint, app);

		if (push.isBidirectional) {
			const { CollaborationService } = await import('@/collaboration/collaboration.service.js');

			const collaborationService = Container.get(CollaborationService);
			collaborationService.init();
		} else {
			this.logger.warn(
				'Collaboration features are disabled because push is configured unidirectional. Use N8N_PUSH_BACKEND=websocket environment variable to enable them.',
			);
		}

		if (this.globalConfig.executions.mode === 'queue') {
			const { ScalingService } = await import('@/scaling/scaling.service.js');
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

		this.protectTypeFiles(staticCacheDir);

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
			const crossOriginOpenerPolicy = Container.get(SecurityConfig).crossOriginOpenerPolicy;
			// `createContentSecurityPolicyMiddleware` serves the CSP instead: helmet cannot
			// inject a per-request nonce.
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

			// Route all UI urls to index.html to support history-api
			const nonUIRoutes: readonly string[] = [
				'favicon.ico',
				'assets',
				'static',
				'types',
				'\\.well-known',
				this.endpointHealth,
				'metrics',
				'e2e',
				this.restEndpoint,
				this.endpointPresetCredentials,
				...this.globalConfig.endpoints.additionalNonUIRoutes.split(':'),
			].filter((u) => !!u);
			// Matched against the normalised path, so a non-UI asset requested in another
			// case or spelling reaches the static handler rather than the editor page.
			const nonUIRoutesRegex = new RegExp(`^/(${nonUIRoutes.join('|')})/?.*$`, 'i');

			// `index.html` does not change while n8n runs. Read it once and keep it split
			// around the nonce placeholders, so serving a request is only a join.
			let indexHtmlParts: string[] | undefined;
			const indexHtmlTemplate = async () => {
				indexHtmlParts ??= (await readFile(resolve(staticCacheDir, 'index.html'), 'utf8')).split(
					HTML_NONCE_PLACEHOLDER,
				);
				return indexHtmlParts;
			};

			const historyApiHandler: express.RequestHandler = async (req, res, next) => {
				const {
					method,
					headers: { accept },
				} = req;
				// A request with no `Accept` also gets the page. Only this handler fills in the
				// nonce placeholders, so `express.static` would serve `index.html` with the
				// placeholders intact, and no script on it could run under the CSP.
				if (
					method === 'GET' &&
					(!accept || req.accepts('html') || accept.includes('*/*')) &&
					!req.path.endsWith('.wasm') &&
					!nonUIRoutesRegex.test(requestPath.normalize(req.path))
				) {
					res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');

					let template: string[];
					try {
						template = await indexHtmlTemplate();
					} catch (error) {
						this.logger.error('Could not read index.html', { error });
						res.sendStatus(500);
						return;
					}

					// Only the placeholders the build wrote get the nonce. Markup that arrived
					// any other way must not get one.
					securityHeadersMiddleware(req, res, () => {
						res.type('html').send(template.join(res.locals.cspNonce));
					});
				} else {
					next();
				}
			};
			this.app.use(
				'/',
				historyApiHandler,
				express.static(staticCacheDir, cacheOptions),
				express.static(EDITOR_UI_DIST_DIR, cacheOptions),
			);
		} else {
			this.app.use('/', express.static(staticCacheDir, cacheOptions));
		}
	}

	/** Authenticates every request that can reach a type file, whether or not the editor is served. */
	private protectTypeFiles(staticCacheDir: string) {
		const authMiddleware = Container.get(AuthService).createAuthMiddleware({
			allowSkipMFA: true,
			allowSkipPreviewAuth: true,
		});

		// Match exact urls. We always expect them in this form, and only a matched route
		// path can skip AuthService's browser-id check, which the editor's fetch needs.
		const typeFiles = ['/types/nodes.json', '/types/credentials.json', '/types/node-versions.json'];
		typeFiles.forEach((typeFile) => {
			this.app.get(typeFile, authMiddleware, async (_, res: express.Response) => {
				res.setHeader('Cache-Control', 'no-cache, must-revalidate');
				res.sendFile(typeFile.substring(1), { root: staticCacheDir });
			});
		});

		// Deny any request that can reach /types/* that isn't caught above, rather than
		// authenticating it: no client asks for those forms, and authenticating here would
		// clear the session cookie of a signed-in caller, since this matches no route.
		this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
			if (requestPath.mayReachDirectory(req.path, 'types')) {
				res.status(401).end();
				return;
			}
			next();
		});
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
		const { WorkflowIndexService } = await import(
			'@/modules/workflow-index/workflow-index.service.js'
		);
		Container.get(WorkflowIndexService).init();
	}

	protected setupPushServer(): void {
		const { restEndpoint, server, app } = this;
		Container.get(Push).setupPushServer(restEndpoint, server, app);
		Container.get(ChatServer).setup(server, app);
		if (Container.get(ModuleRegistry).isActive('instance-ai')) {
			Container.get(BrowserUseServer).setup(server, app);
		}
	}
}
