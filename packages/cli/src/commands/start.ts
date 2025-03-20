/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Container } from '@n8n/di';
import { Flags } from '@oclif/core';
import glob from 'fast-glob';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { jsonParse, randomString, type IWorkflowExecutionDataProcess } from 'n8n-workflow';
import path from 'path';
import replaceStream from 'replacestream';
import { pipeline } from 'stream/promises';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { EDITOR_UI_DIST_DIR, LICENSE_FEATURES } from '@/constants';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import { ExecutionService } from '@/executions/execution.service';
import { PubSubHandler } from '@/scaling/pubsub/pubsub-handler';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { Server } from '@/server';
import { OrchestrationService } from '@/services/orchestration.service';
import { OwnershipService } from '@/services/ownership.service';
import { PruningService } from '@/services/pruning/pruning.service';
import { UrlService } from '@/services/url.service';
import { WaitTracker } from '@/wait-tracker';
import { WorkflowRunner } from '@/workflow-runner';

import { BaseCommand } from './base-command';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const open = require('open');

export class Start extends BaseCommand {
	static description = 'Starts n8n. Makes Web-UI available and starts active workflows';

	static examples = [
		'$ n8n start',
		'$ n8n start --tunnel',
		'$ n8n start -o',
		'$ n8n start --tunnel -o',
	];

	static flags = {
		help: Flags.help({ char: 'h' }),
		open: Flags.boolean({
			char: 'o',
			description: 'opens the UI automatically in browser',
		}),
		tunnel: Flags.boolean({
			description:
				'runs the webhooks via a hooks.n8n.cloud tunnel server. Use only for testing and development!',
		}),
		reinstallMissingPackages: Flags.boolean({
			description:
				'Attempts to self heal n8n if packages with nodes are missing. Might drastically increase startup times.',
		}),
	};

	protected activeWorkflowManager: ActiveWorkflowManager;

	protected server = Container.get(Server);

	override needsCommunityPackages = true;

	private getEditorUrl = () => Container.get(UrlService).getInstanceBaseUrl();

	/**
	 * Opens the UI in browser
	 */
	private openBrowser() {
		const editorUrl = this.getEditorUrl();

		open(editorUrl, { wait: true }).catch(() => {
			this.logger.info(
				`\nWas not able to open URL in browser. Please open manually by visiting:\n${editorUrl}\n`,
			);
		});
	}

	/**
	 * Stop n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	async stopProcess() {
		this.logger.info('\nStopping n8n...');

		try {
			// Stop with trying to activate workflows that could not be activated
			this.activeWorkflowManager.removeAllQueuedWorkflowActivations();

			Container.get(WaitTracker).stopTracking();

			await this.externalHooks?.run('n8n.stop');

			await this.activeWorkflowManager.removeAllTriggerAndPollerBasedWorkflows();

			if (this.instanceSettings.isMultiMain) {
				await Container.get(OrchestrationService).shutdown();
			}

			Container.get(EventService).emit('instance-stopped');

			await Container.get(ActiveExecutions).shutdown();

			// Finally shut down Event Bus
			await Container.get(MessageEventBus).close();
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
	}

	private async generateStaticAssets() {
		// Read the index file and replace the path placeholder
		const n8nPath = this.globalConfig.path;
		const hooksUrls = config.getEnv('externalFrontendHooksUrls');

		let scriptsString = '';
		if (hooksUrls) {
			scriptsString = hooksUrls.split(';').reduce((acc, curr) => {
				return `${acc}<script src="${curr}"></script>`;
			}, '');
		}

		const closingTitleTag = '</title>';
		const { staticCacheDir } = this.instanceSettings;
		const compileFile = async (fileName: string) => {
			const filePath = path.join(EDITOR_UI_DIST_DIR, fileName);
			if (/(index\.html)|.*\.(js|css)/.test(filePath) && existsSync(filePath)) {
				const destFile = path.join(staticCacheDir, fileName);
				await mkdir(path.dirname(destFile), { recursive: true });
				const streams = [
					createReadStream(filePath, 'utf-8'),
					replaceStream('/{{BASE_PATH}}/', n8nPath, { ignoreCase: false }),
					replaceStream('/%7B%7BBASE_PATH%7D%7D/', n8nPath, { ignoreCase: false }),
					replaceStream('/%257B%257BBASE_PATH%257D%257D/', n8nPath, { ignoreCase: false }),
					replaceStream('/static/', n8nPath + 'static/', { ignoreCase: false }),
				];
				if (filePath.endsWith('index.html')) {
					streams.push(
						replaceStream('{{REST_ENDPOINT}}', this.globalConfig.endpoints.rest, {
							ignoreCase: false,
						}),
						replaceStream(closingTitleTag, closingTitleTag + scriptsString, {
							ignoreCase: false,
						}),
					);
				}
				streams.push(createWriteStream(destFile, 'utf-8'));
				return await pipeline(streams);
			}
		};

		await compileFile('index.html');
		const files = await glob('**/*.{css,js}', { cwd: EDITOR_UI_DIST_DIR });
		await Promise.all(files.map(compileFile));
	}

	async init() {
		await this.initCrashJournal();

		this.logger.info('Initializing n8n process');
		if (config.getEnv('executions.mode') === 'queue') {
			const scopedLogger = this.logger.scoped('scaling');
			scopedLogger.debug('Starting main instance in scaling mode');
			scopedLogger.debug(`Host ID: ${this.instanceSettings.hostId}`);
		}

		const { flags } = await this.parse(Start);
		const { communityPackages } = this.globalConfig.nodes;
		// cli flag overrides the config env variable
		if (flags.reinstallMissingPackages) {
			if (communityPackages.enabled) {
				this.logger.warn(
					'`--reinstallMissingPackages` is deprecated: Please use the env variable `N8N_REINSTALL_MISSING_PACKAGES` instead',
				);
				communityPackages.reinstallMissing = true;
			} else {
				this.logger.warn(
					'`--reinstallMissingPackages` was passed, but community packages are disabled',
				);
			}
		}

		await super.init();
		this.activeWorkflowManager = Container.get(ActiveWorkflowManager);

		const isMultiMainEnabled =
			config.getEnv('executions.mode') === 'queue' && this.globalConfig.multiMainSetup.enabled;

		this.instanceSettings.setMultiMainEnabled(isMultiMainEnabled);

		/**
		 * We temporarily license multi-main to allow orchestration to set instance
		 * role, which is needed by license init. Once the license is initialized,
		 * the actual value will be used for the license check.
		 */
		if (isMultiMainEnabled) this.instanceSettings.setMultiMainLicensed(true);

		await this.initOrchestration();
		await this.initLicense();

		if (isMultiMainEnabled && !this.license.isMultiMainLicensed()) {
			throw new FeatureNotLicensedError(LICENSE_FEATURES.MULTIPLE_MAIN_INSTANCES);
		}

		Container.get(WaitTracker).init();
		this.logger.debug('Wait tracker init complete');
		await this.initBinaryDataService();
		this.logger.debug('Binary data service init complete');
		await this.initDataDeduplicationService();
		this.logger.debug('Data deduplication service init complete');
		await this.initExternalHooks();
		this.logger.debug('External hooks init complete');
		await this.initExternalSecrets();
		this.logger.debug('External secrets init complete');
		this.initWorkflowHistory();
		this.logger.debug('Workflow history init complete');

		if (!isMultiMainEnabled) {
			await this.cleanupTestRunner();
			this.logger.debug('Test runner cleanup complete');
		}

		if (!this.globalConfig.endpoints.disableUi) {
			await this.generateStaticAssets();
		}

		const { taskRunners: taskRunnerConfig } = this.globalConfig;
		if (taskRunnerConfig.enabled) {
			const { TaskRunnerModule } = await import('@/task-runners/task-runner-module');
			const taskRunnerModule = Container.get(TaskRunnerModule);
			await taskRunnerModule.start();
		}
	}

	async initOrchestration() {
		if (config.getEnv('executions.mode') === 'regular') {
			this.instanceSettings.markAsLeader();
			return;
		}

		const orchestrationService = Container.get(OrchestrationService);

		await orchestrationService.init();

		Container.get(PubSubHandler).init();

		const subscriber = Container.get(Subscriber);
		await subscriber.subscribe('n8n.commands');
		await subscriber.subscribe('n8n.worker-response');

		this.logger.scoped(['scaling', 'pubsub']).debug('Pubsub setup completed');

		if (this.instanceSettings.isSingleMain) return;

		orchestrationService.multiMainSetup
			.on('leader-stepdown', async () => {
				this.license.disableAutoRenewals();
				await this.activeWorkflowManager.removeAllTriggerAndPollerBasedWorkflows();
			})
			.on('leader-takeover', async () => {
				this.license.enableAutoRenewals();
				await this.activeWorkflowManager.addAllTriggerAndPollerBasedWorkflows();
			});
	}

	async run() {
		const { flags } = await this.parse(Start);

		// Load settings from database and set them to config.
		const databaseSettings = await Container.get(SettingsRepository).findBy({
			loadOnStartup: true,
		});
		databaseSettings.forEach((setting) => {
			config.set(setting.key, jsonParse(setting.value, { fallbackValue: setting.value }));
		});

		const { type: dbType } = this.globalConfig.database;
		if (dbType === 'sqlite') {
			const shouldRunVacuum = this.globalConfig.database.sqlite.executeVacuumOnStartup;
			if (shouldRunVacuum) {
				await Container.get(ExecutionRepository).query('VACUUM;');
			}
		}

		if (flags.tunnel) {
			this.log('\nWaiting for tunnel ...');

			let tunnelSubdomain =
				process.env.N8N_TUNNEL_SUBDOMAIN ?? this.instanceSettings.tunnelSubdomain ?? '';

			if (tunnelSubdomain === '') {
				// When no tunnel subdomain did exist yet create a new random one
				tunnelSubdomain = randomString(24).toLowerCase();

				this.instanceSettings.update({ tunnelSubdomain });
			}

			const { default: localtunnel } = await import('@n8n/localtunnel');
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

		Container.get(PruningService).init();

		if (config.getEnv('executions.mode') === 'regular') {
			await this.runEnqueuedExecutions();
		}

		// Start to get active workflows and run their triggers
		await this.activeWorkflowManager.init();

		const editorUrl = this.getEditorUrl();

		this.log(`\nEditor is now accessible via:\n${editorUrl}`);

		// Allow to open n8n editor by pressing "o"
		if (Boolean(process.stdout.isTTY) && process.stdin.setRawMode) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');

			if (flags.open) {
				this.openBrowser();
			}
			this.log('\nPress "o" to open in Browser.');
			process.stdin.on('data', (key: string) => {
				if (key === 'o') {
					this.openBrowser();
				} else if (key.charCodeAt(0) === 3) {
					// Ctrl + c got pressed
					void this.onTerminationSignal('SIGINT')();
				} else {
					// When anything else got pressed, record it and send it on enter into the child process

					if (key.charCodeAt(0) === 13) {
						// send to child process and print in terminal
						process.stdout.write('\n');
					} else {
						// record it and write into terminal
						process.stdout.write(key);
					}
				}
			});
		}
	}

	async catch(error: Error) {
		if (error.stack) this.logger.error(error.stack);
		await this.exitWithCrash('Exiting due to an error.', error);
	}

	/**
	 * During startup, we may find executions that had been enqueued at the time of shutdown.
	 *
	 * If so, start running any such executions concurrently up to the concurrency limit, and
	 * enqueue any remaining ones until we have spare concurrency capacity again.
	 */
	private async runEnqueuedExecutions() {
		const executions = await Container.get(ExecutionService).findAllEnqueuedExecutions();

		if (executions.length === 0) return;

		this.logger.debug('[Startup] Found enqueued executions to run', {
			executionIds: executions.map((e) => e.id),
		});

		const ownershipService = Container.get(OwnershipService);
		const workflowRunner = Container.get(WorkflowRunner);

		for (const execution of executions) {
			const project = await ownershipService.getWorkflowProjectCached(execution.workflowId);

			const data: IWorkflowExecutionDataProcess = {
				executionMode: execution.mode,
				executionData: execution.data,
				workflowData: execution.workflowData,
				projectId: project.id,
			};

			Container.get(EventService).emit('execution-started-during-bootup', {
				executionId: execution.id,
			});

			// do not block - each execution either runs concurrently or is queued
			void workflowRunner.run(data, undefined, false, execution.id);
		}
	}
}
