/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Container } from 'typedi';
import { UserSettings } from 'n8n-core';

import { ErrorReporterProxy as ErrorReporter, LoggerProxy, sleep, jsonParse } from 'n8n-workflow';

import config from '@/config';

import { ActiveExecutions } from '@/ActiveExecutions';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import { eventBus } from '@/eventbus';
import { BaseCommand } from './BaseCommand';
import { InternalHooks } from '@/InternalHooks';
import { License } from '@/License';
import express from 'express';
import compression from 'compression';
import { ServiceUnavailableError, sendErrorResponse, sendSuccessResponse } from '@/ResponseHelper';
import { Queue } from '@/Queue';

export class Triggers extends BaseCommand {
	static description = 'Runs the n8n trigger manager';

	static examples = ['$ n8n triggers'];

	protected activeWorkflowRunner: ActiveWorkflowRunner;

	protected app: express.Application;

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

			setTimeout(async () => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				console.log('process exited after 30s');
				await this.exitSuccessFully();
			}, 30000);

			await Container.get(InternalHooks).onN8nStop();

			// Wait for active workflow executions to finish
			const activeExecutionsInstance = Container.get(ActiveExecutions);
			let executingWorkflows = activeExecutionsInstance.getActiveExecutions();

			let count = 0;
			while (executingWorkflows.length !== 0) {
				if (count++ % 4 === 0) {
					console.log(`Waiting for ${executingWorkflows.length} active executions to finish...`);
					// eslint-disable-next-line array-callback-return
					executingWorkflows.map((execution) => {
						console.log(` - Execution ID ${execution.id}, workflow ID: ${execution.workflowId}`);
					});
				}
				// eslint-disable-next-line no-await-in-loop
				await sleep(500);
				executingWorkflows = activeExecutionsInstance.getActiveExecutions();
			}

			//finally shut down Event Bus
			await eventBus.close();
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
	}

	async initLicense(): Promise<void> {
		const license = Container.get(License);
		await license.init(this.instanceId);

		const activationKey = config.getEnv('license.activationKey');
		if (activationKey) {
			try {
				await license.activate(activationKey);
			} catch (e) {
				LoggerProxy.error('Could not activate license', e as Error);
			}
		}
	}

	async setUpServer() {
		this.app = express();
		this.app.use(compression());
		this.app.use((req, res, next) => {
			if (!Db.isInitialized) {
				sendErrorResponse(res, new ServiceUnavailableError('Database is not ready!'));
			} else next();
		});

		// Does very basic health check
		this.app.get('/healthz', async (req, res) => {
			this.logger.debug('Health check started!');

			const connection = Db.getConnection();

			try {
				if (!connection.isInitialized) {
					// Connection is not active
					throw new ServiceUnavailableError('No active database connection!');
				}
				// DB ping
				await connection.query('SELECT 1');
			} catch (error) {
				ErrorReporter.error(error);
				this.logger.error('No Database connection!');
				return sendErrorResponse(res, new ServiceUnavailableError('No Database connection!'));
			}

			this.logger.debug('Health check completed successfully!');
			sendSuccessResponse(res, { status: 'ok' }, true, 200);
		});

		this.app.get('/reload', async (req, res) => {
			if (req.query.action === 'activate') {
				await this.activeWorkflowRunner.add(req.query.workflowId as string, 'activate');
			} else {
				await this.activeWorkflowRunner.remove(req.query.workflowId as string);
			}
			console.log('received reload event', req.query);
			return sendSuccessResponse(res, { status: 'ok' }, true, 200);
		});

		const http = await import('http');
		const server = http.createServer(this.app);

		const ADDRESS = config.getEnv('listen_address');

		await new Promise<void>((resolve) => server.listen(8888, ADDRESS, () => resolve()));

		// TODO: set up redis checks.
		// if (config.getEnv('executions.mode') === 'queue') {
		// 	await this.setupRedisChecks();
		// }
	}

	async init() {
		await this.initCrashJournal();
		await super.init();

		if (config.getEnv('executions.mode') !== 'queue') {
			await this.exitWithCrash(
				'Exiting due to an error.',
				new Error('Must be running in queue mode'),
			);
		}
		await Container.get(Queue).init();

		this.logger.info('Initializing n8n process');
		this.activeWorkflowRunner = Container.get(ActiveWorkflowRunner);

		await this.initLicense();
		await this.initBinaryManager();
		await this.initExternalHooks();
		await this.setUpServer();
	}

	async run() {
		// eslint-disable-next-line @typescript-eslint/no-shadow
		await UserSettings.getEncryptionKey();

		// Load settings from database and set them to config.
		const databaseSettings = await Db.collections.Settings.findBy({ loadOnStartup: true });
		databaseSettings.forEach((setting) => {
			config.set(setting.key, jsonParse(setting.value, { fallbackValue: setting.value }));
		});

		// Start to get active workflows and run their triggers
		await this.activeWorkflowRunner.init({ skipWebhookTriggers: true });

		let promiseResolve: (value: unknown) => void;

		const exitPromise = new Promise((res) => {
			promiseResolve = res;
		});

		process.on('SIGTERM', () => {
			promiseResolve(1);
		});

		await exitPromise;
	}

	async catch(error: Error) {
		console.log(error.stack);
		await this.exitWithCrash('Exiting due to an error.', error);
	}
}
