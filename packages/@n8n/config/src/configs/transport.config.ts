import { z } from 'zod';

import { Config, Env } from '../decorators';

const transportModeSchema = z.enum(['redis', 'ipc']);
type TransportMode = z.infer<typeof transportModeSchema>;

// Subsystems that can also run purely in-process (no coordination), so they add a
// third `memory` option to the two-value redis|ipc set.
const memoryCapableTransportSchema = z.enum(['memory', 'redis', 'ipc']);
type MemoryCapableTransportMode = z.infer<typeof memoryCapableTransportSchema>;

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

	/**
	 * Cache store. `memory` (default) is a per-process cache; queue-mode
	 * deployments that need a shared cache set `redis` explicitly. `ipc` uses the
	 * hypervisor as a single shared source of truth across forked workers.
	 */
	@Env('N8N_TRANSPORT_CACHE', memoryCapableTransportSchema)
	cache: MemoryCapableTransportMode = 'memory';

	@Env('N8N_TRANSPORT_PUBSUB', transportModeSchema)
	pubsub: TransportMode = 'redis';

	@Env('N8N_TRANSPORT_QUEUE', transportModeSchema)
	queue: TransportMode = 'redis';

	/**
	 * Instance-registry storage. `memory` (default) preserves the common
	 * non-clustered case; queue / multi-main deployments must set `redis`
	 * explicitly to keep the shared registry. `ipc` uses the hypervisor.
	 */
	@Env('N8N_TRANSPORT_INSTANCE_REGISTRY', memoryCapableTransportSchema)
	instanceRegistry: MemoryCapableTransportMode = 'memory';
}
