import 'reflect-metadata';
import {
	inDevelopment,
	inTest,
	LicenseState,
	Logger,
	ModuleRegistry,
	ModulesConfig,
} from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthRolesService, DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	BinaryDataConfig,
	BinaryDataService,
	InstanceSettings,
	ObjectStoreService,
	DataDeduplicationService,
	ErrorReporter,
	ExecutionContextHookRegistry,
} from 'n8n-core';
import { ensureError, sleep, UnexpectedError } from 'n8n-workflow';

import type { AbstractServer } from '@/abstract-server';
import { N8N_VERSION, N8N_RELEASE_DATE } from '@/constants';
import * as CrashJournal from '@/crash-journal';
import { getDataDeduplicationService } from '@/deduplication';
import { TestRunCleanupService } from '@/evaluation.ee/test-runner/test-run-cleanup.service.ee';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { WorkflowHistoryManager } from '@/workflows/workflow-history/workflow-history-manager';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

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

	/** Whether to init task runner (if enabled). */
	protected needsTaskRunner = false;

	async init(): Promise<void> {
		this.dbConnection = Container.get(DbConnection);
		this.errorReporter = Container.get(ErrorReporter);

		const { backendDsn, environment, deploymentName } = this.globalConfig.sentry;
		await this.errorReporter.init({
			serverType: this.instanceSettings.instanceType,
			dsn: backendDsn,
			environment,
			release: `n8n@${N8N_VERSION}`,
			serverName: deploymentName,
			releaseDate: N8N_RELEASE_DATE,
			withEventLoopBlockDetection: true,
		});

		process.once('SIGTERM', this.onTerminationSignal('SIGTERM'));
		process.once('SIGINT', this.onTerminationSignal('SIGINT'));

		this.nodeTypes = Container.get(NodeTypes);

		await Container.get(LoadNodesAndCredentials).init();

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

		// Initialize the auth roles service to make sure that roles are correctly setup for the instance
		await Container.get(AuthRolesService).init();

		if (process.env.EXECUTIONS_PROCESS === 'own') process.exit(-1);

		if (
			this.globalConfig.executions.mode === 'queue' &&
			this.globalConfig.database.type === 'sqlite'
		) {
			this.logger.warn(
				'Scaling mode is not officially supported with sqlite. Please use PostgreSQL instead.',
			);
		}

		// @TODO: Move to community-packages module
		const communityPackagesConfig = Container.get(CommunityPackagesConfig);
		if (communityPackagesConfig.enabled && this.needsCommunityPackages) {
			const { CommunityPackagesService } = await import(
				'@/modules/community-packages/community-packages.service'
			);
			await Container.get(CommunityPackagesService).init();
		}

		const taskRunnersConfig = this.globalConfig.taskRunners;

		if (this.needsTaskRunner && taskRunnersConfig.enabled) {
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
	}

	protected async stopProcess() {
		// This needs to be overridden
	}

	protected async initCrashJournal() {
		await CrashJournal.init();
	}

	protected async exitSuccessFully() {
		try {
			await Promise.all([CrashJournal.cleanup(), this.dbConnection.close()]);
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

		// we always try to init S3 for reading - silently fail if not configured
		try {
			const objectStoreService = Container.get(ObjectStoreService);
			await objectStoreService.init();
			const { ObjectStoreManager } = await import('n8n-core/dist/binary-data/object-store.manager');
			binaryDataService.setManager('s3', new ObjectStoreManager(objectStoreService));
		} catch {
			if (isS3WriteMode) {
				this.logger.error(
					'Failed to connect to S3 for binary data storage. Please check your S3 configuration.',
				);
				process.exit(1);
			}
			// S3 not configured - users without S3 data are unaffected; users with S3 data will fail at runtime when reading
		}

		await binaryDataService.init();
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
