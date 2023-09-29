import Container, { Service } from 'typedi';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
} from '../../redis/RedisServiceHelper';
import { handleWorkerResponseMessageMain } from './handleWorkerResponseMessageMain';
import { handleCommandMessageMain } from './handleCommandMessageMain';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { OrchestrationHandlerService } from '../../orchestration.handler.base.service';

@Service()
export class OrchestrationHandlerMainService extends OrchestrationHandlerService {
	async initSubscriber() {
		this.redisSubscriber = await this.redisService.getPubSubSubscriber();

		await this.redisSubscriber.subscribeToCommandChannel();
		await this.redisSubscriber.subscribeToWorkerResponseChannel();
		await this.redisSubscriber.subscribeToEventLog();

		this.redisSubscriber.addMessageHandler(
			'OrchestrationMessageReceiver',
			async (channel: string, messageString: string) => {
				if (channel === WORKER_RESPONSE_REDIS_CHANNEL) {
					await handleWorkerResponseMessageMain(messageString);
				} else if (channel === COMMAND_REDIS_CHANNEL) {
					await handleCommandMessageMain(messageString);
				} else if (channel === EVENT_BUS_REDIS_CHANNEL) {
					await Container.get(MessageEventBus).handleRedisEventBusMessage(messageString);
				}
			},
		);
	}
}
