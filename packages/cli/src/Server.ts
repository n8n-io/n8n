import { Container, Service } from 'typedi';
import { exec as callbackExec } from 'child_process';
import { access as fsAccess } from 'fs/promises';
import { promisify } from 'util';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { GlobalConfig } from '@n8n/config';
import { InstanceSettings } from 'n8n-core';
import type { IN8nUISettings } from 'n8n-workflow';

// @ts-expect-error missing types
import timezones from 'google-timezones-json';

import config from '@/config';

import {
	EDITOR_UI_DIST_DIR,
	inDevelopment,
	inE2ETests,
	inProduction,
	N8N_VERSION,
	Time,
} from '@/constants';
import type { APIRequest } from '@/requests';
import { ControllerRegistry } from '@/decorators';
import { isApiEnabled, loadPublicApiVersions } from '@/PublicApi';
import type { ICredentialsOverwrite } from '@/Interfaces';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import * as ResponseHelper from '@/ResponseHelper';
import { setupPushServer, setupPushHandler } from '@/push';
import { isLdapEnabled } from '@/Ldap/helpers.ee';
import { AbstractServer } from '@/AbstractServer';
import { PostHogClient } from '@/posthog';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { InternalHooks } from '@/InternalHooks';
import { handleMfaDisable, isMfaFeatureEnabled } from '@/Mfa/helpers';
import type { FrontendService } from '@/services/frontend.service';
import { OrchestrationService } from '@/services/orchestration.service';
import { AuditEventRelay } from './eventbus/audit-event-relay.service';

import '@/controllers/activeWorkflows.controller';
import '@/controllers/auth.controller';
import '@/controllers/binaryData.controller';
import '@/controllers/curl.controller';
import '@/controllers/dynamicNodeParameters.controller';
import '@/controllers/invitation.controller';
import '@/controllers/me.controller';
import '@/controllers/nodeTypes.controller';
import '@/controllers/oauth/oAuth1Credential.controller';
import '@/controllers/oauth/oAuth2Credential.controller';
import '@/controllers/orchestration.controller';
import '@/controllers/owner.controller';
import '@/controllers/passwordReset.controller';
import '@/controllers/project.controller';
import '@/controllers/role.controller';
import '@/controllers/tags.controller';
import '@/controllers/translation.controller';
import '@/controllers/users.controller';
import '@/controllers/userSettings.controller';
import '@/controllers/workflowStatistics.controller';
import '@/credentials/credentials.controller';
import '@/eventbus/eventBus.controller';
import '@/executions/executions.controller';
import '@/ExternalSecrets/ExternalSecrets.controller.ee';
import '@/license/license.controller';
import '@/workflows/workflowHistory/workflowHistory.controller.ee';
import '@/workflows/workflows.controller';

const exec = promisify(callbackExec);

@Service()
export class Server extends AbstractServer {
	private endpointPresetCredentials: string;

	private presetCredentialsLoaded: boolean;

	private frontendService?: FrontendService;

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly orchestrationService: OrchestrationService,
		private readonly postHogClient: PostHogClient,
	) {
		super('main');

		this.testWebhooksEnabled = true;
		this.webhooksEnabled = !config.getEnv('endpoints.disableProductionWebhooksOnMainProcess');
	}

	async start() {
		if (!config.getEnv('endpoints.disableUi')) {
			const { FrontendService } = await import('@/services/frontend.service');
			this.frontendService = Container.get(FrontendService);
		}

		this.presetCredentialsLoaded = false;

		const globalConfig = Container.get(GlobalConfig);
		this.endpointPresetCredentials = globalConfig.credentials.overwrite.endpoint;

		await super.start();
		this.logger.debug(`Server ID: ${this.uniqueInstanceId}`);

		if (inDevelopment && process.env.N8N_DEV_RELOAD === 'true') {
			void this.loadNodesAndCredentials.setupHotReload();
		}

		void Container.get(InternalHooks).onServerStarted();
	}

	private async registerAdditionalControllers() {
		if (!inProduction && this.orchestrationService.isMultiMainSetupEnabled) {
			await import('@/controllers/debug.controller');
		}

		if (isLdapEnabled()) {
			const { LdapService } = await import('@/Ldap/ldap.service.ee');
			await import('@/Ldap/ldap.controller.ee');
			await Container.get(LdapService).init();
		}

		if (config.getEnv('nodes.communityPackages.enabled')) {
			await import('@/controllers/communityPackages.controller');
		}

		if (inE2ETests) {
			await import('@/controllers/e2e.controller');
		}

		if (isMfaFeatureEnabled()) {
			await import('@/controllers/mfa.controller');
		}

		if (!config.getEnv('endpoints.disableUi')) {
			await import('@/controllers/cta.controller');
		}

		// ----------------------------------------
		// SAML
		// ----------------------------------------

		// initialize SamlService if it is licensed, even if not enabled, to
		// set up the initial environment
		try {
			const { SamlService } = await import('@/sso/saml/saml.service.ee');
			await Container.get(SamlService).init();
			await import('@/sso/saml/routes/saml.controller.ee');
		} catch (error) {
			this.logger.warn(`SAML initialization failed: ${(error as Error).message}`);
		}

		// ----------------------------------------
		// Source Control
		// ----------------------------------------
		try {
			const { SourceControlService } = await import(
				'@/environments/sourceControl/sourceControl.service.ee'
			);
			await Container.get(SourceControlService).init();
			await import('@/environments/sourceControl/sourceControl.controller.ee');
			await import('@/environments/variables/variables.controller.ee');
		} catch (error) {
			this.logger.warn(`Source Control initialization failed: ${(error as Error).message}`);
		}
	}

	async configure(): Promise<void> {
		if (config.getEnv('endpoints.metrics.enable')) {
			const { MetricsService } = await import('@/services/metrics.service');
			await Container.get(MetricsService).configureMetrics(this.app);
		}

		const { frontendService } = this;
		if (frontendService) {
			frontendService.addToSettings({
				isNpmAvailable: await exec('npm --version')
					.then(() => true)
					.catch(() => false),
				versionCli: N8N_VERSION,
			});

			await this.externalHooks.run('frontend.settings', [frontendService.getSettings()]);
		}

		await this.postHogClient.init();

		const publicApiEndpoint = config.getEnv('publicApi.path');

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
		setupPushHandler(restEndpoint, app);

		if (config.getEnv('executions.mode') === 'queue') {
			const { Queue } = await import('@/Queue');
			await Container.get(Queue).init();
		}

		await handleMfaDisable();

		await this.registerAdditionalControllers();

		// register all known controllers
		Container.get(ControllerRegistry).activate(app);

		// ----------------------------------------
		// Options
		// ----------------------------------------

		// Returns all the available timezones
		this.app.get(
			`/${this.restEndpoint}/options/timezones`,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			ResponseHelper.send(async () => timezones),
		);

		// ----------------------------------------
		// Settings
		// ----------------------------------------

		if (frontendService) {
			// Returns the current settings for the UI
			this.app.get(
				`/${this.restEndpoint}/settings`,
				ResponseHelper.send(
					async (req: express.Request): Promise<IN8nUISettings> =>
						frontendService.getSettings(req.headers['push-ref'] as string),
				),
			);
		}

		// ----------------------------------------
		// EventBus Setup
		// ----------------------------------------
		const eventBus = Container.get(MessageEventBus);
		await eventBus.initialize();
		Container.get(AuditEventRelay).init();

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
			const serveIcons: express.RequestHandler = async (req, res) => {
				// eslint-disable-next-line prefer-const
				let { scope, packageName } = req.params;
				if (scope) packageName = `@${scope}/${packageName}`;
				const filePath = this.loadNodesAndCredentials.resolveIcon(packageName, req.originalUrl);
				if (filePath) {
					try {
						await fsAccess(filePath);
						return res.sendFile(filePath, cacheOptions);
					} catch {}
				}
				res.sendStatus(404);
			};

			this.app.use('/icons/@:scope/:packageName/*/*.(svg|png)', serveIcons);
			this.app.use('/icons/:packageName/*/*.(svg|png)', serveIcons);

			const isTLSEnabled = this.protocol === 'https' && !!(this.sslKey && this.sslCert);
			const isPreviewMode = process.env.N8N_PREVIEW_MODE === 'true';
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
			});

			// Route all UI urls to index.html to support history-api
			const nonUIRoutes: Readonly<string[]> = [
				'assets',
				'static',
				'types',
				'healthz',
				'metrics',
				'e2e',
				this.restEndpoint,
				this.endpointPresetCredentials,
				isApiEnabled() ? '' : publicApiEndpoint,
				...config.getEnv('endpoints.additionalNonUIRoutes').split(':'),
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
					!nonUIRoutesRegex.test(req.path)
				) {
					res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
					securityHeadersMiddleware(req, res, () => {
						res.sendFile('index.html', { root: staticCacheDir, maxAge, lastModified: true });
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
		setupPushServer(restEndpoint, server, app);
	}
}
