import 'reflect-metadata';
import {
	inDevelopment,
	inTest,
	LicenseState,
	LockService,
	Logger,
	ModuleRegistry,
	ModulesConfig,
} from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	BinaryDataConfig,
	BinaryDataService,
	InstanceSettings,
	DataDeduplicationService,
	ErrorReporter,
	ExecutionContextHookRegistry,
	StorageConfig,
} from 'n8n-core';
import { ObjectStoreConfig } from 'n8n-core/dist/binary-data/object-store/object-store.config';
import { AzureBlobConfig } from 'n8n-core/dist/binary-data/azure-blob/azure-blob.config';
import { ensureError, Expression, sleep, UnexpectedError } from 'n8n-workflow';

import type { AbstractServer } from '@/abstract-server';
import { N8N_VERSION, N8N_RELEASE_DATE } from '@/constants';
import * as CrashJournal from '@/crash-journal';
import { getDataDeduplicationService } from '@/deduplication';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { TestRunCleanupService } from '@/evaluation.ee/test-runner/test-run-cleanup.service.ee';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { ExpressionObservabilityProvider } from '@/expression-observability/expression-observability.provider';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { resolveBackendHealthEndpointPath } from '@/utils/health-endpoint.util';
import { WorkflowHistoryManager } from '@/workflows/workflow-history/workflow-history-manager';

export abstract class BaseCommand<F = never> {
	readonly flags: F;

	protected logger = Container.get(Logger);

	protected dbConnection: DbConnection;

	protected errorReporter: ErrorReporter;

	protected externalHooks?: ExternalHooks;

	protected nodeTypes: NodeTypes;

	protected instanceSettings: InstanceSettings = Container.get(InstanceSettings);

	protected server?: AbstractServer;

	protected shutdownService: ShutdownService = Container.get(ShutdownService);

	protected license: License;

	protected readonly globalConfig = Container.get(GlobalConfig);

	protected readonly modulesConfig = Container.get(ModulesConfig);

	protected readonly moduleRegistry = Container.get(ModuleRegistry);

	protected readonly executionContextHookRegistry = Container.get(ExecutionContextHookRegistry);

	/**
	 * How long to wait for graceful shutdown before force killing the process.
	 */
	protected gracefulShutdownTimeoutInS =
		Container.get(GlobalConfig).generic.gracefulShutdownTimeout;

	/** Whether to init community packages (if enabled) */
	protected needsCommunityPackages = false;

	/** Whether to init task runner. */
	protected needsTaskRunner = false;

	async init(): Promise<void> {
		this.dbConnection = Container.get(DbConnection);
		this.errorReporter = Container.get(ErrorReporter);

		const {
			backendDsn,
			environment,
			deploymentName,
			profilesSampleRate,
			tracesSampleRate,
			tracesSlowSpanThresholdMs,
			eventLoopBlockThreshold,
			eventLoopBlockMaxEventsPerHour,
			eventLoopBlockDetectionEnabled,
		} = this.globalConfig.sentry;
		await this.errorReporter.init({
			serverType: this.instanceSettings.instanceType,
			dsn: backendDsn,
			environment,
			release: `n8n@${N8N_VERSION}`,
			serverName: deploymentName,
			releaseDate: N8N_RELEASE_DATE,
			withEventLoopBlockDetection: eventLoopBlockDetectionEnabled,
			eventLoopBlockThreshold,
			eventLoopBlockMaxEventsPerHour,
			tracesSampleRate,
			slowSpanThresholdMs: tracesSlowSpanThresholdMs,
			profilesSampleRate,
			healthEndpoint: resolveBackendHealthEndpointPath(this.globalConfig),
			eligibleIntegrations: {
				Express: true,
				Http: true,
				Postgres: this.globalConfig.database.type === 'postgresdb',
				Redis:
					this.globalConfig.executions.mode === 'queue' ||
					this.globalConfig.cache.backend === 'redis',
			},
		});

		process.once('SIGTERM', this.onTerminationSignal('SIGTERM'));
		process.once('SIGINT', this.onTerminationSignal('SIGINT'));

		this.nodeTypes = Container.get(NodeTypes);

		await Container.get(LoadNodesAndCredentials).init();

		const useRedisForLocking =
			this.globalConfig.executions.mode === 'queue' ||
			this.globalConfig.multiMainSetup.enabled ||
			this.globalConfig.cache.backend === 'redis';
		if (useRedisForLocking) {
			const { RedisLockService } = await import('@/scaling/redis-lock.service');
			Container.get(LockService).setProvider(Container.get(RedisLockService));
		}

		await this.dbConnection
			.init()
			.catch(
				async (error: Error) =>
					await this.exitWithCrash('There was an error initializing DB', error),
			);

		// This needs to happen after DB.init() or otherwise DB Connection is not
		// available via the dependency Container that services depend on.
		if (inDevelopment || inTest) {
			this.shutdownService.validate();
		}

		await this.server?.init();

		await this.dbConnection
			.migrate()
			.catch(
				async (error: Error) =>
					await this.exitWithCrash('There was an error running database migrations', error),
			);

		if (process.env.EXECUTIONS_PROCESS === 'own') process.exit(-1);

		if (
			this.globalConfig.executions.mode === 'queue' &&
			this.globalConfig.database.type === 'sqlite'
		) {
			this.logger.warn(
				'Scaling mode is not officially supported with sqlite. Please use PostgreSQL instead.',
			);
		}

		// Ensures that when a CLI command has a check for "instanceSettings.isMultiMainEnabled"
		// that it reflects the configuration of the n8n instance running on the server.
		const isMultiMainEnabled =
			this.globalConfig.executions.mode === 'queue' && this.globalConfig.multiMainSetup.enabled;
		this.instanceSettings.setMultiMainEnabled(isMultiMainEnabled);
		this.instanceSettings.setMultiMainLicensed(isMultiMainEnabled); // no license check here, as the start command already implements that

		const taskRunnersConfig = this.globalConfig.taskRunners;

		if (this.needsTaskRunner) {
			if (taskRunnersConfig.insecureMode) {
				this.logger.warn(
					'TASK RUNNER CONFIGURED TO START IN INSECURE MODE. This is discouraged for production use. Please consider using secure mode instead.',
				);
			}

			const { TaskRunnerModule } = await import('@/task-runners/task-runner-module');
			await Container.get(TaskRunnerModule).start();
		}

		// TODO: remove this after the cyclic dependencies around the event-bus are resolved
		Container.get(MessageEventBus);

		await Container.get(PostHogClient).init();
		await Container.get(TelemetryEventRelay).init();
		Container.get(WorkflowFailureNotificationEventRelay).init();

		const { engine, poolSize, maxCodeCacheSize, bridgeTimeout, bridgeMemoryLimit, idleTimeout } =
			this.globalConfig.expressionEngine;
		await Expression.initExpressionEngine({
			engine,
			poolSize,
			maxCodeCacheSize,
			bridgeTimeout,
			bridgeMemoryLimit,
			idleTimeoutMs: idleTimeout === undefined ? undefined : idleTimeout * 1000,
			observability: Container.get(ExpressionObservabilityProvider),
		});
	}

	protected async stopProcess() {
		// This needs to be overridden
	}

	protected async initCommunityPackages() {
		// @TODO: Move to community-packages module
		const communityPackagesConfig = Container.get(CommunityPackagesConfig);
		if (communityPackagesConfig.enabled && this.needsCommunityPackages) {
			const { CommunityPackagesService } = await import(
				'@/modules/community-packages/community-packages.service'
			);
			await Container.get(CommunityPackagesService).init();
		}
	}

	protected async initCrashJournal() {
		await CrashJournal.init();
	}

	protected async exitSuccessFully() {
		try {
			await Promise.all([
				CrashJournal.cleanup(),
				this.dbConnection.close(),
				Expression.disposeExpressionEngine(),
			]);
		} finally {
			process.exit();
		}
	}

	protected async exitWithCrash(message: string, error: unknown) {
		this.errorReporter.error(new Error(message, { cause: error }), { level: 'fatal' });
		await sleep(2000);
		process.exit(1);
	}

	protected log(message: string) {
		this.logger.info(message);
	}

	protected error(message: string) {
		throw new UnexpectedError(message);
	}

	async initBinaryDataService() {
		const binaryDataConfig = Container.get(BinaryDataConfig);
		const binaryDataService = Container.get(BinaryDataService);
		const isS3WriteMode = binaryDataConfig.mode === 's3';
		const isAzureWriteMode = binaryDataConfig.mode === 'azure';

		const { DatabaseManager } = await import('@/binary-data/database.manager');
		binaryDataService.setManager('database', Container.get(DatabaseManager));

		if (isS3WriteMode) {
			const isLicensed = Container.get(License).isLicensed(LICENSE_FEATURES.BINARY_DATA_S3);
			if (!isLicensed) {
				this.logger.error(
					'S3 binary data storage requires a valid license. Either set `N8N_DEFAULT_BINARY_DATA_MODE` to something else, or upgrade to a license that supports this feature.',
				);
				process.exit(1);
			}
		}

		if (isAzureWriteMode) {
			const isLicensed = Container.get(LicenseState).isBinaryDataAzureLicensed();
			if (!isLicensed) {
				this.logger.error(
					'Azure Blob binary data storage requires a valid license. Either set `N8N_DEFAULT_BINARY_DATA_MODE` to something else, or upgrade to a license that supports this feature.',
				);
				process.exit(1);
			}
			if (Container.get(AzureBlobConfig).containerName === '') {
				this.logger.error(
					'Azure Blob binary data storage requires `N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME` to be set.',
				);
				process.exit(1);
			}
		}

		const executionDataMode = Container.get(StorageConfig).mode;
		const isS3Configured = Container.get(ObjectStoreConfig).bucket.name !== '';
		const isAzureConfigured = Container.get(AzureBlobConfig).containerName !== '';
		const isExecutionDataS3Mode = executionDataMode === 's3';
		const isExecutionDataAzureMode = executionDataMode === 'azure';
		const isExecutionDataS3Licensed = Container.get(LicenseState).isExecutionDataS3Licensed();
		const isExecutionDataAzureLicensed = Container.get(LicenseState).isExecutionDataAzureLicensed();

		if (isExecutionDataS3Mode) {
			if (!isExecutionDataS3Licensed) {
				this.logger.error(
					'S3 execution data storage requires a valid license. Either set `N8N_EXECUTION_DATA_STORAGE_MODE` to something else, or upgrade to a license that supports this feature.',
				);
				process.exit(1);
			}
			if (!isS3Configured) {
				this.logger.error(
					'S3 execution data storage requires `N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME` to be set.',
				);
				process.exit(1);
			}
		}

		if (isExecutionDataAzureMode) {
			if (!isExecutionDataAzureLicensed) {
				this.logger.error(
					'Azure Blob execution data storage requires a valid license. Either set `N8N_EXECUTION_DATA_STORAGE_MODE` to something else, or upgrade to a license that supports this feature.',
				);
				process.exit(1);
			}
			if (!isAzureConfigured) {
				this.logger.error(
					'Azure Blob execution data storage requires `N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME` to be set.',
				);
				process.exit(1);
			}
		}

		try {
			const objectStoreService = await this.initObjectStoreIfConfigured();
			if (objectStoreService) {
				const { ObjectStoreManager } = await import(
					'n8n-core/dist/binary-data/object-store.manager'
				);
				binaryDataService.setManager('s3', new ObjectStoreManager(objectStoreService));
			}
		} catch {
			if (isS3WriteMode || isExecutionDataS3Mode) {
				this.logger.error('Failed to connect to S3. Please check your S3 configuration.');
				process.exit(1);
			}
		}

		try {
			const azureBlobService = await this.initAzureStoreIfConfigured();
			if (azureBlobService) {
				const { AzureBlobManager } = await import('n8n-core/dist/binary-data/azure-blob.manager');
				binaryDataService.setManager('azure', new AzureBlobManager(azureBlobService));
			}
		} catch {
			if (isAzureWriteMode || isExecutionDataAzureMode) {
				this.logger.error(
					'Failed to connect to Azure Blob storage. Please check your Azure configuration.',
				);
				process.exit(1);
			}
		}

		await binaryDataService.init();
	}

	protected async initObjectStoreIfConfigured() {
		if (Container.get(ObjectStoreConfig).bucket.name === '') return undefined;

		const { ObjectStoreService } = await import(
			'n8n-core/dist/binary-data/object-store/object-store.service.ee'
		);
		const objectStoreService = Container.get(ObjectStoreService);
		await objectStoreService.init();

		const { S3Store } = await import('@/executions/execution-data/s3-store.ee');
		Container.get(ExecutionPersistence).setS3Store(Container.get(S3Store));

		return objectStoreService;
	}

	protected async initAzureStoreIfConfigured() {
		if (Container.get(AzureBlobConfig).containerName === '') return;

		const { AzureBlobService } = await import(
			'n8n-core/dist/binary-data/azure-blob/azure-blob.service.ee'
		);
		const azureBlobService = Container.get(AzureBlobService);
		await azureBlobService.init();

		const { AzureStore } = await import('@/executions/execution-data/azure-store.ee');
		Container.get(ExecutionPersistence).setAzStore(Container.get(AzureStore));

		return azureBlobService;
	}

	protected async initDataDeduplicationService() {
		const dataDeduplicationService = getDataDeduplicationService();
		await DataDeduplicationService.init(dataDeduplicationService);
	}

	async initExternalHooks() {
		this.externalHooks = Container.get(ExternalHooks);
		await this.externalHooks.init();
	}

	async initLicense(): Promise<void> {
		this.license = Container.get(License);
		await this.license.init();

		Container.get(LicenseState).setLicenseProvider(this.license);

		const { activationKey } = this.globalConfig.license;

		if (activationKey) {
			const hasCert = (await this.license.loadCertStr()).length > 0;

			if (hasCert) {
				return this.logger.debug('Skipping license activation');
			}

			try {
				this.logger.debug('Attempting license activation');
				await this.license.activate(activationKey);
				this.logger.debug('License init complete');
			} catch (e: unknown) {
				const error = ensureError(e);
				this.logger.error('Could not activate license', { error });
			}
		}
	}

	initWorkflowHistory() {
		Container.get(WorkflowHistoryManager).init();
	}

	async cleanupTestRunner() {
		await Container.get(TestRunCleanupService).cleanupIncompleteRuns();
	}

	async finally(error: Error | undefined) {
		if (error?.message) this.logger.error(error.message);
		if (inTest || this.constructor.name === 'Start') return;
		if (this.dbConnection.connectionState.connected) {
			await sleep(100); // give any in-flight query some time to finish
			await this.dbConnection.close();
		}
		const exitCode = error ? 1 : 0;
		process.exit(exitCode);
	}

	protected onTerminationSignal(signal: string) {
		return async () => {
			if (this.shutdownService.isShuttingDown()) {
				this.logger.info(`Received ${signal}. Already shutting down...`);
				return;
			}

			const forceShutdownTimer = setTimeout(async () => {
				// In case that something goes wrong with shutdown we
				// kill after timeout no matter what
				this.logger.info(`process exited after ${this.gracefulShutdownTimeoutInS}s`);
				const errorMsg = `Shutdown timed out after ${this.gracefulShutdownTimeoutInS} seconds`;
				await this.exitWithCrash(errorMsg, new Error(errorMsg));
			}, this.gracefulShutdownTimeoutInS * 1000);

			this.logger.info(`Received ${signal}. Shutting down...`);
			this.shutdownService.shutdown();

			await this.shutdownService.waitForShutdown();

			await this.errorReporter.shutdown();

			await this.stopProcess();

			clearTimeout(forceShutdownTimer);
		};
	}
}
