/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Container } from 'typedi';
import path from 'path';
import { mkdir } from 'fs/promises';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { flags } from '@oclif/command';
import stream from 'stream';
import replaceStream from 'replacestream';
import { promisify } from 'util';
import glob from 'fast-glob';

import { sleep, jsonParse } from 'n8n-workflow';
import config from '@/config';

import { ActiveExecutions } from '@/ActiveExecutions';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { Server } from '@/Server';
import { EDITOR_UI_DIST_DIR, LICENSE_FEATURES } from '@/constants';
import { eventBus } from '@/eventbus';
import { BaseCommand } from './BaseCommand';
import { InternalHooks } from '@/InternalHooks';
import { License } from '@/License';
import type { IConfig } from '@oclif/config';
import { SingleMainSetup } from '@/services/orchestration/main/SingleMainSetup';
import { OrchestrationHandlerMainService } from '@/services/orchestration/main/orchestration.handler.main.service';
import { PruningService } from '@/services/pruning.service';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';
import { UrlService } from '@/services/url.service';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { WaitTracker } from '@/WaitTracker';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const open = require('open');
const pipeline = promisify(stream.pipeline);

export class Start extends BaseCommand {
	static description = 'Starts n8n. Makes Web-UI available and starts active workflows';

	static examples = [
		'$ n8n start',
		'$ n8n start --tunnel',
		'$ n8n start -o',
		'$ n8n start --tunnel -o',
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		open: flags.boolean({
			char: 'o',
			description: 'opens the UI automatically in browser',
		}),
		tunnel: flags.boolean({
			description:
				'runs the webhooks via a hooks.n8n.cloud tunnel server. Use only for testing and development!',
		}),
		reinstallMissingPackages: flags.boolean({
			description:
				'Attempts to self heal n8n if packages with nodes are missing. Might drastically increase startup times.',
		}),
	};

	protected activeWorkflowRunner: ActiveWorkflowRunner;

	protected server = Container.get(Server);

	private pruningService: PruningService;

	constructor(argv: string[], cmdConfig: IConfig) {
		super(argv, cmdConfig);
		this.setInstanceType('main');
		this.setInstanceQueueModeId();
	}

	/**
	 * Opens the UI in browser
	 */
	private openBrowser() {
		const editorUrl = Container.get(UrlService).baseUrl;

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		open(editorUrl, { wait: true }).catch((error: Error) => {
			console.log(
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
			this.activeWorkflowRunner.removeAllQueuedWorkflowActivations();

			Container.get(WaitTracker).shutdown();

			await this.externalHooks?.run('n8n.stop', []);

			if (Container.get(MultiMainSetup).isEnabled) {
				await this.activeWorkflowRunner.removeAllTriggerAndPollerBasedWorkflows();

				await Container.get(MultiMainSetup).shutdown();
			}

			await Container.get(InternalHooks).onN8nStop();

			// Wait for active workflow executions to finish
			const activeExecutionsInstance = Container.get(ActiveExecutions);
			let executingWorkflows = activeExecutionsInstance.getActiveExecutions();

			let count = 0;
			while (executingWorkflows.length !== 0) {
				if (count++ % 4 === 0) {
					console.log(`Waiting for ${executingWorkflows.length} active executions to finish...`);

					executingWorkflows.map((execution) => {
						console.log(` - Execution ID ${execution.id}, workflow ID: ${execution.workflowId}`);
					});
				}

				await sleep(500);
				executingWorkflows = activeExecutionsInstance.getActiveExecutions();
			}

			// Finally shut down Event Bus
			await eventBus.close();
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
	}

	private async generateStaticAssets() {
		// Read the index file and replace the path placeholder
		const n8nPath = config.getEnv('path');
		const restEndpoint = config.getEnv('endpoints.rest');
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
					replaceStream('/static/', n8nPath + 'static/', { ignoreCase: false }),
				];
				if (filePath.endsWith('index.html')) {
					streams.push(
						replaceStream('{{REST_ENDPOINT}}', restEndpoint, { ignoreCase: false }),
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
			this.logger.debug('Main Instance running in queue mode');
			this.logger.debug(`Queue mode id: ${this.queueModeId}`);
		}

		await super.init();
		this.activeWorkflowRunner = Container.get(ActiveWorkflowRunner);

		await this.initLicense();

		await this.initOrchestration();
		this.logger.debug('Orchestration init complete');
		await this.initBinaryDataService();
		this.logger.debug('Binary data service init complete');
		await this.initExternalHooks();
		this.logger.debug('External hooks init complete');
		await this.initExternalSecrets();
		this.logger.debug('External secrets init complete');
		this.initWorkflowHistory();
		this.logger.debug('Workflow history init complete');

		if (!config.getEnv('endpoints.disableUi')) {
			await this.generateStaticAssets();
		}
	}

	async initOrchestration() {
		if (config.getEnv('executions.mode') !== 'queue') return;

		// queue mode in single-main scenario

		if (!config.getEnv('multiMainSetup.enabled')) {
			await Container.get(SingleMainSetup).init();
			await Container.get(OrchestrationHandlerMainService).init();
			return;
		}

		// queue mode in multi-main scenario

		if (!Container.get(License).isMultipleMainInstancesLicensed()) {
			throw new FeatureNotLicensedError(LICENSE_FEATURES.MULTIPLE_MAIN_INSTANCES);
		}

		await Container.get(OrchestrationHandlerMainService).init();

		const multiMainSetup = Container.get(MultiMainSetup);

		await multiMainSetup.init();

		multiMainSetup.on('leadershipChange', async () => {
			if (multiMainSetup.isLeader) {
				this.logger.debug('[Leadership change] Clearing all activation errors...');

				await this.activeWorkflowRunner.clearAllActivationErrors();

				this.logger.debug('[Leadership change] Adding all trigger- and poller-based workflows...');

				await this.activeWorkflowRunner.addAllTriggerAndPollerBasedWorkflows();
			} else {
				this.logger.debug(
					'[Leadership change] Removing all trigger- and poller-based workflows...',
				);

				await this.activeWorkflowRunner.removeAllTriggerAndPollerBasedWorkflows();
			}
		});
	}

	async run() {
		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(Start);

		// Load settings from database and set them to config.
		const databaseSettings = await Container.get(SettingsRepository).findBy({
			loadOnStartup: true,
		});
		databaseSettings.forEach((setting) => {
			config.set(setting.key, jsonParse(setting.value, { fallbackValue: setting.value }));
		});

		const areCommunityPackagesEnabled = config.getEnv('nodes.communityPackages.enabled');

		if (areCommunityPackagesEnabled) {
			const { CommunityPackagesService } = await import('@/services/communityPackages.service');
			await Container.get(CommunityPackagesService).setMissingPackages({
				reinstallMissingPackages: flags.reinstallMissingPackages,
			});
		}

		const dbType = config.getEnv('database.type');
		if (dbType === 'sqlite') {
			const shouldRunVacuum = config.getEnv('database.sqlite.executeVacuumOnStartup');
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
				const availableCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
				tunnelSubdomain = Array.from({ length: 24 })
					.map(() =>
						availableCharacters.charAt(Math.floor(Math.random() * availableCharacters.length)),
					)
					.join('');

				this.instanceSettings.update({ tunnelSubdomain });
			}

			const { default: localtunnel } = await import('@n8n/localtunnel');
			const port = config.getEnv('port');

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

		await this.initPruning();

		// Start to get active workflows and run their triggers
		await this.activeWorkflowRunner.init();

		const editorUrl = Container.get(UrlService).baseUrl;
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
					void this.stopProcess();
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

	async initPruning() {
		this.pruningService = Container.get(PruningService);

		if (this.pruningService.isPruningEnabled()) {
			this.pruningService.startPruning();
		}

		if (config.getEnv('executions.mode') === 'queue' && config.getEnv('multiMainSetup.enabled')) {
			const multiMainSetup = Container.get(MultiMainSetup);

			await multiMainSetup.init();

			multiMainSetup.on('leadershipChange', async () => {
				if (multiMainSetup.isLeader) {
					if (this.pruningService.isPruningEnabled()) {
						this.pruningService.startPruning();
					}
				} else {
					if (this.pruningService.isPruningEnabled()) {
						this.pruningService.stopPruning();
					}
				}
			});
		}
	}

	async catch(error: Error) {
		console.log(error.stack);
		await this.exitWithCrash('Exiting due to an error.', error);
	}
}
