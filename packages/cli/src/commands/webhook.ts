import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { WebhookServer } from '@/webhooks/webhook-server';
import { DeprecationService } from '@/deprecation/deprecation.service';

import { BaseCommand } from './base-command';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';

@Command({
	name: 'webhook',
	description: 'Starts n8n webhook process. Intercepts only production URLs.',
})
export class Webhook extends BaseCommand {
	protected server = Container.get(WebhookServer);

	override needsCommunityPackages = true;

	/**
	 * Stops n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	async stopProcess() {
		this.logger.info('\nStopping n8n...');

		try {
			await this.externalHooks?.run('n8n.stop');

			await Container.get(ActiveExecutions).shutdown();
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
		this.logger.debug('Crash journal initialized');

		this.logger.info('Starting n8n webhook process...');
		this.logger.debug(`Host ID: ${this.instanceSettings.hostId}`);

		await super.init();
		Container.get(DeprecationService).warn();

		await this.initLicense();
		this.logger.debug('License init complete');
		await this.initOrchestration();
		this.logger.debug('Orchestration init complete');
		await this.initBinaryDataService();
		this.logger.debug('Binary data service init complete');
		await this.initDataDeduplicationService();
		this.logger.debug('Data deduplication service init complete');
		await this.initExternalHooks();
		this.logger.debug('External hooks init complete');

		await Container.get(MessageEventBus).initialize({
			webhookProcessorId: this.instanceSettings.hostId,
		});
		Container.get(LogStreamingEventRelay).init();

		await this.moduleRegistry.initModules();
	}

	async run() {
		const { ScalingService } = await import('@/scaling/scaling.service');
		await Container.get(ScalingService).setupQueue();
		await this.server.start();
		this.logger.info('Webhook listener waiting for requests.');

		// Make sure that the process does not close
		await new Promise(() => {});
	}

	async catch(error: Error) {
		await this.exitWithCrash('Exiting due to an error.', error);
	}

	async initOrchestration() {
		Container.get(Publisher);

		Container.get(PubSubRegistry).init();
		await Container.get(Subscriber).subscribe('n8n.commands');
	}
}
