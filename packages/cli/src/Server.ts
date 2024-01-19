/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Container, Service } from 'typedi';
import assert from 'assert';
import { exec as callbackExec } from 'child_process';
import { access as fsAccess } from 'fs/promises';
import os from 'os';
import { join as pathJoin } from 'path';
import { promisify } from 'util';
import cookieParser from 'cookie-parser';
import express from 'express';
import { engine as expressHandlebars } from 'express-handlebars';
import type { ServeStaticOptions } from 'serve-static';
import type { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Not, In } from 'typeorm';

import { type Class, InstanceSettings } from 'n8n-core';

import type { ExecutionStatus, IExecutionsSummary, IN8nUISettings } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

// @ts-ignore
import timezones from 'google-timezones-json';
import history from 'connect-history-api-fallback';

import config from '@/config';
import { Queue } from '@/Queue';

import { WorkflowsController } from '@/workflows/workflows.controller';
import {
	EDITOR_UI_DIST_DIR,
	inDevelopment,
	inE2ETests,
	N8N_VERSION,
	TEMPLATES_DIR,
} from '@/constants';
import { credentialsController } from '@/credentials/credentials.controller';
import type { CurlHelper } from '@/requests';
import type { ExecutionRequest } from '@/executions/execution.request';
import { registerController } from '@/decorators';
import { AuthController } from '@/controllers/auth.controller';
import { BinaryDataController } from '@/controllers/binaryData.controller';
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
import type { ICredentialsOverwrite, IDiagnosticInfo, IExecutionsStopData } from '@/Interfaces';
import { ActiveExecutions } from '@/ActiveExecutions';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import * as ResponseHelper from '@/ResponseHelper';
import { WaitTracker } from '@/WaitTracker';
import { toHttpNodeParameters } from '@/CurlConverterHelper';
import { EventBusController } from '@/eventbus/eventBus.controller';
import { EventBusControllerEE } from '@/eventbus/eventBus.controller.ee';
import { LicenseController } from '@/license/license.controller';
import { setupPushServer, setupPushHandler } from '@/push';
import { setupAuthMiddlewares } from './middlewares';
import { isLdapEnabled } from './Ldap/helpers';
import { AbstractServer } from './AbstractServer';
import { PostHogClient } from './posthog';
import { eventBus } from './eventbus';
import { InternalHooks } from './InternalHooks';
import { License } from './License';
import { getStatusUsingPreviousExecutionStatusMethod } from './executions/executionHelpers';
import { SamlController } from './sso/saml/routes/saml.controller.ee';
import { SamlService } from './sso/saml/saml.service.ee';
import { VariablesController } from './environments/variables/variables.controller.ee';
import {
	isLdapCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
} from './sso/ssoHelpers';
import { SourceControlService } from '@/environments/sourceControl/sourceControl.service.ee';
import { SourceControlController } from '@/environments/sourceControl/sourceControl.controller.ee';

import type { ExecutionEntity } from '@db/entities/ExecutionEntity';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';

import { handleMfaDisable, isMfaFeatureEnabled } from './Mfa/helpers';
import type { FrontendService } from './services/frontend.service';
import { ActiveWorkflowsController } from './controllers/activeWorkflows.controller';
import { OrchestrationController } from './controllers/orchestration.controller';
import { WorkflowHistoryController } from './workflows/workflowHistory/workflowHistory.controller.ee';
import { InvitationController } from './controllers/invitation.controller';
import { CollaborationService } from './collaboration/collaboration.service';
import { RoleController } from './controllers/role.controller';
import { BadRequestError } from './errors/response-errors/bad-request.error';
import { NotFoundError } from './errors/response-errors/not-found.error';
import { MultiMainSetup } from './services/orchestration/main/MultiMainSetup.ee';
import { WorkflowSharingService } from './workflows/workflowSharing.service';

const exec = promisify(callbackExec);

@Service()
export class Server extends AbstractServer {
	private endpointPresetCredentials: string;

	private waitTracker: WaitTracker;

	private activeExecutionsInstance: ActiveExecutions;

	private presetCredentialsLoaded: boolean;

	private loadNodesAndCredentials: LoadNodesAndCredentials;

	private frontendService?: FrontendService;

	constructor() {
		super('main');

		this.app.engine('handlebars', expressHandlebars({ defaultLayout: false }));
		this.app.set('view engine', 'handlebars');
		this.app.set('views', TEMPLATES_DIR);

		this.testWebhooksEnabled = true;
		this.webhooksEnabled = !config.getEnv('endpoints.disableProductionWebhooksOnMainProcess');
	}

	async start() {
		this.loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);

		if (!config.getEnv('endpoints.disableUi')) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			this.frontendService = Container.get(require('@/services/frontend.service').FrontendService);
		}

		this.activeExecutionsInstance = Container.get(ActiveExecutions);
		this.waitTracker = Container.get(WaitTracker);

		this.presetCredentialsLoaded = false;
		this.endpointPresetCredentials = config.getEnv('credentials.overwrite.endpoint');

		await super.start();
		this.logger.debug(`Server ID: ${this.uniqueInstanceId}`);

		const cpus = os.cpus();
		const binaryDataConfig = config.getEnv('binaryDataManager');

		const isS3Selected = config.getEnv('binaryDataManager.mode') === 's3';
		const isS3Available = config.getEnv('binaryDataManager.availableModes').includes('s3');
		const isS3Licensed = Container.get(License).isBinaryDataS3Licensed();

		const diagnosticInfo: IDiagnosticInfo = {
			databaseType: config.getEnv('database.type'),
			disableProductionWebhooksOnMainProcess: config.getEnv(
				'endpoints.disableProductionWebhooksOnMainProcess',
			),
			notificationsEnabled: config.getEnv('versionNotifications.enabled'),
			versionCli: N8N_VERSION,
			systemInfo: {
				os: {
					type: os.type(),
					version: os.version(),
				},
				memory: os.totalmem() / 1024,
				cpus: {
					count: cpus.length,
					model: cpus[0].model,
					speed: cpus[0].speed,
				},
			},
			executionVariables: {
				executions_process: config.getEnv('executions.process'),
				executions_mode: config.getEnv('executions.mode'),
				executions_timeout: config.getEnv('executions.timeout'),
				executions_timeout_max: config.getEnv('executions.maxTimeout'),
				executions_data_save_on_error: config.getEnv('executions.saveDataOnError'),
				executions_data_save_on_success: config.getEnv('executions.saveDataOnSuccess'),
				executions_data_save_on_progress: config.getEnv('executions.saveExecutionProgress'),
				executions_data_save_manual_executions: config.getEnv(
					'executions.saveDataManualExecutions',
				),
				executions_data_prune: config.getEnv('executions.pruneData'),
				executions_data_max_age: config.getEnv('executions.pruneDataMaxAge'),
			},
			deploymentType: config.getEnv('deployment.type'),
			binaryDataMode: binaryDataConfig.mode,
			smtp_set_up: config.getEnv('userManagement.emails.mode') === 'smtp',
			ldap_allowed: isLdapCurrentAuthenticationMethod(),
			saml_enabled: isSamlCurrentAuthenticationMethod(),
			binary_data_s3: isS3Available && isS3Selected && isS3Licensed,
			multi_main_setup_enabled: config.getEnv('multiMainSetup.enabled'),
			licensePlanName: Container.get(License).getPlanName(),
			licenseTenantId: config.getEnv('license.tenantId'),
		};

		if (inDevelopment && process.env.N8N_DEV_RELOAD === 'true') {
			void this.loadNodesAndCredentials.setupHotReload();
		}

		void Container.get(WorkflowRepository)
			.findOne({
				select: ['createdAt'],
				order: { createdAt: 'ASC' },
				where: {},
			})
			.then(
				async (workflow) =>
					await Container.get(InternalHooks).onServerStarted(diagnosticInfo, workflow?.createdAt),
			);

		Container.get(CollaborationService);
	}

	private async registerControllers(ignoredEndpoints: Readonly<string[]>) {
		const { app } = this;
		setupAuthMiddlewares(app, ignoredEndpoints, this.restEndpoint);

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
			RoleController,
			ActiveWorkflowsController,
			WorkflowsController,
			ExecutionsController,
		];

		if (process.env.NODE_ENV !== 'production' && Container.get(MultiMainSetup).isEnabled) {
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
		const excludeEndpoints = config.getEnv('security.excludeEndpoints');

		const ignoredEndpoints: Readonly<string[]> = [
			'assets',
			'healthz',
			'metrics',
			'e2e',
			this.endpointPresetCredentials,
			isApiEnabled() ? '' : publicApiEndpoint,
			...excludeEndpoints.split(':'),
		].filter((u) => !!u);

		assert(
			!ignoredEndpoints.includes(this.restEndpoint),
			`REST endpoint cannot be set to any of these values: ${ignoredEndpoints.join()} `,
		);

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
		// Parse cookies for easier access
		this.app.use(cookieParser());

		const { restEndpoint, app } = this;
		setupPushHandler(restEndpoint, app);

		// Make sure that Vue history mode works properly
		this.app.use(
			history({
				rewrites: [
					{
						from: new RegExp(`^/(${[this.restEndpoint, ...ignoredEndpoints].join('|')})/?.*$`),
						to: (context) => {
							return context.parsedUrl.pathname!.toString();
						},
					},
				],
			}),
		);

		if (config.getEnv('executions.mode') === 'queue') {
			await Container.get(Queue).init();
		}

		await handleMfaDisable();

		await this.registerControllers(ignoredEndpoints);

		this.app.use(`/${this.restEndpoint}/credentials`, credentialsController);

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
		// curl-converter
		// ----------------------------------------
		this.app.post(
			`/${this.restEndpoint}/curl-to-json`,
			ResponseHelper.send(async (req: CurlHelper.ToJson) => {
				const curlCommand = req.body.curlCommand ?? '';

				try {
					const parameters = toHttpNodeParameters(curlCommand);
					return ResponseHelper.flattenObject(parameters, 'parameters');
				} catch (e) {
					throw new BadRequestError('Invalid cURL command');
				}
			}),
		);

		// ----------------------------------------
		// Executing Workflows
		// ----------------------------------------

		// Returns all the currently working executions
		this.app.get(
			`/${this.restEndpoint}/executions-current`,
			ResponseHelper.send(
				async (req: ExecutionRequest.GetAllCurrent): Promise<IExecutionsSummary[]> => {
					if (config.getEnv('executions.mode') === 'queue') {
						const queue = Container.get(Queue);
						const currentJobs = await queue.getJobs(['active', 'waiting']);

						const currentlyRunningQueueIds = currentJobs.map((job) => job.data.executionId);

						const currentlyRunningManualExecutions =
							this.activeExecutionsInstance.getActiveExecutions();
						const manualExecutionIds = currentlyRunningManualExecutions.map(
							(execution) => execution.id,
						);

						const currentlyRunningExecutionIds =
							currentlyRunningQueueIds.concat(manualExecutionIds);

						if (!currentlyRunningExecutionIds.length) return [];

						const findOptions: FindManyOptions<ExecutionEntity> & {
							where: FindOptionsWhere<ExecutionEntity>;
						} = {
							select: ['id', 'workflowId', 'mode', 'retryOf', 'startedAt', 'stoppedAt', 'status'],
							order: { id: 'DESC' },
							where: {
								id: In(currentlyRunningExecutionIds),
								status: Not(In(['finished', 'stopped', 'failed', 'crashed'] as ExecutionStatus[])),
							},
						};

						const sharedWorkflowIds = await Container.get(
							WorkflowSharingService,
						).getSharedWorkflowIds(req.user);

						if (!sharedWorkflowIds.length) return [];

						if (req.query.filter) {
							const { workflowId, status, finished } = jsonParse<any>(req.query.filter);
							if (workflowId && sharedWorkflowIds.includes(workflowId)) {
								Object.assign(findOptions.where, { workflowId });
							} else {
								Object.assign(findOptions.where, { workflowId: In(sharedWorkflowIds) });
							}
							if (status) {
								Object.assign(findOptions.where, { status: In(status) });
							}
							if (finished) {
								Object.assign(findOptions.where, { finished });
							}
						} else {
							Object.assign(findOptions.where, { workflowId: In(sharedWorkflowIds) });
						}

						const executions =
							await Container.get(ExecutionRepository).findMultipleExecutions(findOptions);

						if (!executions.length) return [];

						return executions.map((execution) => {
							if (!execution.status) {
								execution.status = getStatusUsingPreviousExecutionStatusMethod(execution);
							}
							return {
								id: execution.id,
								workflowId: execution.workflowId,
								mode: execution.mode,
								retryOf: execution.retryOf !== null ? execution.retryOf : undefined,
								startedAt: new Date(execution.startedAt),
								status: execution.status ?? null,
								stoppedAt: execution.stoppedAt ?? null,
							} as IExecutionsSummary;
						});
					}

					const executingWorkflows = this.activeExecutionsInstance.getActiveExecutions();

					const returnData: IExecutionsSummary[] = [];

					const filter = req.query.filter ? jsonParse<any>(req.query.filter) : {};

					const sharedWorkflowIds = await Container.get(
						WorkflowSharingService,
					).getSharedWorkflowIds(req.user);

					for (const data of executingWorkflows) {
						if (
							(filter.workflowId !== undefined && filter.workflowId !== data.workflowId) ||
							(data.workflowId !== undefined && !sharedWorkflowIds.includes(data.workflowId))
						) {
							continue;
						}

						returnData.push({
							id: data.id,
							workflowId: data.workflowId === undefined ? '' : data.workflowId,
							mode: data.mode,
							retryOf: data.retryOf,
							startedAt: new Date(data.startedAt),
							status: data.status,
						});
					}

					returnData.sort((a, b) => Number(b.id) - Number(a.id));

					return returnData;
				},
			),
		);

		// Forces the execution to stop
		this.app.post(
			`/${this.restEndpoint}/executions-current/:id/stop`,
			ResponseHelper.send(async (req: ExecutionRequest.Stop): Promise<IExecutionsStopData> => {
				const { id: executionId } = req.params;

				const sharedWorkflowIds = await Container.get(WorkflowSharingService).getSharedWorkflowIds(
					req.user,
				);

				if (!sharedWorkflowIds.length) {
					throw new NotFoundError('Execution not found');
				}

				const fullExecutionData = await Container.get(ExecutionRepository).findSingleExecution(
					executionId,
					{
						where: {
							workflowId: In(sharedWorkflowIds),
						},
					},
				);

				if (!fullExecutionData) {
					throw new NotFoundError('Execution not found');
				}

				if (config.getEnv('executions.mode') === 'queue') {
					// Manual executions should still be stoppable, so
					// try notifying the `activeExecutions` to stop it.
					const result = await this.activeExecutionsInstance.stopExecution(req.params.id);

					if (result === undefined) {
						// If active execution could not be found check if it is a waiting one
						try {
							return await this.waitTracker.stopExecution(req.params.id);
						} catch (error) {
							// Ignore, if it errors as then it is probably a currently running
							// execution
						}
					} else {
						return {
							mode: result.mode,
							startedAt: new Date(result.startedAt),
							stoppedAt: result.stoppedAt ? new Date(result.stoppedAt) : undefined,
							finished: result.finished,
							status: result.status,
						} as IExecutionsStopData;
					}

					const queue = Container.get(Queue);
					const currentJobs = await queue.getJobs(['active', 'waiting']);

					const job = currentJobs.find((job) => job.data.executionId === req.params.id);

					if (!job) {
						this.logger.debug('Could not stop job because it is no longer in queue', {
							jobId: req.params.id,
						});
					} else {
						await queue.stopJob(job);
					}

					const returnData: IExecutionsStopData = {
						mode: fullExecutionData.mode,
						startedAt: new Date(fullExecutionData.startedAt),
						stoppedAt: fullExecutionData.stoppedAt
							? new Date(fullExecutionData.stoppedAt)
							: undefined,
						finished: fullExecutionData.finished,
						status: fullExecutionData.status,
					};

					return returnData;
				}

				// Stop the execution and wait till it is done and we got the data
				const result = await this.activeExecutionsInstance.stopExecution(executionId);

				let returnData: IExecutionsStopData;
				if (result === undefined) {
					// If active execution could not be found check if it is a waiting one
					returnData = await this.waitTracker.stopExecution(executionId);
				} else {
					returnData = {
						mode: result.mode,
						startedAt: new Date(result.startedAt),
						stoppedAt: result.stoppedAt ? new Date(result.stoppedAt) : undefined,
						finished: result.finished,
						status: result.status,
					};
				}

				return returnData;
			}),
		);

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
						frontendService.getSettings(req.headers.sessionid as string),
				),
			);
		}

		// ----------------------------------------
		// EventBus Setup
		// ----------------------------------------

		if (!eventBus.isInitialized) {
			await eventBus.initialize();
		}

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

		const { staticCacheDir } = Container.get(InstanceSettings);
		if (frontendService) {
			const staticOptions: ServeStaticOptions = {
				cacheControl: false,
				setHeaders: (res: express.Response, path: string) => {
					const isIndex = path === pathJoin(staticCacheDir, 'index.html');
					const cacheControl = isIndex
						? 'no-cache, no-store, must-revalidate'
						: 'max-age=86400, immutable';
					res.header('Cache-Control', cacheControl);
				},
			};

			const serveIcons: express.RequestHandler = async (req, res) => {
				// eslint-disable-next-line prefer-const
				let { scope, packageName } = req.params;
				if (scope) packageName = `@${scope}/${packageName}`;
				const filePath = this.loadNodesAndCredentials.resolveIcon(packageName, req.originalUrl);
				if (filePath) {
					try {
						await fsAccess(filePath);
						return res.sendFile(filePath);
					} catch {}
				}
				res.sendStatus(404);
			};

			this.app.use('/icons/@:scope/:packageName/*/*.(svg|png)', serveIcons);
			this.app.use('/icons/:packageName/*/*.(svg|png)', serveIcons);

			this.app.use(
				'/',
				express.static(staticCacheDir),
				express.static(EDITOR_UI_DIST_DIR, staticOptions),
			);

			const startTime = new Date().toUTCString();
			this.app.use('/index.html', (req, res, next) => {
				res.setHeader('Last-Modified', startTime);
				next();
			});
		} else {
			this.app.use('/', express.static(staticCacheDir));
		}
	}

	protected setupPushServer(): void {
		const { restEndpoint, server, app } = this;
		setupPushServer(restEndpoint, server, app);
	}
}
