import 'reflect-metadata';
import { Container } from 'typedi';
import { Command } from '@oclif/core';
import { ExitError } from '@oclif/core/lib/errors';
import { ApplicationError, ErrorReporterProxy as ErrorReporter, sleep } from 'n8n-workflow';
import { BinaryDataService, InstanceSettings, ObjectStoreService } from 'n8n-core';
import type { AbstractServer } from '@/AbstractServer';
import { Logger } from '@/Logger';
import config from '@/config';
import * as Db from '@/Db';
import * as CrashJournal from '@/CrashJournal';
import { LICENSE_FEATURES, inDevelopment, inTest } from '@/constants';
import { initErrorHandling } from '@/ErrorReporting';
import { ExternalHooks } from '@/ExternalHooks';
import { NodeTypes } from '@/NodeTypes';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import type { N8nInstanceType } from '@/Interfaces';
import { InternalHooks } from '@/InternalHooks';
import { PostHogClient } from '@/posthog';
import { License } from '@/License';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { initExpressionEvaluator } from '@/ExpressionEvaluator';
import { generateHostInstanceId } from '@db/utils/generators';
import { WorkflowHistoryManager } from '@/workflows/workflowHistory/workflowHistoryManager.ee';
import { ShutdownService } from '@/shutdown/Shutdown.service';

export abstract class BaseCommand extends Command {
	protected logger = Container.get(Logger);

	protected externalHooks?: ExternalHooks;

	protected nodeTypes: NodeTypes;

	protected instanceSettings: InstanceSettings;

	private instanceType: N8nInstanceType = 'main';

	queueModeId: string;

	protected server?: AbstractServer;

	protected shutdownService: ShutdownService = Container.get(ShutdownService);

	protected license: License;

	/**
	 * How long to wait for graceful shutdown before force killing the process.
	 */
	protected gracefulShutdownTimeoutInS = config.getEnv('generic.gracefulShutdownTimeout');

	async init(): Promise<void> {
		await initErrorHandling();
		initExpressionEvaluator();

		process.once('SIGTERM', this.onTerminationSignal('SIGTERM'));
		process.once('SIGINT', this.onTerminationSignal('SIGINT'));

		// Make sure the settings exist
		this.instanceSettings = Container.get(InstanceSettings);

		this.nodeTypes = Container.get(NodeTypes);
		await Container.get(LoadNodesAndCredentials).init();

		await Db.init().catch(
			async (error: Error) => await this.exitWithCrash('There was an error initializing DB', error),
		);

		// This needs to happen after DB.init() or otherwise DB Connection is not
		// available via the dependency Container that services depend on.
		if (inDevelopment || inTest) {
			this.shutdownService.validate();
		}

		await this.server?.init();

		await Db.migrate().catch(
			async (error: Error) =>
				await this.exitWithCrash('There was an error running database migrations', error),
		);

		const dbType = config.getEnv('database.type');

		if (['mysqldb', 'mariadb'].includes(dbType)) {
			this.logger.warn(
				'Support for MySQL/MariaDB has been deprecated and will be removed with an upcoming version of n8n. Please migrate to PostgreSQL.',
			);
		}

		if (process.env.N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN) {
			this.logger.warn(
				'The flag to skip webhook deregistration N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN has been removed. n8n no longer deregisters webhooks at startup and shutdown, in main and queue mode.',
			);
		}

		if (config.getEnv('executions.mode') === 'queue' && dbType === 'sqlite') {
			this.logger.warn(
				'Queue mode is not officially supported with sqlite. Please switch to PostgreSQL.',
			);
		}

		if (
			process.env.N8N_BINARY_DATA_TTL ??
			process.env.N8N_PERSISTED_BINARY_DATA_TTL ??
			process.env.EXECUTIONS_DATA_PRUNE_TIMEOUT
		) {
			this.logger.warn(
				'The env vars N8N_BINARY_DATA_TTL and N8N_PERSISTED_BINARY_DATA_TTL and EXECUTIONS_DATA_PRUNE_TIMEOUT no longer have any effect and can be safely removed. Instead of relying on a TTL system for binary data, n8n currently cleans up binary data together with executions during pruning.',
			);
		}

		await Container.get(PostHogClient).init();
		await Container.get(InternalHooks).init();
	}

	protected setInstanceType(instanceType: N8nInstanceType) {
		this.instanceType = instanceType;
		config.set('generic.instanceType', instanceType);
	}

	protected setInstanceQueueModeId() {
		if (config.get('redis.queueModeId')) {
			this.queueModeId = config.get('redis.queueModeId');
			return;
		}
		this.queueModeId = generateHostInstanceId(this.instanceType);
		config.set('redis.queueModeId', this.queueModeId);
	}

	protected async stopProcess() {
		// This needs to be overridden
	}

	protected async initCrashJournal() {
		await CrashJournal.init();
	}

	protected async exitSuccessFully() {
		try {
			await Promise.all([CrashJournal.cleanup(), Db.close()]);
		} finally {
			process.exit();
		}
	}

	protected async exitWithCrash(message: string, error: unknown) {
		ErrorReporter.error(new Error(message, { cause: error }), { level: 'fatal' });
		await sleep(2000);
		process.exit(1);
	}

	async initObjectStoreService() {
		const isSelected = config.getEnv('binaryDataManager.mode') === 's3';
		const isAvailable = config.getEnv('binaryDataManager.availableModes').includes('s3');

		if (!isSelected && !isAvailable) return;

		if (isSelected && !isAvailable) {
			throw new ApplicationError(
				'External storage selected but unavailable. Please make external storage available by adding "s3" to `N8N_AVAILABLE_BINARY_DATA_MODES`.',
			);
		}

		const isLicensed = Container.get(License).isFeatureEnabled(LICENSE_FEATURES.BINARY_DATA_S3);

		if (isSelected && isAvailable && isLicensed) {
			this.logger.debug(
				'License found for external storage - object store to init in read-write mode',
			);

			await this._initObjectStoreService();

			return;
		}

		if (isSelected && isAvailable && !isLicensed) {
			this.logger.debug(
				'No license found for external storage - object store to init with writes blocked. To enable writes, please upgrade to a license that supports this feature.',
			);

			await this._initObjectStoreService({ isReadOnly: true });

			return;
		}

		if (!isSelected && isAvailable) {
			this.logger.debug(
				'External storage unselected but available - object store to init with writes unused',
			);

			await this._initObjectStoreService();

			return;
		}
	}

	private async _initObjectStoreService(options = { isReadOnly: false }) {
		const objectStoreService = Container.get(ObjectStoreService);

		const host = config.getEnv('externalStorage.s3.host');

		if (host === '') {
			throw new ApplicationError(
				'External storage host not configured. Please set `N8N_EXTERNAL_STORAGE_S3_HOST`.',
			);
		}

		const bucket = {
			name: config.getEnv('externalStorage.s3.bucket.name'),
			region: config.getEnv('externalStorage.s3.bucket.region'),
		};

		if (bucket.name === '') {
			throw new ApplicationError(
				'External storage bucket name not configured. Please set `N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME`.',
			);
		}

		if (bucket.region === '') {
			throw new ApplicationError(
				'External storage bucket region not configured. Please set `N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION`.',
			);
		}

		const credentials = {
			accessKey: config.getEnv('externalStorage.s3.credentials.accessKey'),
			accessSecret: config.getEnv('externalStorage.s3.credentials.accessSecret'),
		};

		if (credentials.accessKey === '') {
			throw new ApplicationError(
				'External storage access key not configured. Please set `N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY`.',
			);
		}

		if (credentials.accessSecret === '') {
			throw new ApplicationError(
				'External storage access secret not configured. Please set `N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET`.',
			);
		}

		this.logger.debug('Initializing object store service');

		try {
			await objectStoreService.init(host, bucket, credentials);
			objectStoreService.setReadonly(options.isReadOnly);

			this.logger.debug('Object store init completed');
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);

			this.logger.debug('Object store init failed', { error });
		}
	}

	async initBinaryDataService() {
		try {
			await this.initObjectStoreService();
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			this.logger.error(`Failed to init object store: ${error.message}`, { error });
			process.exit(1);
		}

		const binaryDataConfig = config.getEnv('binaryDataManager');
		await Container.get(BinaryDataService).init(binaryDataConfig);
	}

	async initExternalHooks() {
		this.externalHooks = Container.get(ExternalHooks);
		await this.externalHooks.init();
	}

	async initLicense(): Promise<void> {
		this.license = Container.get(License);
		await this.license.init(this.instanceType ?? 'main');

		const activationKey = config.getEnv('license.activationKey');

		if (activationKey) {
			const hasCert = (await this.license.loadCertStr()).length > 0;

			if (hasCert) {
				return this.logger.debug('Skipping license activation');
			}

			try {
				this.logger.debug('Attempting license activation');
				await this.license.activate(activationKey);
				this.logger.debug('License init complete');
			} catch (e) {
				this.logger.error('Could not activate license', e as Error);
			}
		}
	}

	async initExternalSecrets() {
		const secretsManager = Container.get(ExternalSecretsManager);
		await secretsManager.init();
	}

	initWorkflowHistory() {
		Container.get(WorkflowHistoryManager).init();
	}

	async finally(error: Error | undefined) {
		if (inTest || this.id === 'start') return;
		if (Db.connectionState.connected) {
			await sleep(100); // give any in-flight query some time to finish
			await Db.close();
		}
		const exitCode = error instanceof ExitError ? error.oclif.exit : error ? 1 : 0;
		this.exit(exitCode);
	}

	private onTerminationSignal(signal: string) {
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

			await Promise.all([this.stopProcess(), this.shutdownService.waitForShutdown()]);

			clearTimeout(forceShutdownTimer);
		};
	}
}
