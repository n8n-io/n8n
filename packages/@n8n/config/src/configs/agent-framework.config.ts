import { Config, Env } from '../decorators';

@Config
export class AgentFrameworkConfig {
	/** TTL in seconds for agent checkpoint records. Stale checkpoints older than this are pruned. */
	@Env('N8N_AGENT_FRAMEWORK_CHECKPOINT_TTL')
	checkpointTtlSeconds: number = 345600; // 96 hours
}
