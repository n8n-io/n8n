import { flags } from '@oclif/command';
import { LoggerProxy, sleep } from 'n8n-workflow';
import config from '@/config';
import { ActiveExecutions } from '@/ActiveExecutions';
import { WebhookServer } from '@/WebhookServer';
import { Queue } from '@/Queue';
import { BaseCommand } from './BaseCommand';
import { Container } from 'typedi';

export class Webhook extends BaseCommand {
	static description = 'Starts n8n webhook process. Intercepts only production URLs.';

	static examples = ['$ n8n webhook'];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	protected server = new WebhookServer();

	/**
	 * Stops n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	async stopProcess() {
		LoggerProxy.info('\nStopping n8n...');

		try {
			await this.externalHooks.run('n8n.stop', []);

			setTimeout(async () => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				await this.exitSuccessFully();
			}, 30000);

			// Wait for active workflow executions to finish
			const activeExecutionsInstance = Container.get(ActiveExecutions);
			let executingWorkflows = activeExecutionsInstance.getActiveExecutions();

			let count = 0;
			while (executingWorkflows.length !== 0) {
				if (count++ % 4 === 0) {
					LoggerProxy.info(
						`Waiting for ${executingWorkflows.length} active executions to finish...`,
					);
				}
				// eslint-disable-next-line no-await-in-loop
				await sleep(500);
				executingWorkflows = activeExecutionsInstance.getActiveExecutions();
			}
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
	}

	async init() {
		if (config.getEnv('executions.mode') !== 'queue') {
			/**
			 * It is technically possible to run without queues but
			 * there are 2 known bugs when running in this mode:
			 * - Executions list will be problematic as the main process
			 * is not aware of current executions in the webhook processes
			 * and therefore will display all current executions as error
			 * as it is unable to determine if it is still running or crashed
			 * - You cannot stop currently executing jobs from webhook processes
			 * when running without queues as the main process cannot talk to
			 * the webhook processes to communicate workflow execution interruption.
			 */

			this.error('Webhook processes can only run with execution mode as queue.');
		}

		await this.initCrashJournal();
		await super.init();

		await this.initBinaryManager();
		await this.initExternalHooks();
	}

	async run() {
		await Container.get(Queue).init();
		await this.server.start();
		this.logger.info('Webhook listener waiting for requests.');

		// Make sure that the process does not close
		await new Promise(() => {});
	}

	async catch(error: Error) {
		await this.exitWithCrash('Exiting due to an error.', error);
	}
}
