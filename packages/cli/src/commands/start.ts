/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { LICENSE_FEATURES } from '@n8n/constants';
import { ExecutionRepository, SettingsRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import glob from 'fast-glob';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { jsonParse, randomString, type IWorkflowExecutionDataProcess } from 'n8n-workflow';
import path from 'path';
import replaceStream from 'replacestream';
import { pipeline } from 'stream/promises';
import { z } from 'zod';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { EDITOR_UI_DIST_DIR, N8N_VERSION } from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import { ExecutionService } from '@/executions/execution.service';
import { MultiMainSetup } from '@/scaling/multi-main-setup.ee';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { Server } from '@/server';
import { OwnershipService } from '@/services/ownership.service';
import { ExecutionsPruningService } from '@/services/pruning/executions-pruning.service';
import { UrlService } from '@/services/url.service';
import { WaitTracker } from '@/wait-tracker';
import { WorkflowRunner } from '@/workflow-runner';

import { BaseCommand } from './base-command';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const open = require('open');

const flagsSchema = z.object({
	open: z.boolean().alias('o').describe('opens the UI automatically in browser').optional(),
	tunnel: z
		.boolean()
		.describe(
			'runs the webhooks via a hooks.n8n.cloud tunnel server. Use only for testing and development!',
		)
		.optional(),
});

@Command({
	name: 'start',
	description: 'Starts n8n. Makes Web-UI available and starts active workflows',
	examples: ['', '--tunnel', '-o', '--tunnel -o'],
	flagsSchema,
})
export class Start extends BaseCommand<z.infer<typeof flagsSchema>> {
	protected activeWorkflowManager: ActiveWorkflowManager;

	protected server = Container.get(Server);

	override needsCommunityPackages = true;

	override needsTaskRunner = true;

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
				await Container.get(MultiMainSetup).shutdown();
			}

			if (config.getEnv('executions.mode') === 'queue') {
				Container.get(Publisher).shutdown();
				Container.get(Subscriber).shutdown();
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

	/**
	 * Generates meta tags with base64-encoded configuration values
	 * for REST endpoint path and Sentry config.
	 */
	private generateConfigTags() {
		const frontendSentryConfig = JSON.stringify({
			dsn: this.globalConfig.sentry.frontendDsn,
			environment: process.env.ENVIRONMENT || 'development',
			serverName: process.env.DEPLOYMENT_NAME,
			release: `n8n@${N8N_VERSION}`,
		});
		const b64Encode = (value: string) => Buffer.from(value).toString('base64');

		// Base64 encode the configuration values
		const restEndpointEncoded = b64Encode(this.globalConfig.endpoints.rest);
		const sentryConfigEncoded = b64Encode(frontendSentryConfig);

		const configMetaTags = [
			`<meta name="n8n:config:rest-endpoint" content="${restEndpointEncoded}">`,
			`<meta name="n8n:config:sentry" content="${sentryConfigEncoded}">`,
		].join('');

		return configMetaTags;
	}

	private async generateStaticAssets() {
		// Read the index file and replace the path placeholder
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
		const compileFile = async (fileName: string) => {
			const filePath = path.join(EDITOR_UI_DIST_DIR, fileName);
			if (/(index\.html)|.*\.(js|css)/.test(filePath) && existsSync(filePath)) {
				const destFile = path.join(staticCacheDir, fileName);
				await mkdir(path.dirname(destFile), { recursive: true });
				const streams = [
					createReadStream(filePath, 'utf-8'),
					replaceStream('%CONFIG_TAGS%', this.generateConfigTags(), { ignoreCase: false }),
					replaceStream('/{{BASE_PATH}}/', n8nPath, { ignoreCase: false }),
					replaceStream('/%7B%7BBASE_PATH%7D%7D/', n8nPath, { ignoreCase: false }),
					replaceStream('/%257B%257BBASE_PATH%257D%257D/', n8nPath, { ignoreCase: false }),
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

		const files = await glob('**/*.{css,js}', { cwd: EDITOR_UI_DIST_DIR });
		await Promise.all([compileFile('index.html'), ...files.map(compileFile)]);
	}

	async init() {
		await this.initCrashJournal();

		this.logger.info('Initializing n8n process');
		if (config.getEnv('executions.mode') === 'queue') {
			const scopedLogger = this.logger.scoped('scaling');
			scopedLogger.debug('Starting main instance in scaling mode');
			scopedLogger.debug(`Host ID: ${this.instanceSettings.hostId}`);
		}

		await super.init();

		this.activeWorkflowManager = Container.get(ActiveWorkflowManager);

		const isMultiMainEnabled =
			config.getEnv('executions.mode') === 'queue' && this.globalConfig.multiMainSetup.enabled;

		this.instanceSettings.setMultiMainEnabled(isMultiMainEnabled);

		/**
		 * We temporarily license multi-main to allow it to set instance role,
		 * which is needed by license init. Once the license is initialized,
		 * the actual value will be used for the license check.
		 */
		if (isMultiMainEnabled) this.instanceSettings.setMultiMainLicensed(true);

		if (config.getEnv('executions.mode') === 'regular') {
			this.instanceSettings.markAsLeader();
		} else {
			await this.initOrchestration();
		}

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
			// we instantiate `PrometheusMetricsService` early to register its multi-main event handlers
			if (this.globalConfig.endpoints.metrics.enable) {
				const { PrometheusMetricsService } = await import('@/metrics/prometheus-metrics.service');
				Container.get(PrometheusMetricsService);
			}

			Container.get(MultiMainSetup).registerEventHandlers();
		}
	}

	async initOrchestration() {
		Container.get(Publisher);

		Container.get(PubSubRegistry).init();

		const subscriber = Container.get(Subscriber);
		await subscriber.subscribe('n8n.commands');
		await subscriber.subscribe('n8n.worker-response');

		if (this.instanceSettings.isMultiMain) {
			await Container.get(MultiMainSetup).init();
		} else {
			this.instanceSettings.markAsLeader();
		}
	}

	async run() {
		const { flags } = this;

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

		if (this.globalConfig.database.isLegacySqlite) {
			// Employ lazy loading to avoid unnecessary imports in the CLI
			// and to ensure that the legacy recovery service is only used when needed.
			const { LegacySqliteExecutionRecoveryService } = await import(
				'@/executions/legacy-sqlite-execution-recovery.service'
			);
			await Container.get(LegacySqliteExecutionRecoveryService).cleanupWorkflowExecutions();
		}

		await this.server.start();

		Container.get(ExecutionsPruningService).init();

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
