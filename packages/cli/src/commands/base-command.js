'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.BaseCommand = void 0;
require('reflect-metadata');
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const config_2 = __importDefault(require('@/config'));
const constants_2 = require('@/constants');
const CrashJournal = __importStar(require('@/crash-journal'));
const deduplication_1 = require('@/deduplication');
const deprecation_service_1 = require('@/deprecation/deprecation.service');
const test_run_cleanup_service_ee_1 = require('@/evaluation.ee/test-runner/test-run-cleanup.service.ee');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const telemetry_event_relay_1 = require('@/events/relays/telemetry.event-relay');
const external_hooks_1 = require('@/external-hooks');
const license_1 = require('@/license');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const node_types_1 = require('@/node-types');
const posthog_1 = require('@/posthog');
const shutdown_service_1 = require('@/shutdown/shutdown.service');
const workflow_history_manager_ee_1 = require('@/workflows/workflow-history.ee/workflow-history-manager.ee');
const community_packages_config_1 = require('@/community-packages/community-packages.config');
class BaseCommand {
	constructor() {
		this.logger = di_1.Container.get(backend_common_1.Logger);
		this.instanceSettings = di_1.Container.get(n8n_core_1.InstanceSettings);
		this.shutdownService = di_1.Container.get(shutdown_service_1.ShutdownService);
		this.globalConfig = di_1.Container.get(config_1.GlobalConfig);
		this.modulesConfig = di_1.Container.get(backend_common_1.ModulesConfig);
		this.moduleRegistry = di_1.Container.get(backend_common_1.ModuleRegistry);
		this.gracefulShutdownTimeoutInS = di_1.Container.get(
			config_1.GlobalConfig,
		).generic.gracefulShutdownTimeout;
		this.needsCommunityPackages = false;
		this.needsTaskRunner = false;
	}
	async init() {
		this.dbConnection = di_1.Container.get(db_1.DbConnection);
		this.errorReporter = di_1.Container.get(n8n_core_1.ErrorReporter);
		const { backendDsn, environment, deploymentName } = this.globalConfig.sentry;
		await this.errorReporter.init({
			serverType: this.instanceSettings.instanceType,
			dsn: backendDsn,
			environment,
			release: `n8n@${constants_2.N8N_VERSION}`,
			serverName: deploymentName,
			releaseDate: constants_2.N8N_RELEASE_DATE,
		});
		process.once('SIGTERM', this.onTerminationSignal('SIGTERM'));
		process.once('SIGINT', this.onTerminationSignal('SIGINT'));
		this.nodeTypes = di_1.Container.get(node_types_1.NodeTypes);
		await di_1.Container.get(load_nodes_and_credentials_1.LoadNodesAndCredentials).init();
		await this.dbConnection
			.init()
			.catch(
				async (error) => await this.exitWithCrash('There was an error initializing DB', error),
			);
		if (backend_common_1.inDevelopment || backend_common_1.inTest) {
			this.shutdownService.validate();
		}
		await this.server?.init();
		await this.dbConnection
			.migrate()
			.catch(
				async (error) =>
					await this.exitWithCrash('There was an error running database migrations', error),
			);
		di_1.Container.get(deprecation_service_1.DeprecationService).warn();
		if (process.env.EXECUTIONS_PROCESS === 'own') process.exit(-1);
		if (
			config_2.default.getEnv('executions.mode') === 'queue' &&
			this.globalConfig.database.type === 'sqlite'
		) {
			this.logger.warn(
				'Scaling mode is not officially supported with sqlite. Please use PostgreSQL instead.',
			);
		}
		const communityPackagesConfig = di_1.Container.get(
			community_packages_config_1.CommunityPackagesConfig,
		);
		if (communityPackagesConfig.enabled && this.needsCommunityPackages) {
			const { CommunityPackagesService } = await Promise.resolve().then(() =>
				__importStar(require('@/community-packages/community-packages.service')),
			);
			await di_1.Container.get(CommunityPackagesService).init();
		}
		const taskRunnersConfig = this.globalConfig.taskRunners;
		if (this.needsTaskRunner && taskRunnersConfig.enabled) {
			if (taskRunnersConfig.insecureMode) {
				this.logger.warn(
					'TASK RUNNER CONFIGURED TO START IN INSECURE MODE. This is discouraged for production use. Please consider using secure mode instead.',
				);
			}
			const { TaskRunnerModule } = await Promise.resolve().then(() =>
				__importStar(require('@/task-runners/task-runner-module')),
			);
			await di_1.Container.get(TaskRunnerModule).start();
		}
		di_1.Container.get(message_event_bus_1.MessageEventBus);
		await di_1.Container.get(posthog_1.PostHogClient).init();
		await di_1.Container.get(telemetry_event_relay_1.TelemetryEventRelay).init();
	}
	async stopProcess() {}
	async initCrashJournal() {
		await CrashJournal.init();
	}
	async exitSuccessFully() {
		try {
			await Promise.all([CrashJournal.cleanup(), this.dbConnection.close()]);
		} finally {
			process.exit();
		}
	}
	async exitWithCrash(message, error) {
		this.errorReporter.error(new Error(message, { cause: error }), { level: 'fatal' });
		await (0, n8n_workflow_1.sleep)(2000);
		process.exit(1);
	}
	log(message) {
		this.logger.info(message);
	}
	error(message) {
		throw new n8n_workflow_1.UnexpectedError(message);
	}
	async initObjectStoreService() {
		const binaryDataConfig = di_1.Container.get(n8n_core_1.BinaryDataConfig);
		const isSelected = binaryDataConfig.mode === 's3';
		const isAvailable = binaryDataConfig.availableModes.includes('s3');
		if (!isSelected) return;
		if (isSelected && !isAvailable) {
			throw new n8n_workflow_1.UserError(
				'External storage selected but unavailable. Please make external storage available by adding "s3" to `N8N_AVAILABLE_BINARY_DATA_MODES`.',
			);
		}
		const isLicensed = di_1.Container.get(license_1.License).isLicensed(
			constants_1.LICENSE_FEATURES.BINARY_DATA_S3,
		);
		if (!isLicensed) {
			this.logger.error(
				'No license found for S3 storage. \n Either set `N8N_DEFAULT_BINARY_DATA_MODE` to something else, or upgrade to a license that supports this feature.',
			);
			return process.exit(1);
		}
		this.logger.debug('License found for external storage - Initializing object store service');
		try {
			await di_1.Container.get(n8n_core_1.ObjectStoreService).init();
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
		await di_1.Container.get(n8n_core_1.BinaryDataService).init();
	}
	async initDataDeduplicationService() {
		const dataDeduplicationService = (0, deduplication_1.getDataDeduplicationService)();
		await n8n_core_1.DataDeduplicationService.init(dataDeduplicationService);
	}
	async initExternalHooks() {
		this.externalHooks = di_1.Container.get(external_hooks_1.ExternalHooks);
		await this.externalHooks.init();
	}
	async initLicense() {
		this.license = di_1.Container.get(license_1.License);
		await this.license.init();
		di_1.Container.get(backend_common_1.LicenseState).setLicenseProvider(this.license);
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
			} catch (e) {
				const error = (0, n8n_workflow_1.ensureError)(e);
				this.logger.error('Could not activate license', { error });
			}
		}
	}
	initWorkflowHistory() {
		di_1.Container.get(workflow_history_manager_ee_1.WorkflowHistoryManager).init();
	}
	async cleanupTestRunner() {
		await di_1.Container.get(
			test_run_cleanup_service_ee_1.TestRunCleanupService,
		).cleanupIncompleteRuns();
	}
	async finally(error) {
		if (error?.message) this.logger.error(error.message);
		if (backend_common_1.inTest || this.constructor.name === 'Start') return;
		if (this.dbConnection.connectionState.connected) {
			await (0, n8n_workflow_1.sleep)(100);
			await this.dbConnection.close();
		}
		const exitCode = error ? 1 : 0;
		process.exit(exitCode);
	}
	onTerminationSignal(signal) {
		return async () => {
			if (this.shutdownService.isShuttingDown()) {
				this.logger.info(`Received ${signal}. Already shutting down...`);
				return;
			}
			const forceShutdownTimer = setTimeout(async () => {
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
exports.BaseCommand = BaseCommand;
//# sourceMappingURL=base-command.js.map
