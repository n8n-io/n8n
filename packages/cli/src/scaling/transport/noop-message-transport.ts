import { Service } from '@n8n/di';

import type { MessageTransport } from './message-transport.interface';

/**
 * Inert `MessageTransport` default: `Publisher`/`Subscriber` only ever call
 * `publish`/`subscribe` in queue mode, and outside a hypervisor `TransportConfig
 * .pubsub` defaults to `redis` - so this default is only ever actually reached
 * when nothing is going to call it. Kept explicit (rather than defaulting to
 * `HypervisorMessageTransport`, which happens to no-op outside a forked process
 * since `process.send` is `undefined` there) so the "does nothing" behavior is
 * a stated property of this class, not an incidental one of a different class.
 */
@Service()
export class NoopMessageTransport implements MessageTransport {
	async publish(_channel: string, _message: string) {}

	async subscribe(_channel: string, _onMessage: (message: string, channel: string) => void) {}

	shutdown() {}
}
