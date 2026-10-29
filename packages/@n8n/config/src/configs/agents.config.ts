import { Time } from '@n8n/constants';

import { CommaSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';

/**
 * Known agent sub-feature modules. Add a token here to make it valid in
 * `N8N_AGENTS_MODULES`. The backend fails fast on unknown tokens so typos
 * surface at startup instead of silently disabling a feature.
 */
export const AGENTS_MODULE_NAMES = [] as const;

export type AgentsModuleName = (typeof AGENTS_MODULE_NAMES)[number];

class AgentsModuleArray extends CommaSeparatedStringArray<AgentsModuleName> {
	constructor(str: string) {
		super(str);

		for (const name of this) {
			const moduleName: string = name;
			if (!AGENTS_MODULE_NAMES.includes(name)) {
				const validTokens = AGENTS_MODULE_NAMES.join(', ');
				throw new Error(
					`Unknown agents module: "${moduleName}". ${
						validTokens
							? `Valid tokens: ${validTokens}.`
							: 'No agents modules are currently supported.'
					}`,
				);
			}
		}
	}
}

@Config
export class AgentsConfig {
	@Env('N8N_AGENTS_PLAN_TOOLS_ENABLED')
	planToolsEnabled: boolean = false;

	/** TTL in seconds for agent checkpoint records. Stale checkpoints older than this are pruned. */
	@Env('N8N_AGENTS_CHECKPOINT_TTL')
	checkpointTtlSeconds: number = 96 * Time.hours.toSeconds;

	/**
	 * Whether agent runs emit OpenTelemetry spans. Rides along with the OTel
	 * module (endpoint, headers, sampling and transport are inherited from
	 * `N8N_OTEL_*`) — spans go nowhere when no OTel provider is registered,
	 * since the tracer falls back to OTel's no-op implementation, but the
	 * runtime still does the work of building span attributes either way.
	 * Lets operators run workflow OTel without agent spans.
	 */
	@Env('N8N_AGENTS_TRACING_ENABLED')
	tracingEnabled: boolean = true;

	/**
	 * Whether agent tracing records inputs (prompts, tool arguments).
	 * Defaults to true. Set to false to exclude sensitive input data from traces.
	 */
	@Env('N8N_AGENTS_TRACING_RECORD_INPUTS')
	tracingRecordInputs: boolean = true;

	/**
	 * Whether agent tracing records outputs (responses, tool results).
	 * Defaults to true. Set to false to exclude sensitive output data from traces.
	 */
	@Env('N8N_AGENTS_TRACING_RECORD_OUTPUTS')
	tracingRecordOutputs: boolean = true;

	/**
	 * Comma-separated list of agent sub-feature modules to enable. Each entry
	 * gates a specific frontend/runtime capability inside the agents module.
	 * Add supported module tokens to `AGENTS_MODULE_NAMES`.
	 */
	@Env('N8N_AGENTS_MODULES')
	modules: AgentsModuleArray = [];

	/**
	 * Enable durable background jobs for agents: spawning sub-agents that outlive
	 * the parent's turn, and detached tracking of waiting workflow tools. Must be
	 * set to the same value on mains and workers — workers settle workflow jobs.
	 */
	@Env('N8N_AGENTS_BACKGROUND_TASKS_ENABLED')
	backgroundTasksEnabled: boolean = false;

	/** Enable sandbox-backed agent knowledge base operations. */
	@Env('N8N_AGENTS_AI_SANDBOX_ENABLED')
	sandboxEnabled: boolean = false;

	/** Docker image for the Daytona sandbox (default: daytonaio/sandbox:0.5.0). */
	@Env('N8N_AGENTS_AI_SANDBOX_IMAGE')
	sandboxImage: string = 'daytonaio/sandbox:0.5.0';

	/**
	 * Daytona snapshot name for agent knowledge sandboxes. Falls back to image when unavailable,
	 * except when Daytona is reached through the AI service proxy, which only accepts snapshots.
	 */
	@Env('N8N_AGENTS_AI_SANDBOX_SNAPSHOT')
	sandboxSnapshot: string = 'daytonaio/sandbox:0.8.0';

	/** Default command timeout in the sandbox (milliseconds). */
	@Env('N8N_AGENTS_AI_SANDBOX_TIMEOUT')
	sandboxTimeout: number = 5 * Time.minutes.toMilliseconds;

	/** When true, the sandbox provider deletes the knowledge sandbox once it goes idle. */
	@Env('N8N_AGENTS_AI_SANDBOX_EPHEMERAL')
	sandboxEphemeral: boolean = false;

	/**
	 * Largest file, in megabytes, that an agent can store from a tool result or from its
	 * sandbox. n8n skips a larger file and tells the agent.
	 */
	@Env('N8N_AGENTS_FILES_MAX_GENERATED_FILE_SIZE_MB')
	maxGeneratedFileSizeMb: number = 50;

	/**
	 * Most files that tools and the sandbox can store in one agent conversation, sub-agents
	 * included. Files that users upload don't count.
	 */
	@Env('N8N_AGENTS_FILES_MAX_GENERATED_COUNT')
	maxGeneratedFileCount: number = 100;

	/**
	 * Most data, in megabytes, that tools and the sandbox can store in one agent
	 * conversation, sub-agents included.
	 */
	@Env('N8N_AGENTS_FILES_MAX_GENERATED_TOTAL_MB')
	maxGeneratedTotalMb: number = 500;

	/**
	 * Most data, in megabytes, that one agent conversation can store, sub-agents included.
	 * This counts user uploads and files from tools and the sandbox. When a conversation is
	 * full, n8n rejects new uploads.
	 */
	@Env('N8N_AGENTS_FILES_MAX_TOTAL_MB')
	maxTotalMb: number = 1536;

	/**
	 * Most data, in megabytes, that an agent can copy from its conversation files into its
	 * sandbox in one step.
	 */
	@Env('N8N_AGENTS_FILES_MAX_IMPORT_MB')
	maxImportMb: number = 200;

	/**
	 * How often (seconds) each main checks that the channels of its published
	 * agents are actually running, and retries the ones that are not. Set to 0 to
	 * stop checking, which leaves a channel that failed to start down until the
	 * agent is republished or the instance restarts.
	 */
	@Env('N8N_AGENTS_CHANNEL_RECONCILE_INTERVAL')
	channelReconcileIntervalSeconds: number = 60;

	/**
	 * For testing only. Lets the WhatsApp setup accept a short-lived access token,
	 * like the one on the API Setup page in Meta. A channel that uses one stops
	 * working when the token expires, about a day later.
	 */
	@Env('N8N_AGENTS_WHATSAPP_ALLOW_TEMPORARY_TOKEN')
	whatsAppAllowTemporaryToken: boolean = false;
}
