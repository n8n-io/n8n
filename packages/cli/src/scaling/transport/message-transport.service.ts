import { Service } from '@n8n/di';

import type { MessageTransport } from './message-transport.interface';
import { NoopMessageTransport } from './noop-message-transport';

/**
 * Swappable-provider proxy, mirroring `LockService`/`InstanceStorage`: defaults
 * to an inert `NoopMessageTransport`, swapped at startup to `RedisMessageTransport`
 * or `HypervisorMessageTransport` based on `TransportModeService.resolve('pubsub')`
 * (see `base-command.ts`). `Publisher` and `Subscriber` depend on this, never on
 * a concrete implementation.
 */
@Service()
export class MessageTransportService implements MessageTransport {
	private provider: MessageTransport;

	constructor(noopMessageTransport: NoopMessageTransport) {
		this.provider = noopMessageTransport;
	}

	setProvider(provider: MessageTransport) {
		this.provider = provider;
	}

	async publish(channel: string, message: string) {
		await this.provider.publish(channel, message);
	}

	async subscribe(channel: string, onMessage: (message: string, channel: string) => void) {
		await this.provider.subscribe(channel, onMessage);
	}

	async shutdown() {
		await this.provider.shutdown();
	}
}
