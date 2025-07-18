import { CLI_DIR, EDITOR_UI_DIST_DIR, inE2ETests, N8N_VERSION } from '@/constants';
import { inDevelopment, inProduction } from '@n8n/backend-common';
import { SecurityConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { APIRequest } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import cookieParser from 'cookie-parser';
import express from 'express';
import { access as fsAccess } from 'fs/promises';
import helmet from 'helmet';
import isEmpty from 'lodash/isEmpty';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { resolve } from 'path';

import { AbstractServer } from '@/abstract-server';
import config from '@/config';
import { ControllerRegistry } from '@/controller.registry';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import type { ICredentialsOverwrite } from '@/interfaces';
import { isLdapEnabled } from '@/ldap.ee/helpers.ee';
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
import '@/credentials/credentials.controller';
import '@/eventbus/event-bus.controller';
import '@/events/events.controller';
import '@/executions/executions.controller';
import '@/license/license.controller';
import '@/evaluation.ee/test-runs.controller.ee';
import '@/workflows/workflow-history.ee/workflow-history.controller.ee';
import '@/workflows/workflows.controller';
import '@/webhooks/webhooks.controller';
import { MfaService } from './mfa/mfa.service';

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
		}

		this.presetCredentialsLoaded = false;

		this.endpointPresetCredentials = this.globalConfig.credentials.overwrite.endpoint;

		await super.start();
		this.logger.debug(`Server ID: ${this.instanceSettings.hostId}`);

		if (inDevelopment && process.env.N8N_DEV_RELOAD === 'true') {
			void this.loadNodesAndCredentials.setupHotReload();
		}

		this.eventService.emit('server-started');
	}

	private async registerAdditionalControllers() {
		if (!inProduction && this.instanceSettings.isMultiMain) {
			await import('@/controllers/debug.controller');
		}

		if (isLdapEnabled()) {
			const { LdapService } = await import('@/ldap.ee/ldap.service.ee');
			await import('@/ldap.ee/ldap.controller.ee');
			await Container.get(LdapService).init();
		}

		if (this.globalConfig.nodes.communityPackages.enabled) {
			await import('@/controllers/community-packages.controller');
			await import('@/controllers/community-node-types.controller');
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

		// ----------------------------------------
		// SAML
		// ----------------------------------------

		// initialize SamlService if it is licensed, even if not enabled, to
		// set up the initial environment
		try {
			const { SamlService } = await import('@/sso.ee/saml/saml.service.ee');
			await Container.get(SamlService).init();
			await import('@/sso.ee/saml/routes/saml.controller.ee');
		} catch (error) {
			this.logger.warn(`SAML initialization failed: ${(error as Error).message}`);
		}

		if (this.globalConfig.diagnostics.enabled) {
			await import('@/controllers/telemetry.controller');
		}

		// ----------------------------------------
		// OIDC
		// ----------------------------------------

		try {
			// in the short term, we load the OIDC module here to ensure it is initialized
			// ideally we want to migrate this to a module and be able to load it dynamically
			// when the license changes, but that requires some refactoring
			const { OidcService } = await import('@/sso.ee/oidc/oidc.service.ee');
			await Container.get(OidcService).init();
			await import('@/sso.ee/oidc/routes/oidc.controller.ee');
		} catch (error) {
			this.logger.warn(`OIDC initialization failed: ${(error as Error).message}`);
		}

		// ----------------------------------------
		// Source Control
		// ----------------------------------------

		try {
			const { SourceControlService } = await import(
				'@/environments.ee/source-control/source-control.service.ee'
			);
			await Container.get(SourceControlService).init();
			await import('@/environments.ee/source-control/source-control.controller.ee');
		} catch (error) {
			this.logger.warn(`Source control initialization failed: ${(error as Error).message}`);
		}

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
			await this.externalHooks.run('frontend.settings', [frontendService.getSettings()]);
		}

		await this.postHogClient.init();

		const publicApiEndpoint = this.globalConfig.publicApi.path;

		// ----------------------------------------
		// Public API
		// ----------------------------------------

		if (isApiEnabled()) {
			const { apiRouters, apiLatestVersion } = await loadPublicApiVersions(publicApiEndpoint);
			this.app.use(...apiRouters);
			if (frontendService) {
				frontendService.settings.publicApi.latestVersion = apiLatestVersion;
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

		if (config.getEnv('executions.mode') === 'queue') {
			const { ScalingService } = await import('@/scaling/scaling.service');
			await Container.get(ScalingService).setupQueue();
		}

		await handleMfaDisable();

		await this.registerAdditionalControllers();

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

		// ----------------------------------------
		// Settings
		// ----------------------------------------

		if (frontendService) {
			// Returns the current settings for the UI
			this.app.get(
				`/${this.restEndpoint}/settings`,
				ResponseHelper.send(async () => frontendService.getSettings()),
			);

			// Returns settings for all loaded modules
			this.app.get(
				`/${this.restEndpoint}/module-settings`,
				ResponseHelper.send(async () => frontendService.getModuleSettings()),
			);

			this.app.get(`/${this.restEndpoint}/config.js`, (_req, res) => {
				const frontendSentryConfig = JSON.stringify({
					dsn: this.globalConfig.sentry.frontendDsn,
					environment: process.env.ENVIRONMENT || 'development',
					serverName: process.env.DEPLOYMENT_NAME,
					release: `n8n@${N8N_VERSION}`,
				});
				const frontendConfig = [
					`window.BASE_PATH = '${this.globalConfig.path}';`,
					`window.REST_ENDPOINT = '${this.globalConfig.endpoints.rest}';`,
					`window.sentry = ${frontendSentryConfig};`,
				].join('\n');

				res.type('application/javascript');
				res.send(frontendConfig);
			});
		}

		// ----------------------------------------
		// EventBus Setup
		// ----------------------------------------
		const eventBus = Container.get(MessageEventBus);
		await eventBus.initialize();
		Container.get(LogStreamingEventRelay).init();

		if (this.endpointPresetCredentials !== '') {
			// POST endpoint to set preset credentials
			this.app.post(
				`/${this.endpointPresetCredentials}`,
				async (req: express.Request, res: express.Response) => {
					if (!this.presetCredentialsLoaded) {
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

						Container.get(CredentialsOverwrites).setData(body);

						await frontendService?.generateTypes();

						this.presetCredentialsLoaded = true;

						ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
					} else {
						ResponseHelper.sendErrorResponse(res, new Error('Preset credentials can be set once'));
					}
				},
			);
		}

		const maxAge = Time.days.toMilliseconds;
		const cacheOptions = inE2ETests || inDevelopment ? {} : { maxAge };
		const { staticCacheDir } = Container.get(InstanceSettings);
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
						return res.sendFile(filePath, cacheOptions);
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
			const cspReportOnly = Container.get(SecurityConfig).contentSecurityPolicyReportOnly;
			const securityHeadersMiddleware = helmet({
				contentSecurityPolicy: isEmpty(cspDirectives)
					? false
					: {
							useDefaults: false,
							reportOnly: cspReportOnly,
							directives: {
								...cspDirectives,
							},
						},
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
			});

			// Route all UI urls to index.html to support history-api
			const nonUIRoutes: readonly string[] = [
				'favicon.ico',
				'assets',
				'static',
				'types',
				'healthz',
				'metrics',
				'e2e',
				this.restEndpoint,
				this.endpointPresetCredentials,
				isApiEnabled() ? '' : publicApiEndpoint,
				...this.globalConfig.endpoints.additionalNonUIRoutes.split(':'),
			].filter((u) => !!u);
			const nonUIRoutesRegex = new RegExp(`^/(${nonUIRoutes.join('|')})/?.*$`);
			const historyApiHandler: express.RequestHandler = (req, res, next) => {
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
					securityHeadersMiddleware(req, res, () => {
						res.sendFile('index.html', { root: staticCacheDir, maxAge: 0, lastModified: false });
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
	}

	protected setupPushServer(): void {
		const { restEndpoint, server, app } = this;
		Container.get(Push).setupPushServer(restEndpoint, server, app);
	}
}
