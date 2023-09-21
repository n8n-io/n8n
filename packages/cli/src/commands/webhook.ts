import { flags } from '@oclif/command';
import { Container } from 'typedi';
import { LoggerProxy, sleep } from 'n8n-workflow';
import { ActiveExecutions } from '@/ActiveExecutions';
import { WebhookServer } from '@/WebhookServer';
import { Queue } from '@/Queue';
import { ServerCommand } from './ServerCommand';

export class Webhook extends ServerCommand {
	readonly instanceType = 'webhook';

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

				await sleep(500);
				executingWorkflows = activeExecutionsInstance.getActiveExecutions();
			}
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
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
