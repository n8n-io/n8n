import 'reflect-metadata';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { Command, Errors } from '@oclif/core';
import {
	BinaryDataConfig,
	BinaryDataService,
	InstanceSettings,
	Logger,
	ObjectStoreService,
	DataDeduplicationService,
	ErrorReporter,
} from 'n8n-core';
import { ensureError, sleep, UserError } from 'n8n-workflow';

import type { AbstractServer } from '@/abstract-server';
import config from '@/config';
import {
	LICENSE_FEATURES,
	N8N_VERSION,
	N8N_RELEASE_DATE,
	inDevelopment,
	inTest,
} from '@/constants';
import * as CrashJournal from '@/crash-journal';
import * as Db from '@/db';
import { ModuleRegistry } from '@/decorators/module';
import { getDataDeduplicationService } from '@/deduplication';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { initExpressionEvaluator } from '@/expression-evaluator';
import { ExternalHooks } from '@/external-hooks';
import { ExternalSecretsManager } from '@/external-secrets.ee/external-secrets-manager.ee';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { ModulePreInit } from '@/modules/modules.config';
import { ModulesConfig } from '@/modules/modules.config';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { WorkflowHistoryManager } from '@/workflows/workflow-history.ee/workflow-history-manager.ee';

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

	protected readonly modulesConfig = Container.get(ModulesConfig);

	/**
	 * How long to wait for graceful shutdown before force killing the process.
	 */
	protected gracefulShutdownTimeoutInS =
		Container.get(GlobalConfig).generic.gracefulShutdownTimeout;

	/** Whether to init community packages (if enabled) */
	protected needsCommunityPackages = false;

	protected async loadModules() {
		for (const moduleName of this.modulesConfig.modules) {
			let preInitModule: ModulePreInit | undefined;
			try {
				preInitModule = (await import(
					`../modules/${moduleName}/${moduleName}.pre-init`
				)) as ModulePreInit;
			} catch {}

			if (
				!preInitModule ||
				preInitModule.shouldLoadModule?.({
					database: this.globalConfig.database,
					instance: this.instanceSettings,
				})
			) {
				// register module in the registry for the dependency injection
				await import(`../modules/${moduleName}/${moduleName}.module`);

				this.modulesConfig.addLoadedModule(moduleName);
				this.logger.debug(`Loaded module "${moduleName}"`);
			}
		}

		Container.get(ModuleRegistry).initializeModules();
	}

	async init(): Promise<void> {
		this.errorReporter = Container.get(ErrorReporter);

		const { backendDsn, environment, deploymentName } = this.globalConfig.sentry;
		await this.errorReporter.init({
			serverType: this.instanceSettings.instanceType,
			dsn: backendDsn,
			environment,
			release: `n8n@${N8N_VERSION}`,
			serverName: deploymentName,
			releaseDate: N8N_RELEASE_DATE,
		});
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
		const binaryDataConfig = Container.get(BinaryDataConfig);
		const isSelected = binaryDataConfig.mode === 's3';
		const isAvailable = binaryDataConfig.availableModes.includes('s3');

		if (!isSelected) return;

		if (isSelected && !isAvailable) {
			throw new UserError(
				'External storage selected but unavailable. Please make external storage available by adding "s3" to `N8N_AVAILABLE_BINARY_DATA_MODES`.',
			);
		}

		const isLicensed = Container.get(License).isFeatureEnabled(LICENSE_FEATURES.BINARY_DATA_S3);
		if (!isLicensed) {
			this.logger.error(
				'No license found for S3 storage. \n Either set `N8N_DEFAULT_BINARY_DATA_MODE` to something else, or upgrade to a license that supports this feature.',
			);
			return this.exit(1);
		}

		this.logger.debug('License found for external storage - Initializing object store service');
		try {
			await Container.get(ObjectStoreService).init();
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

		await Container.get(BinaryDataService).init();
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

	async cleanupTestRunner() {
		await Container.get(TestRunnerService).cleanupIncompleteRuns();
	}

	async finally(error: Error | undefined) {
		if (error?.message) this.logger.error(error.message);
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

			await this.errorReporter.shutdown();

			await this.stopProcess();

			clearTimeout(forceShutdownTimer);
		};
	}
}
