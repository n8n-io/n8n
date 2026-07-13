import { Time } from '@n8n/constants';

import { Config, Env } from '../decorators';

@Config
export class InstanceAiConfig {
	/** LLM model in provider/model format, or a bare model name for a custom endpoint. */
	@Env('N8N_INSTANCE_AI_MODEL')
	model: string = 'anthropic/claude-opus-4-8';

	/** Base URL for an OpenAI-compatible endpoint (e.g. "http://localhost:1234/v1" for LM Studio). */
	@Env('N8N_INSTANCE_AI_MODEL_URL')
	modelUrl: string = '';

	/** API key for the custom model endpoint (optional — some local servers don't require one). */
	@Env('N8N_INSTANCE_AI_MODEL_API_KEY')
	modelApiKey: string = '';

	/** Comma-separated name=url pairs for MCP servers (e.g. "github=https://mcp.github.com/sse"). */
	@Env('N8N_INSTANCE_AI_MCP_SERVERS')
	mcpServers: string = '';

	/** Token threshold for Observer to trigger compression of message history. */
	@Env('N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS')
	observerMessageTokens: number = 30_000;

	/** Token threshold for Reflector to condense observations. */
	@Env('N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS')
	reflectorObservationTokens: number = 40_000;

	/** Disable the local gateway (filesystem, shell, browser, etc.) for all users. */
	@Env('N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED')
	localGatewayDisabled: boolean = false;

	@Env('N8N_INSTANCE_AI_BROWSER_USE_ENABLED')
	browserUseEnabled: boolean = true;

	/** Enable sandbox for code execution. When true, the agent can run shell commands and code. */
	@Env('N8N_INSTANCE_AI_SANDBOX_ENABLED')
	sandboxEnabled: boolean = false;

	/** Sandbox provider: 'n8n-sandbox' for n8n sandbox service, 'daytona' for Daytona-backed containers. */
	@Env('N8N_INSTANCE_AI_SANDBOX_PROVIDER')
	sandboxProvider: string = 'n8n-sandbox';

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

	/**
	 * Overrides the full Daytona snapshot name used to create sandboxes (e.g.
	 * `n8n/instance-ai:2.27.3`). Defaults to the versioned snapshot derived from the running
	 * n8n version. Only applies in proxy mode; the snapshot must exist or Daytona falls back
	 * to building from the base image.
	 */
	@Env('N8N_INSTANCE_AI_SANDBOX_SNAPSHOT')
	sandboxSnapshot: string = '';

	/** Default command timeout in the sandbox (milliseconds). */
	@Env('N8N_INSTANCE_AI_SANDBOX_TIMEOUT')
	sandboxTimeout: number = 5 * Time.minutes.toMilliseconds;

	/** Prefix prepended to every Daytona sandbox name (e.g. `eval-baseline-daily`); also surfaced as a `name_prefix` label. */
	@Env('N8N_INSTANCE_AI_SANDBOX_NAME_PREFIX')
	sandboxNamePrefix: string = '';

	/**
	 * When true, Daytona sandboxes are created ephemeral (auto-deleted on stop) instead of
	 * lingering stopped. Intended for throwaway eval instances so sandboxes don't accumulate.
	 */
	@Env('N8N_INSTANCE_AI_SANDBOX_EPHEMERAL')
	sandboxEphemeral: boolean = false;

	/**
	 * Minutes an idle Daytona sandbox waits before it is stopped. Default 15 minutes.
	 * `0` disables auto-stop (the sandbox stays running).
	 */
	@Env('N8N_INSTANCE_AI_SANDBOX_AUTO_STOP_MINUTES')
	sandboxAutoStopMinutes: number = 15;

	/**
	 * Minutes a stopped Daytona sandbox waits before it is archived to cold storage.
	 * Default 1 hour. `0` uses Daytona's maximum interval.
	 */
	@Env('N8N_INSTANCE_AI_SANDBOX_AUTO_ARCHIVE_MINUTES')
	sandboxAutoArchiveMinutes: number = 60;

	/**
	 * Minutes a stopped Daytona sandbox waits before it is deleted. Default 7 days. A negative
	 * value disables auto-delete; `0` deletes on stop. Ignored when {@link sandboxEphemeral} is true.
	 */
	@Env('N8N_INSTANCE_AI_SANDBOX_AUTO_DELETE_MINUTES')
	sandboxAutoDeleteMinutes: number = 7 * 24 * 60;

	/**
	 * Skew (milliseconds) used to proactively refresh the Daytona proxy JWT before it expires.
	 * Refresh fires when the cached token's remaining lifetime falls below this threshold.
	 * Only used in proxy mode (when a `getAuthToken` callback is configured); ignored for static API keys.
	 */
	@Env('N8N_INSTANCE_AI_DAYTONA_TOKEN_REFRESH_SKEW_MS')
	daytonaTokenRefreshSkewMs: number = 5 * Time.minutes.toMilliseconds;

	/** How long to keep completed workflow-builder sandboxes warm for follow-up fixes. 0 = disabled. */
	@Env('N8N_INSTANCE_AI_BUILDER_SANDBOX_TTL_MS')
	builderSandboxTtlMs: number = 15 * Time.minutes.toMilliseconds;

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
	threadTtlDays: number = 30;

	/** Interval in milliseconds between scheduled pruning runs on the leader. 0 = disabled. */
	@Env('N8N_INSTANCE_AI_PRUNE_INTERVAL')
	pruneInterval: number = 1 * Time.hours.toMilliseconds;

	/** Retention period in milliseconds for stale native persistence checkpoints before pruning. */
	@Env('N8N_INSTANCE_AI_SNAPSHOT_RETENTION')
	snapshotRetention: number = 24 * Time.hours.toMilliseconds;

	/** Retention period in milliseconds for expired checkpoint tombstones before they are hard-deleted. Must exceed snapshotRetention. 0 = never hard-delete. */
	@Env('N8N_INSTANCE_AI_CHECKPOINT_GC_RETENTION')
	checkpointGcRetention: number = 7 * Time.days.toMilliseconds;

	/** Timeout in milliseconds for HITL confirmation requests. 0 = no timeout. */
	@Env('N8N_INSTANCE_AI_CONFIRMATION_TIMEOUT')
	confirmationTimeout: number = 24 * Time.hours.toMilliseconds;

	/** Scan and redact secrets/PII from agent output before it reaches the user. */
	@Env('N8N_INSTANCE_AI_OUTPUT_REDACTION_ENABLED')
	outputRedactionEnabled: boolean = true;

	/** Redact credential/secret patterns from agent output. Applies only when output redaction is enabled. */
	@Env('N8N_INSTANCE_AI_OUTPUT_REDACTION_SECRETS')
	outputRedactionSecrets: boolean = true;

	/** Comma-separated PII categories to redact from agent output. Available: email, phone, credit-card, ssn-us, iban, crypto-wallet, ip, mac, url. Empty = no PII scanning. */
	@Env('N8N_INSTANCE_AI_OUTPUT_REDACTION_PII')
	outputRedactionPii: string = 'credit-card';

	/** Replacement text substituted for each redacted match in agent output. */
	@Env('N8N_INSTANCE_AI_OUTPUT_REDACTION_PLACEHOLDER')
	outputRedactionPlaceholder: string = '[REDACTED]';

	/** Capture orchestrator LLM steps and workflow code snapshots for the dev debug panel. */
	@Env('N8N_INSTANCE_AI_RUN_DEBUG_ENABLED')
	runDebugEnabled: boolean = false;

	/** Enable extended thinking / reasoning for the orchestrator agent. */
	@Env('N8N_INSTANCE_AI_THINKING_ENABLED')
	thinkingEnabled: boolean = true;
}
