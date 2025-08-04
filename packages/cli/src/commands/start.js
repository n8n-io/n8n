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
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
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
exports.Start = void 0;
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const fast_glob_1 = __importDefault(require('fast-glob'));
const fs_1 = require('fs');
const promises_1 = require('fs/promises');
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = __importDefault(require('path'));
const replacestream_1 = __importDefault(require('replacestream'));
const promises_2 = require('stream/promises');
const zod_1 = require('zod');
const active_executions_1 = require('@/active-executions');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const config_1 = __importDefault(require('@/config'));
const constants_2 = require('@/constants');
const feature_not_licensed_error_1 = require('@/errors/feature-not-licensed.error');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const event_service_1 = require('@/events/event.service');
const execution_service_1 = require('@/executions/execution.service');
const multi_main_setup_ee_1 = require('@/scaling/multi-main-setup.ee');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const pubsub_registry_1 = require('@/scaling/pubsub/pubsub.registry');
const subscriber_service_1 = require('@/scaling/pubsub/subscriber.service');
const server_1 = require('@/server');
const ownership_service_1 = require('@/services/ownership.service');
const executions_pruning_service_1 = require('@/services/pruning/executions-pruning.service');
const url_service_1 = require('@/services/url.service');
const wait_tracker_1 = require('@/wait-tracker');
const workflow_runner_1 = require('@/workflow-runner');
const community_packages_config_1 = require('@/community-packages/community-packages.config');
const base_command_1 = require('./base-command');
const open = require('open');
const flagsSchema = zod_1.z.object({
	open: zod_1.z.boolean().alias('o').describe('opens the UI automatically in browser').optional(),
	tunnel: zod_1.z
		.boolean()
		.describe(
			'runs the webhooks via a hooks.n8n.cloud tunnel server. Use only for testing and development!',
		)
		.optional(),
	reinstallMissingPackages: zod_1.z
		.boolean()
		.describe(
			'Attempts to self heal n8n if packages with nodes are missing. Might drastically increase startup times.',
		)
		.optional(),
});
let Start = class Start extends base_command_1.BaseCommand {
	constructor() {
		super(...arguments);
		this.server = di_1.Container.get(server_1.Server);
		this.needsCommunityPackages = true;
		this.needsTaskRunner = true;
		this.getEditorUrl = () => di_1.Container.get(url_service_1.UrlService).getInstanceBaseUrl();
	}
	openBrowser() {
		const editorUrl = this.getEditorUrl();
		open(editorUrl, { wait: true }).catch(() => {
			this.logger.info(
				`\nWas not able to open URL in browser. Please open manually by visiting:\n${editorUrl}\n`,
			);
		});
	}
	async stopProcess() {
		this.logger.info('\nStopping n8n...');
		try {
			this.activeWorkflowManager.removeAllQueuedWorkflowActivations();
			di_1.Container.get(wait_tracker_1.WaitTracker).stopTracking();
			await this.externalHooks?.run('n8n.stop');
			await this.activeWorkflowManager.removeAllTriggerAndPollerBasedWorkflows();
			if (this.instanceSettings.isMultiMain) {
				await di_1.Container.get(multi_main_setup_ee_1.MultiMainSetup).shutdown();
			}
			if (config_1.default.getEnv('executions.mode') === 'queue') {
				di_1.Container.get(publisher_service_1.Publisher).shutdown();
				di_1.Container.get(subscriber_service_1.Subscriber).shutdown();
			}
			di_1.Container.get(event_service_1.EventService).emit('instance-stopped');
			await di_1.Container.get(active_executions_1.ActiveExecutions).shutdown();
			await di_1.Container.get(message_event_bus_1.MessageEventBus).close();
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}
		await this.exitSuccessFully();
	}
	async generateStaticAssets() {
		const n8nPath = this.globalConfig.path;
		const hooksUrls = this.globalConfig.externalFrontendHooksUrls;
		let scriptsString = '';
		if (hooksUrls) {
			scriptsString = hooksUrls.split(';').reduce((acc, curr) => {
				return `${acc}<script src="${curr}"></script>`;
			}, '');
		}
		const closingTitleTag = '</title>';
		const { staticCacheDir } = this.instanceSettings;
		const compileFile = async (fileName) => {
			const filePath = path_1.default.join(constants_2.EDITOR_UI_DIST_DIR, fileName);
			if (/(index\.html)|.*\.(js|css)/.test(filePath) && (0, fs_1.existsSync)(filePath)) {
				const destFile = path_1.default.join(staticCacheDir, fileName);
				await (0, promises_1.mkdir)(path_1.default.dirname(destFile), { recursive: true });
				const streams = [
					(0, fs_1.createReadStream)(filePath, 'utf-8'),
					(0, replacestream_1.default)('/{{BASE_PATH}}/', n8nPath, { ignoreCase: false }),
					(0, replacestream_1.default)('/%7B%7BBASE_PATH%7D%7D/', n8nPath, { ignoreCase: false }),
					(0, replacestream_1.default)('/%257B%257BBASE_PATH%257D%257D/', n8nPath, {
						ignoreCase: false,
					}),
				];
				if (filePath.endsWith('index.html')) {
					streams.push(
						(0, replacestream_1.default)('{{REST_ENDPOINT}}', this.globalConfig.endpoints.rest, {
							ignoreCase: false,
						}),
						(0, replacestream_1.default)(closingTitleTag, closingTitleTag + scriptsString, {
							ignoreCase: false,
						}),
					);
				}
				streams.push((0, fs_1.createWriteStream)(destFile, 'utf-8'));
				return await (0, promises_2.pipeline)(streams);
			}
		};
		const files = await (0, fast_glob_1.default)('**/*.{css,js}', {
			cwd: constants_2.EDITOR_UI_DIST_DIR,
		});
		await Promise.all([compileFile('index.html'), ...files.map(compileFile)]);
	}
	async init() {
		await this.initCrashJournal();
		this.logger.info('Initializing n8n process');
		if (config_1.default.getEnv('executions.mode') === 'queue') {
			const scopedLogger = this.logger.scoped('scaling');
			scopedLogger.debug('Starting main instance in scaling mode');
			scopedLogger.debug(`Host ID: ${this.instanceSettings.hostId}`);
		}
		const { flags } = this;
		const communityPackagesConfig = di_1.Container.get(
			community_packages_config_1.CommunityPackagesConfig,
		);
		if (flags.reinstallMissingPackages) {
			if (communityPackagesConfig.enabled) {
				this.logger.warn(
					'`--reinstallMissingPackages` is deprecated: Please use the env variable `N8N_REINSTALL_MISSING_PACKAGES` instead',
				);
				communityPackagesConfig.reinstallMissing = true;
			} else {
				this.logger.warn(
					'`--reinstallMissingPackages` was passed, but community packages are disabled',
				);
			}
		}
		if (process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true') {
			this.needsTaskRunner = false;
		}
		await super.init();
		this.activeWorkflowManager = di_1.Container.get(
			active_workflow_manager_1.ActiveWorkflowManager,
		);
		const isMultiMainEnabled =
			config_1.default.getEnv('executions.mode') === 'queue' &&
			this.globalConfig.multiMainSetup.enabled;
		this.instanceSettings.setMultiMainEnabled(isMultiMainEnabled);
		if (isMultiMainEnabled) this.instanceSettings.setMultiMainLicensed(true);
		if (config_1.default.getEnv('executions.mode') === 'regular') {
			this.instanceSettings.markAsLeader();
		} else {
			await this.initOrchestration();
		}
		await this.initLicense();
		if (isMultiMainEnabled && !this.license.isMultiMainLicensed()) {
			throw new feature_not_licensed_error_1.FeatureNotLicensedError(
				constants_1.LICENSE_FEATURES.MULTIPLE_MAIN_INSTANCES,
			);
		}
		di_1.Container.get(wait_tracker_1.WaitTracker).init();
		this.logger.debug('Wait tracker init complete');
		await this.initBinaryDataService();
		this.logger.debug('Binary data service init complete');
		await this.initDataDeduplicationService();
		this.logger.debug('Data deduplication service init complete');
		await this.initExternalHooks();
		this.logger.debug('External hooks init complete');
		this.initWorkflowHistory();
		this.logger.debug('Workflow history init complete');
		if (!isMultiMainEnabled) {
			await this.cleanupTestRunner();
			this.logger.debug('Test runner cleanup complete');
		}
		if (!this.globalConfig.endpoints.disableUi) {
			await this.generateStaticAssets();
		}
		await this.moduleRegistry.initModules();
		if (this.instanceSettings.isMultiMain) {
			di_1.Container.get(multi_main_setup_ee_1.MultiMainSetup).registerEventHandlers();
		}
	}
	async initOrchestration() {
		di_1.Container.get(publisher_service_1.Publisher);
		di_1.Container.get(pubsub_registry_1.PubSubRegistry).init();
		const subscriber = di_1.Container.get(subscriber_service_1.Subscriber);
		await subscriber.subscribe('n8n.commands');
		await subscriber.subscribe('n8n.worker-response');
		if (this.instanceSettings.isMultiMain) {
			await di_1.Container.get(multi_main_setup_ee_1.MultiMainSetup).init();
		} else {
			this.instanceSettings.markAsLeader();
		}
	}
	async run() {
		const { flags } = this;
		const databaseSettings = await di_1.Container.get(db_1.SettingsRepository).findBy({
			loadOnStartup: true,
		});
		databaseSettings.forEach((setting) => {
			config_1.default.set(
				setting.key,
				(0, n8n_workflow_1.jsonParse)(setting.value, { fallbackValue: setting.value }),
			);
		});
		const { type: dbType } = this.globalConfig.database;
		if (dbType === 'sqlite') {
			const shouldRunVacuum = this.globalConfig.database.sqlite.executeVacuumOnStartup;
			if (shouldRunVacuum) {
				await di_1.Container.get(db_1.ExecutionRepository).query('VACUUM;');
			}
		}
		if (flags.tunnel) {
			this.log('\nWaiting for tunnel ...');
			let tunnelSubdomain =
				process.env.N8N_TUNNEL_SUBDOMAIN ?? this.instanceSettings.tunnelSubdomain ?? '';
			if (tunnelSubdomain === '') {
				tunnelSubdomain = (0, n8n_workflow_1.randomString)(24).toLowerCase();
				this.instanceSettings.update({ tunnelSubdomain });
			}
			const { default: localtunnel } = await Promise.resolve().then(() =>
				__importStar(require('@n8n/localtunnel')),
			);
			const { port } = this.globalConfig;
			const webhookTunnel = await localtunnel(port, {
				host: 'https://hooks.n8n.cloud',
				subdomain: tunnelSubdomain,
			});
			process.env.WEBHOOK_URL = `${webhookTunnel.url}/`;
			this.log(`Tunnel URL: ${process.env.WEBHOOK_URL}\n`);
			this.log(
				'IMPORTANT! Do not share with anybody as it would give people access to your n8n instance!',
			);
		}
		await this.server.start();
		di_1.Container.get(executions_pruning_service_1.ExecutionsPruningService).init();
		if (config_1.default.getEnv('executions.mode') === 'regular') {
			await this.runEnqueuedExecutions();
		}
		await this.activeWorkflowManager.init();
		const editorUrl = this.getEditorUrl();
		this.log(`\nEditor is now accessible via:\n${editorUrl}`);
		if (Boolean(process.stdout.isTTY) && process.stdin.setRawMode) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');
			if (flags.open) {
				this.openBrowser();
			}
			this.log('\nPress "o" to open in Browser.');
			process.stdin.on('data', (key) => {
				if (key === 'o') {
					this.openBrowser();
				} else if (key.charCodeAt(0) === 3) {
					void this.onTerminationSignal('SIGINT')();
				} else {
					if (key.charCodeAt(0) === 13) {
						process.stdout.write('\n');
					} else {
						process.stdout.write(key);
					}
				}
			});
		}
	}
	async catch(error) {
		if (error.stack) this.logger.error(error.stack);
		await this.exitWithCrash('Exiting due to an error.', error);
	}
	async runEnqueuedExecutions() {
		const executions = await di_1.Container.get(
			execution_service_1.ExecutionService,
		).findAllEnqueuedExecutions();
		if (executions.length === 0) return;
		this.logger.debug('[Startup] Found enqueued executions to run', {
			executionIds: executions.map((e) => e.id),
		});
		const ownershipService = di_1.Container.get(ownership_service_1.OwnershipService);
		const workflowRunner = di_1.Container.get(workflow_runner_1.WorkflowRunner);
		for (const execution of executions) {
			const project = await ownershipService.getWorkflowProjectCached(execution.workflowId);
			const data = {
				executionMode: execution.mode,
				executionData: execution.data,
				workflowData: execution.workflowData,
				projectId: project.id,
			};
			di_1.Container.get(event_service_1.EventService).emit('execution-started-during-bootup', {
				executionId: execution.id,
			});
			void workflowRunner.run(data, undefined, false, execution.id);
		}
	}
};
exports.Start = Start;
exports.Start = Start = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'start',
			description: 'Starts n8n. Makes Web-UI available and starts active workflows',
			examples: ['', '--tunnel', '-o', '--tunnel -o'],
			flagsSchema,
		}),
	],
	Start,
);
//# sourceMappingURL=start.js.map
