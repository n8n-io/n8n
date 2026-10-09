import { Time } from '@n8n/constants';
import { z } from 'zod';

import { CommaSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';
import { concurrencyLimitSchema } from '../schemas';

const nodeContractTracePayloadsSchema = z.enum(['off', 'shape', 'redacted']);

const NODES_NEXT_RUNTIMES = ['in-process', 'worker', 'wasm', 'container'] as const;

type NodesNextRuntime = (typeof NODES_NEXT_RUNTIMES)[number];

// A wrong list must stop the start: a fallback to the default could change where community code runs.
const checkRuntimes = (envName: string, names: readonly string[]) => {
	const unknown = names.find((name) => !NODES_NEXT_RUNTIMES.some((known) => known === name));
	if (unknown !== undefined) {
		throw new Error(
			`${envName} has the unknown runtime "${unknown}". Valid runtimes: ${NODES_NEXT_RUNTIMES.join(', ')}.`,
		);
	}
	const repeated = names.find((name, index) => names.indexOf(name) !== index);
	if (repeated !== undefined) throw new Error(`${envName} has the runtime "${repeated}" twice.`);
	if (names.length === 0) throw new Error(`${envName} has no runtime.`);
};

class FirstPartyRuntimes extends CommaSeparatedStringArray<NodesNextRuntime> {
	constructor(str: string) {
		super(str);
		checkRuntimes('N8N_NODES_NEXT_RUNTIMES_FIRST_PARTY', this);
	}
}

class CommunityRuntimes extends CommaSeparatedStringArray<NodesNextRuntime> {
	constructor(str: string) {
		super(str);
		checkRuntimes('N8N_NODES_NEXT_RUNTIMES_COMMUNITY', this);
	}
}

class PrivateRuntimes extends CommaSeparatedStringArray<NodesNextRuntime> {
	constructor(str: string) {
		super(str);
		checkRuntimes('N8N_NODES_NEXT_RUNTIMES_PRIVATE', this);
	}
}

@Config
export class InstanceAiConfig {
	/** Enable workflow suggestion runtime integrations at startup. */
	@Env('N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED')
	workflowSuggestionsEnabled: boolean = false;

	/** LLM model in provider/model format, or a bare model name for a custom endpoint. */
	@Env('N8N_INSTANCE_AI_MODEL')
	model: string = 'anthropic/claude-opus-4-8';

	/** Base URL for an OpenAI-compatible endpoint (e.g. "http://localhost:1234/v1" for LM Studio). */
	@Env('N8N_INSTANCE_AI_MODEL_URL')
	modelUrl: string = '';

	/** API key for the custom model endpoint (optional — some local servers don't require one). */
	@Env('N8N_INSTANCE_AI_MODEL_API_KEY')
	modelApiKey: string = '';

	/**
	 * Google Cloud project for `google-vertex-anthropic/*` models.
	 * Falls back to `GOOGLE_VERTEX_PROJECT`, then `project_id` in the service-account JSON.
	 */
	@Env('N8N_INSTANCE_AI_VERTEX_PROJECT_ID')
	vertexProjectId: string = '';

	/**
	 * Vertex location for `google-vertex-anthropic/*` models (e.g. `global`, `us-east5`).
	 * Empty falls back to `GOOGLE_VERTEX_LOCATION`, then `global`.
	 */
	@Env('N8N_INSTANCE_AI_VERTEX_LOCATION')
	vertexLocation: string = '';

	/**
	 * Service-account JSON for `google-vertex-anthropic/*` models.
	 * Omit to use ADC (`gcloud auth application-default login`).
	 */
	@Env('N8N_INSTANCE_AI_VERTEX_SERVICE_ACCOUNT_JSON')
	vertexServiceAccountJson: string = '';

	/** Comma-separated name=url pairs for MCP servers (e.g. "github=https://mcp.github.com/sse"). */
	@Env('N8N_INSTANCE_AI_MCP_SERVERS')
	mcpServers: string = '';

	/** Token threshold for Observer to trigger compression of message history. */
	@Env('N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS')
	observerMessageTokens: number = 30_000;

	/** Token threshold for Reflector to condense observations. */
	@Env('N8N_INSTANCE_AI_REFLECTOR_OBSERVATION_TOKENS')
	reflectorObservationTokens: number = 40_000;

	/**
	 * Run the Observer inside a turn (at tool-loop boundaries). When false the
	 * Observer runs only after the turn, which keeps the prompt prefix stable
	 * within a turn and improves provider prompt-cache reuse.
	 */
	@Env('N8N_INSTANCE_AI_MID_RUN_OBSERVATION')
	midRunObservation: boolean = false;

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
	 * When true, sandboxes are created ephemeral: the provider deletes them once idle instead
	 * of leaving them stopped. Intended for throwaway eval instances so sandboxes don't accumulate.
	 */
	@Env('N8N_INSTANCE_AI_SANDBOX_EPHEMERAL')
	sandboxEphemeral: boolean = false;

	/**
	 * Marks an instance that serves the Instance AI eval harness. Only then may an eval run
	 * reset per-workflow state (Remove Duplicates history) around a scenario: on a normal
	 * instance an eval pointed at a real workflow must leave its history alone.
	 */
	@Env('N8N_INSTANCE_AI_EVAL_INSTANCE')
	evalInstance: boolean = false;

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

	/** Interval in milliseconds between scheduled pruning runs. 0 = disabled. */
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

	/** Capture orchestrator LLM steps and workflow code snapshots for the dev debug panel. */
	@Env('N8N_INSTANCE_AI_RUN_DEBUG_ENABLED')
	runDebugEnabled: boolean = false;

	/**
	 * Send prompts, completions and tool data (after redaction) on the assistant's
	 * OTLP build traces. For development only: without it, those traces carry
	 * identifiers, models, token counts and timings only.
	 */
	@Env('N8N_INSTANCE_AI_TRACE_CONTENT')
	traceContent: boolean = false;

	/** Enable extended thinking / reasoning for the orchestrator agent. */
	@Env('N8N_INSTANCE_AI_THINKING_ENABLED')
	thinkingEnabled: boolean = true;

	/**
	 * Force-enable canvas-selected-nodes chat context in Instance AI.
	 * Acts as an operator-level override of the PostHog rollout flag
	 * (`104_canvas_aia_node_context`). Cannot force-disable: setting this to
	 * `false` falls back to PostHog.
	 */
	@Env('N8N_INSTANCE_AI_NODE_CONTEXT_ENABLED')
	canvasNodeContextEnabled: boolean = false;

	/**
	 * Pin every Instance AI run on this instance to one published prompt profile
	 * (e.g. `concise@1`). Empty keeps the backend experiment assignment.
	 *
	 * Instance-wide on purpose, so the two system prompts never fragment the
	 * prompt cache within one instance. A request-level `promptVersion` and a
	 * value already selected for the thread both still win, so an eval keeps the
	 * profile it pinned. Checkpoints do not store this pin, so a suspended run
	 * that resumes after you change it uses the new value. Profiles are keyed by
	 * build mode, so pinning a `default`-mode profile also overrides a
	 * progressive building assignment. An unknown version fails the run, and n8n
	 * keeps serving everything else.
	 */
	@Env('N8N_INSTANCE_AI_PROMPT_VERSION')
	promptVersion: string = '';

	/**
	 * Force-enable the node-usage context surface for Instance AI — the `node-usage` action and
	 * the `nodeTypes` filter on `workflows(action="list")`.
	 *
	 * Operator-level override of the PostHog rollout flag (`109_instance_ai_node_usage`). Cannot
	 * force-disable: setting this to `false` falls back to PostHog. Gated on its own rather than
	 * with any other context surface, so a measurement can tell which one moved a result.
	 */
	@Env('N8N_INSTANCE_AI_NODE_USAGE_ENABLED')
	nodeUsageEnabled: boolean = false;

	/**
	 * Serve AI-first action contracts through the `nodes` tool for the nodes that
	 * have one, and compile contract nodes back to workflow JSON on build.
	 * Spike (NODE-6071): env-only, no PostHog flag. On by default on the spike branch, so a
	 * branch image runs the contract path in remote evals without extra settings.
	 */
	@Env('N8N_INSTANCE_AI_NODE_CONTRACTS_ENABLED')
	nodeContractsEnabled: boolean = true;

	/**
	 * The npm registry of published contract versions, e.g. `http://localhost:4873`. During the
	 * POC it must be a local registry. Empty: only bundled and stored versions run.
	 */
	@Env('N8N_NODE_CONTRACTS_NPM_REGISTRY')
	nodeContractsNpmRegistry: string = '';

	/** The npm scope of contract packages. */
	@Env('N8N_NODE_CONTRACTS_NPM_SCOPE')
	nodeContractsNpmScope: string = '@n8n-nodes';

	/** The bearer token for the npm registry. Empty: no token. */
	@Env('N8N_NODE_CONTRACTS_NPM_TOKEN')
	nodeContractsNpmToken: string = '';

	/**
	 * PEM file of the ed25519 first-party key of n8n. A version that it signs is first-party, so it
	 * runs in a runtime of `N8N_NODES_NEXT_RUNTIMES_FIRST_PARTY`. When one of the key
	 * files is set, the store takes only versions that one of the keys signs. When both are empty,
	 * the store takes unsigned versions as private.
	 */
	@Env('N8N_NODE_CONTRACTS_FIRST_PARTY_KEY_FILE')
	nodeContractsFirstPartyKeyFile: string = '';

	/**
	 * PEM file of the ed25519 vetting key of n8n. A version that it signs, and the first-party key
	 * does not, is a community version, so it runs in a runtime of `N8N_NODES_NEXT_RUNTIMES_COMMUNITY`.
	 */
	@Env('N8N_NODE_CONTRACTS_VETTING_KEY_FILE')
	nodeContractsVettingKeyFile: string = '';

	/**
	 * The revoked contract versions that may still run, as `<id>@<version>`. A publisher revokes
	 * a version, e.g. for a security issue, and n8n then refuses to run it. Set this only when you
	 * accept the risk, e.g. until you update the workflows that pin the version.
	 *
	 * @example 'gmail.message.get@1.0.4,slack.message.send@1.2.0'
	 */
	@Env('N8N_NODE_CONTRACTS_REVOKED_ALLOW')
	nodeContractsRevokedAllow: CommaSeparatedStringArray<string> = [];

	/**
	 * The Node Contract versions a manifest or bundle may declare, as a semver range. Raise the
	 * lowest major only in an n8n major release.
	 */
	@Env('N8N_NODE_CONTRACT_RANGE')
	nodeContractRange: string = '>=2.0.0 <3.0.0';

	/**
	 * The runtimes of first-party node versions, the preferred one first. A version is first-party
	 * when n8n bundles it or the first-party key of `N8N_NODE_CONTRACTS_FIRST_PARTY_KEY_FILE` signs
	 * it. Runtimes: `in-process`, `worker`, `wasm`, `container`.
	 */
	@Env('N8N_NODES_NEXT_RUNTIMES_FIRST_PARTY')
	nodesNextRuntimesFirstParty: FirstPartyRuntimes = ['worker', 'in-process', 'wasm', 'container'];

	/**
	 * The runtimes of community node versions, the preferred one first: the versions that the
	 * vetting key of `N8N_NODE_CONTRACTS_VETTING_KEY_FILE` signs. `in-process` and `worker` give no
	 * security boundary, so n8n logs a warning at start when this list has them.
	 */
	@Env('N8N_NODES_NEXT_RUNTIMES_COMMUNITY')
	nodesNextRuntimesCommunity: CommunityRuntimes = ['wasm', 'container'];

	/**
	 * The runtimes of private node versions, the preferred one first: the versions that no trusted
	 * key signs, e.g. a version that only its pin anchors. `in-process` and `worker` give no
	 * security boundary, so n8n logs a warning at start when this list has them.
	 */
	@Env('N8N_NODES_NEXT_RUNTIMES_PRIVATE')
	nodesNextRuntimesPrivate: PrivateRuntimes = ['wasm', 'container'];

	/** Lets node versions run in Docker containers. Needs `docker` on the PATH. */
	@Env('N8N_NODES_NEXT_CONTAINER_ENABLED')
	nodesNextContainerEnabled: boolean = false;

	/** The `n8n-sandbox` binary of the `wasm` runtime. Empty: the sandbox build of `@n8n/node-sdk`. */
	@Env('N8N_NODE_CONTRACT_SANDBOX_SIDECAR')
	nodeContractSandboxSidecar: string = '';

	/** The directory of `action.wasm`, `provider.wasm` and `trigger.wasm`. Empty: the sandbox build of `@n8n/node-sdk`. */
	@Env('N8N_NODE_CONTRACT_SANDBOX_GUESTS')
	nodeContractSandboxGuests: string = '';

	/**
	 * A directory that only n8n can write: the compiled guests and the verified bundles. Empty:
	 * `node-contracts/sandbox` in the n8n folder.
	 */
	@Env('N8N_NODE_CONTRACT_SANDBOX_CACHE_DIR')
	nodeContractSandboxCacheDir: string = '';

	/**
	 * For development only. Adds the data of each contract node run to its trace: the input, the
	 * output and the HTTP request and response bodies. `shape`: the keys, the types and the sizes.
	 * `redacted`: the values without the secrets of the credential. The trace keeps the first 20
	 * input and output items, and cuts each value to 2048 characters. n8n logs a warning at start
	 * when it is on. An unknown value logs a config error, and n8n uses `off`.
	 */
	@Env('N8N_NODE_CONTRACT_TRACE_PAYLOADS', nodeContractTracePayloadsSchema)
	nodeContractTracePayloads: z.infer<typeof nodeContractTracePayloadsSchema> = 'off';

	/**
	 * Force-enable folder exploration in Instance AI: folder attribution and
	 * folder scoping on the workflows list tool. Overrides the
	 * `110_instance_ai_folder_exploration` PostHog flag to on. `false` falls back
	 * to PostHog.
	 */
	@Env('N8N_INSTANCE_AI_FOLDER_EXPLORATION_ENABLED')
	folderExplorationEnabled: boolean = false;

	/**
	 * Activation-capped trial variant for n8n cloud experiment.
	 * Set by the cloud dashboard at deploy time on one signup-experiment cohort only.
	 */
	@Env('N8N_INSTANCE_AI_ACTIVATION_CAPPED')
	activationCapped: boolean = false;

	/**
	 * How many assistant messages the instance must have sent before {@link activationCapped} locking may apply.
	 */
	@Env('N8N_INSTANCE_AI_ACTIVATION_LOCK_MESSAGE_THRESHOLD')
	activationLockMessageThreshold: number = 1;

	/**
	 * Max orchestrator runs executing concurrently on this process. A new user turn over
	 * the cap is refused with HTTP 429; resumes and internal follow-up runs are always
	 * admitted so an in-flight conversation is never stranded.
	 *
	 * `-1` (the default) means unlimited
	 *
	 * Size it against memory rather than throughput: measured peak is ~600MB
	 * base plus ~20MB per concurrent run. The unit is the user turn, so sub-agents are
	 * capped separately rather than counted here.
	 *
	 * Counts executing runs only. A suspended run keeps its agent in memory but releases
	 * its slot, so leave headroom for threads that wait on an approval card.
	 */
	@Env('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS', concurrencyLimitSchema)
	maxConcurrentRuns: number = -1;

	/**
	 * Max orchestrator runs one user may have executing at once, across all their threads.
	 * Bounds credit overshoot: usage is only claimed when a run segment ends, so every run
	 * a user can start in parallel is one more run's worth of spend that can land after
	 * they cross quota.
	 *
	 * `-1` (the default) means unlimited.
	 *
	 * Counts executing runs only, a HITL-suspended run spends nothing while it waits,
	 * and counting those would lock a user out for the whole confirmation timeout.
	 */
	@Env('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS_PER_USER', concurrencyLimitSchema)
	maxConcurrentRunsPerUser: number = -1;

	/**
	 * Max background sub-agent tasks running concurrently on this process, across all
	 * threads. Guards the fan-out case the per-thread limit misses: a handful of runs each
	 * spawning their full complement of sub-agents. A spawn over the cap fails as a tool
	 * error, which the orchestrator handles by doing the work inline or retrying later.
	 *
	 * `-1` (the default) means unlimited.
	 *
	 * The per-thread constant limit of MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD (5) applies regardless.
	 */
	@Env('N8N_INSTANCE_AI_MAX_CONCURRENT_SUB_AGENTS', concurrencyLimitSchema)
	maxConcurrentSubAgents: number = -1;
}
