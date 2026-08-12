import { z } from 'zod';

import { Config, Env } from '../decorators';

const transportModeSchema = z.enum(['redis', 'ipc']);
type TransportMode = z.infer<typeof transportModeSchema>;

/**
 * Transport per coordination subsystem: `redis` (default, current behavior) or
 * `ipc` (hypervisor cluster). Each subsystem is an explicit opt-in flip — never
 * inferred. Add a new subsystem by adding one field here plus one union member
 * in `TransportModeService`.
 */
@Config
export class TransportConfig {
	@Env('N8N_TRANSPORT_LEADER_ELECTION', transportModeSchema)
	leaderElection: TransportMode = 'redis';

	@Env('N8N_TRANSPORT_CACHE', transportModeSchema)
	cache: TransportMode = 'redis';

	@Env('N8N_TRANSPORT_PUBSUB', transportModeSchema)
	pubsub: TransportMode = 'redis';

	@Env('N8N_TRANSPORT_QUEUE', transportModeSchema)
	queue: TransportMode = 'redis';
}
