import { PubSubMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { InstanceSettings, Logger } from 'n8n-core';

import { PubSubEventBus } from './pubsub.eventbus';

@Service()
export class PubSubHandler {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly pubSubMetadata: PubSubMetadata,
		private readonly pubsubEventBus: PubSubEventBus,
	) {
		this.logger = this.logger.scoped('pubsub');
	}

	init() {
		const { instanceSettings, pubSubMetadata } = this;
		const handlers = pubSubMetadata.getHandlers();
		for (const { eventHandlerClass, methodName, eventName, filter } of handlers) {
			const handlerClass = Container.get(eventHandlerClass);
			if (!filter?.instanceType || filter.instanceType === instanceSettings.instanceType) {
				this.logger.info(
					`Registered a "${eventName}" event handler on ${eventHandlerClass.name}#${methodName}`,
				);
				this.pubsubEventBus.on(eventName, async () => {
					// Since the instance role can change, this check needs to be in the event listener
					if (!filter?.instanceRole || filter.instanceRole === instanceSettings.instanceRole) {
						this.logger.info(
							`Triggered ${eventHandlerClass.name}#${methodName} on event "${eventName}"`,
						);
						await handlerClass[methodName]();
					} else {
						this.logger.info(`Skipped event "${eventName}" because instance-role did not match`, {
							current: instanceSettings.instanceRole,
							expected: filter.instanceRole,
						});
					}
				});
			}
		}
	}
}
