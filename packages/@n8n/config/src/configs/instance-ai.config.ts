import { Config, Env } from '../decorators';

@Config
export class InstanceAiConfig {
	/** LLM model in provider/model format (e.g. "anthropic/claude-sonnet-4-6"). */
	@Env('N8N_INSTANCE_AI_MODEL')
	model: string = 'anthropic/claude-sonnet-4-6';

	/** Base URL for an OpenAI-compatible endpoint (e.g. "http://localhost:1234/v1" for LM Studio). */
	@Env('N8N_INSTANCE_AI_MODEL_URL')
	modelUrl: string = '';

	/** API key for the custom model endpoint (optional — some local servers don't require one). */
	@Env('N8N_INSTANCE_AI_MODEL_API_KEY')
	modelApiKey: string = '';

	/**
	 * Hard cap on the context window size (in tokens). When set, the effective
	 * context window is the lesser of this value and the model's native capability.
	 * 0 = use the model's full context window.
	 */
	@Env('N8N_INSTANCE_AI_MAX_CONTEXT_WINDOW_TOKENS')
	maxContextWindowTokens: number = 500_000;

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

	/** Maximum LLM reasoning steps for sub-agents spawned via delegate tool. */
	@Env('N8N_INSTANCE_AI_SUB_AGENT_MAX_STEPS')
	subAgentMaxSteps: number = 100;

	/** Disable the local gateway (filesystem, shell, browser, etc.) for all users. */
	@Env('N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED')
	localGatewayDisabled: boolean = false;

	/** Enable Chrome DevTools MCP for browser-assisted credential setup. */
	@Env('N8N_INSTANCE_AI_BROWSER_MCP')
	browserMcp: boolean = false;

	/** Enable sandbox for code execution. When true, the agent can run shell commands and code. */
	@Env('N8N_INSTANCE_AI_SANDBOX_ENABLED')
	sandboxEnabled: boolean = false;

	/** Sandbox provider: 'daytona' for isolated Docker containers, 'local' for direct host execution (dev only). */
	@Env('N8N_INSTANCE_AI_SANDBOX_PROVIDER')
	sandboxProvider: string = 'daytona';

	/** Daytona API URL (e.g. "http://localhost:3000/api"). */
	@Env('DAYTONA_API_URL')
	daytonaApiUrl: string = '';

	/** Daytona API key for authentication. */
	@Env('DAYTONA_API_KEY')
	daytonaApiKey: string = '';

	/** n8n sandbox service base URL. */
	@Env('N8N_SANDBOX_SERVICE_URL')
	n8nSandboxServiceUrl: string = '';

	/** n8n sandbox service API key. */
	@Env('N8N_SANDBOX_SERVICE_API_KEY')
	n8nSandboxServiceApiKey: string = '';

	/** Docker image for the Daytona sandbox (default: daytonaio/sandbox:0.5.0). */
	@Env('N8N_INSTANCE_AI_SANDBOX_IMAGE')
	sandboxImage: string = 'daytonaio/sandbox:0.5.0';

	/** Default command timeout in the sandbox (milliseconds). */
	@Env('N8N_INSTANCE_AI_SANDBOX_TIMEOUT')
	sandboxTimeout: number = 300_000;

	/** Brave Search API key for web search. No key = search + research agent disabled. */
	@Env('INSTANCE_AI_BRAVE_SEARCH_API_KEY')
	braveSearchApiKey: string = '';

	/** SearXNG instance URL for web search (e.g. "http://searxng:8080"). Empty = disabled. No API key needed. */
	@Env('N8N_INSTANCE_AI_SEARXNG_URL')
	searxngUrl: string = '';

	/** Optional static API key for the filesystem gateway. When set, accepted alongside per-user pairing/session keys. */
	@Env('N8N_INSTANCE_AI_GATEWAY_API_KEY')
	gatewayApiKey: string = '';

	/** Conversation thread TTL in days. Threads older than this are auto-expired. 0 = no expiration. */
	@Env('N8N_INSTANCE_AI_THREAD_TTL_DAYS')
	threadTtlDays: number = 90;

	/** Interval in milliseconds between snapshot pruning runs. 0 = disabled. */
	@Env('N8N_INSTANCE_AI_SNAPSHOT_PRUNE_INTERVAL')
	snapshotPruneInterval: number = 60 * 60 * 1000; // 1 hour

	/** Retention period in milliseconds for orphaned workflow snapshots before pruning. */
	@Env('N8N_INSTANCE_AI_SNAPSHOT_RETENTION')
	snapshotRetention: number = 24 * 60 * 60 * 1000; // 24 hours

	/** Timeout in milliseconds for HITL confirmation requests. 0 = no timeout. */
	@Env('N8N_INSTANCE_AI_CONFIRMATION_TIMEOUT')
	confirmationTimeout: number = 10 * 60 * 1000; // 10 minutes
}
