/**
 * A command that a module may broadcast.
 *
 * Every member must name a host command that carries no payload. The map from
 * command name to payload lives in the host, so a port typed over the whole
 * `PubSubEventName` union accepts `{ command: 'stop-execution' }` — a
 * payload-bearing command, with no payload, and no error at the publish site.
 *
 * The union holds message shapes rather than names, so the host binds it
 * straight to its publisher and lets the compiler check each name against the
 * payload map. A payload-bearing name added here breaks the host build instead
 * of the wire.
 */
export type ModulePubSubCommand = { command: 'reload-otel-config' };

/**
 * Port that lets a module broadcast a command to the other instances of a
 * scaling-mode deployment, without depending on the host's pubsub transport.
 *
 * The host binds an implementation at bootstrap.
 */
export abstract class ModulePubSubPublisher {
	abstract publishCommand(msg: ModulePubSubCommand): Promise<void>;
}
