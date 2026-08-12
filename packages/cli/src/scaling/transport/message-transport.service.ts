import { Service } from '@n8n/di';

import { IpcMessageTransport } from './ipc-message-transport';
import type { MessageTransport } from './message-transport.interface';

/**
 * Swappable-provider proxy, mirroring `LockService`/`InstanceStorage`: defaults to
 * the non-Redis (`IpcMessageTransport`) implementation, swapped to
 * `RedisMessageTransport` at startup when Redis is configured. `Publisher` and
 * `Subscriber` depend on this, never on a concrete implementation.
 */
@Service()
export class MessageTransportService implements MessageTransport {
	private provider: MessageTransport;

	constructor(ipcMessageTransport: IpcMessageTransport) {
		this.provider = ipcMessageTransport;
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
