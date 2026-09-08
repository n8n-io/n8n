import type { PubSubEventName } from '@n8n/decorators';

/**
 * Port that lets a module broadcast a command to the other instances of a
 * scaling-mode deployment, without depending on the host's pubsub transport.
 *
 * The host binds an implementation at bootstrap. Only payload-less commands
 * cross this port; commands that carry a payload stay host-side.
 */
export abstract class ModulePubSubPublisher {
	abstract publishCommand(msg: { command: PubSubEventName }): Promise<void>;
}
