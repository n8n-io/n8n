/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Container, Service } from 'typedi';
import { exec as callbackExec } from 'child_process';
import { access as fsAccess } from 'fs/promises';
import { promisify } from 'util';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { type Class, InstanceSettings } from 'n8n-core';
import type { IN8nUISettings } from 'n8n-workflow';

// @ts-ignore
import timezones from 'google-timezones-json';

import config from '@/config';
import { Queue } from '@/Queue';

import { WorkflowsController } from '@/workflows/workflows.controller';
import { EDITOR_UI_DIST_DIR, inDevelopment, inE2ETests, N8N_VERSION, Time } from '@/constants';
import { CredentialsController } from '@/credentials/credentials.controller';
import type { APIRequest } from '@/requests';
import { registerController } from '@/decorators';
import { AuthController } from '@/controllers/auth.controller';
import { BinaryDataController } from '@/controllers/binaryData.controller';
import { CurlController } from '@/controllers/curl.controller';
import { DynamicNodeParametersController } from '@/controllers/dynamicNodeParameters.controller';
import { MeController } from '@/controllers/me.controller';
import { MFAController } from '@/controllers/mfa.controller';
import { NodeTypesController } from '@/controllers/nodeTypes.controller';
import { OAuth1CredentialController } from '@/controllers/oauth/oAuth1Credential.controller';
import { OAuth2CredentialController } from '@/controllers/oauth/oAuth2Credential.controller';
import { OwnerController } from '@/controllers/owner.controller';
import { PasswordResetController } from '@/controllers/passwordReset.controller';
import { TagsController } from '@/controllers/tags.controller';
import { TranslationController } from '@/controllers/translation.controller';
import { UsersController } from '@/controllers/users.controller';
import { WorkflowStatisticsController } from '@/controllers/workflowStatistics.controller';
import { ExternalSecretsController } from '@/ExternalSecrets/ExternalSecrets.controller.ee';
import { ExecutionsController } from '@/executions/executions.controller';
import { isApiEnabled, loadPublicApiVersions } from '@/PublicApi';
import type { ICredentialsOverwrite } from '@/Interfaces';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import * as ResponseHelper from '@/ResponseHelper';
import { EventBusController } from '@/eventbus/eventBus.controller';
import { EventBusControllerEE } from '@/eventbus/eventBus.controller.ee';
import { LicenseController } from '@/license/license.controller';
import { setupPushServer, setupPushHandler } from '@/push';
import { isLdapEnabled } from './Ldap/helpers';
import { AbstractServer } from './AbstractServer';
import { PostHogClient } from './posthog';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { InternalHooks } from './InternalHooks';
import { SamlController } from './sso/saml/routes/saml.controller.ee';
import { SamlService } from './sso/saml/saml.service.ee';
import { VariablesController } from './environments/variables/variables.controller.ee';
import { SourceControlService } from '@/environments/sourceControl/sourceControl.service.ee';
import { SourceControlController } from '@/environments/sourceControl/sourceControl.controller.ee';
import { AIController } from '@/controllers/ai.controller';

import { handleMfaDisable, isMfaFeatureEnabled } from './Mfa/helpers';
import type { FrontendService } from './services/frontend.service';
import { ActiveWorkflowsController } from './controllers/activeWorkflows.controller';
import { OrchestrationController } from './controllers/orchestration.controller';
import { WorkflowHistoryController } from './workflows/workflowHistory/workflowHistory.controller.ee';
import { InvitationController } from './controllers/invitation.controller';
// import { CollaborationService } from './collaboration/collaboration.service';
import { OrchestrationService } from '@/services/orchestration.service';
import { ProjectController } from './controllers/project.controller';
import { RoleController } from './controllers/role.controller';

const exec = promisify(callbackExec);

@Service()
export class Server extends AbstractServer {
	private endpointPresetCredentials: string;

	private presetCredentialsLoaded: boolean;

	private loadNodesAndCredentials: LoadNodesAndCredentials;

	private frontendService?: FrontendService;

	constructor() {
		super('main');

		this.testWebhooksEnabled = true;
		this.webhooksEnabled = !config.getEnv('endpoints.disableProductionWebhooksOnMainProcess');
	}

	async start() {
		this.loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);

		if (!config.getEnv('endpoints.disableUi')) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			this.frontendService = Container.get(require('@/services/frontend.service').FrontendService);
		}

		this.presetCredentialsLoaded = false;
		this.endpointPresetCredentials = config.getEnv('credentials.overwrite.endpoint');

		await super.start();
		this.logger.debug(`Server ID: ${this.uniqueInstanceId}`);

		if (inDevelopment && process.env.N8N_DEV_RELOAD === 'true') {
			void this.loadNodesAndCredentials.setupHotReload();
		}

		void Container.get(InternalHooks).onServerStarted();
		// Container.get(CollaborationService);
	}

	private async registerControllers() {
		const { app } = this;

		const controllers: Array<Class<object>> = [
			EventBusController,
			EventBusControllerEE,
			AuthController,
			LicenseController,
			OAuth1CredentialController,
			OAuth2CredentialController,
			OwnerController,
			MeController,
			DynamicNodeParametersController,
			NodeTypesController,
			PasswordResetController,
			TagsController,
			TranslationController,
			UsersController,
			SamlController,
			SourceControlController,
			WorkflowStatisticsController,
			ExternalSecretsController,
			OrchestrationController,
			WorkflowHistoryController,
			BinaryDataController,
			VariablesController,
			InvitationController,
			VariablesController,
			ActiveWorkflowsController,
			WorkflowsController,
			ExecutionsController,
			CredentialsController,
			AIController,
			ProjectController,
			RoleController,
			CurlController,
		];

		if (
			process.env.NODE_ENV !== 'production' &&
			Container.get(OrchestrationService).isMultiMainSetupEnabled
		) {
			const { DebugController } = await import('@/controllers/debug.controller');
			controllers.push(DebugController);
		}

		if (isLdapEnabled()) {
			const { LdapService } = await import('@/Ldap/ldap.service');
			const { LdapController } = await require('@/Ldap/ldap.controller');
			await Container.get(LdapService).init();
			controllers.push(LdapController);
		}

		if (config.getEnv('nodes.communityPackages.enabled')) {
			const { CommunityPackagesController } = await import(
				'@/controllers/communityPackages.controller'
			);
			controllers.push(CommunityPackagesController);
		}

		if (inE2ETests) {
			const { E2EController } = await import('./controllers/e2e.controller');
			controllers.push(E2EController);
		}

		if (isMfaFeatureEnabled()) {
			controllers.push(MFAController);
		}

		if (!config.getEnv('endpoints.disableUi')) {
			const { CtaController } = await import('@/controllers/cta.controller');
			controllers.push(CtaController);
		}

		controllers.forEach((controller) => registerController(app, controller));
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

		await Container.get(PostHogClient).init();

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
			await Container.get(Queue).init();
		}

		await handleMfaDisable();

		await this.registerControllers();

		// ----------------------------------------
		// SAML
		// ----------------------------------------

		// initialize SamlService if it is licensed, even if not enabled, to
		// set up the initial environment
		try {
			await Container.get(SamlService).init();
		} catch (error) {
			this.logger.warn(`SAML initialization failed: ${error.message}`);
		}

		// ----------------------------------------
		// Source Control
		// ----------------------------------------
		try {
			await Container.get(SourceControlService).init();
		} catch (error) {
			this.logger.warn(`Source Control initialization failed: ${error.message}`);
		}

		// ----------------------------------------
		// Options
		// ----------------------------------------

		// Returns all the available timezones
		this.app.get(
			`/${this.restEndpoint}/options/timezones`,
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

			this.app.use(
				'/',
				express.static(staticCacheDir, cacheOptions),
				express.static(EDITOR_UI_DIST_DIR, cacheOptions),
				historyApiHandler,
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
