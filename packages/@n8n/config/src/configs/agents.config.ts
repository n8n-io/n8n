import { Config, Env } from '../decorators';

@Config
export class AgentsConfig {
	/** TTL in seconds for agent checkpoint records. Stale checkpoints older than this are pruned. */
	@Env('N8N_AGENTS_CHECKPOINT_TTL')
	checkpointTtlSeconds: number = 345600; // 96 hours
}
