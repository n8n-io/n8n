import { Config, Env } from '../decorators';

@Config
export class InstanceAiConfig {
	/** LLM model in provider/model format (e.g. "anthropic/claude-sonnet-4-5"). */
	@Env('N8N_INSTANCE_AI_MODEL')
	model: string = 'anthropic/claude-sonnet-4-5';

	/** Comma-separated name=url pairs for MCP servers (e.g. "github=https://mcp.github.com/sse"). */
	@Env('N8N_INSTANCE_AI_MCP_SERVERS')
	mcpServers: string = '';

	/** Number of recent messages to include in context. */
	@Env('N8N_INSTANCE_AI_LAST_MESSAGES')
	lastMessages: number = 20;

	/** Embedder model for semantic recall (empty = disabled). */
	@Env('N8N_INSTANCE_AI_EMBEDDER_MODEL')
	embedderModel: string = '';

	/** Number of semantically similar messages to retrieve. */
	@Env('N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K')
	semanticRecallTopK: number = 5;

	/** Agent response timeout in milliseconds. */
	@Env('N8N_INSTANCE_AI_TIMEOUT')
	timeout: number = 120_000;
}
