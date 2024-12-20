import 'reflect-metadata';
import { GlobalConfig } from '@n8n/config';
import { Command, Errors } from '@oclif/core';
import {
	BinaryDataService,
	InstanceSettings,
	ObjectStoreService,
	DataDeduplicationService,
	ErrorReporter,
} from 'n8n-core';
import { ApplicationError, ensureError, sleep } from 'n8n-workflow';
import { Container } from 'typedi';

import type { AbstractServer } from '@/abstract-server';
import config from '@/config';
import { LICENSE_FEATURES, inDevelopment, inTest } from '@/constants';
import * as CrashJournal from '@/crash-journal';
import * as Db from '@/db';
import { getDataDeduplicationService } from '@/deduplication';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { initExpressionEvaluator } from '@/expression-evaluator';
import { ExternalHooks } from '@/external-hooks';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Logger } from '@/logging/logger.service';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { WorkflowHistoryManager } from '@/workflows/workflow-history/workflow-history-manager.ee';

export abstract class BaseCommand extends Command {
	protected logger = Container.get(Logger);

	protected errorReporter: ErrorReporter;

	protected externalHooks?: ExternalHooks;

	protected nodeTypes: NodeTypes;

	protected instanceSettings: InstanceSettings = Container.get(InstanceSettings);

	protected server?: AbstractServer;

	protected shutdownService: ShutdownService = Container.get(ShutdownService);

	protected license: License;

	protected readonly globalConfig = Container.get(GlobalConfig);

	/**
	 * How long to wait for graceful shutdown before force killing the process.
	 */
	protected gracefulShutdownTimeoutInS =
		Container.get(GlobalConfig).generic.gracefulShutdownTimeout;

	/** Whether to init community packages (if enabled) */
	protected needsCommunityPackages = false;

	async init(): Promise<void> {
		this.errorReporter = Container.get(ErrorReporter);
		await this.errorReporter.init(
			this.instanceSettings.instanceType,
			this.globalConfig.sentry.backendDsn,
		);
		initExpressionEvaluator();

		process.once('SIGTERM', this.onTerminationSignal('SIGTERM'));
		process.once('SIGINT', this.onTerminationSignal('SIGINT'));

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

		Container.get(DeprecationService).warn();

		if (
			config.getEnv('executions.mode') === 'queue' &&
			this.globalConfig.database.type === 'sqlite'
		) {
			this.logger.warn(
				'Scaling mode is not officially supported with sqlite. Please use PostgreSQL instead.',
			);
		}

		const { communityPackages } = this.globalConfig.nodes;
		if (communityPackages.enabled && this.needsCommunityPackages) {
			const { CommunityPackagesService } = await import('@/services/community-packages.service');
			await Container.get(CommunityPackagesService).checkForMissingPackages();
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
			await Promise.all([CrashJournal.cleanup(), Db.close()]);
		} finally {
			process.exit();
		}
	}

	protected async exitWithCrash(message: string, error: unknown) {
		this.errorReporter.error(new Error(message, { cause: error }), { level: 'fatal' });
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

		const { host, bucket, credentials } = this.globalConfig.externalStorage.s3;

		if (host === '') {
			throw new ApplicationError(
				'External storage host not configured. Please set `N8N_EXTERNAL_STORAGE_S3_HOST`.',
			);
		}

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
		const exitCode = error instanceof Errors.ExitError ? error.oclif.exit : error ? 1 : 0;
		this.exit(exitCode);
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

			await this.stopProcess();

			clearTimeout(forceShutdownTimer);
		};
	}
}
