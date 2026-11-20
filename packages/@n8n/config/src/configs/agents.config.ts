import { Time } from '@n8n/constants';
import { z } from 'zod';

import { CommaSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';
import { nonnegativeIntSchema, positiveIntSchema } from '../schemas';

const memoryLevelSchema = z.coerce.number().gt(0).lte(1);

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

	/**
	 * Whether users can share credentials and other resources with agents, and
	 * see agent projects in project lists. Each agent has its own service account
	 * either way. Set the same value on every main instance.
	 */
	@Env('N8N_AGENTS_SERVICE_ACCOUNTS_ENABLED')
	serviceAccountsEnabled: boolean = false;

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
	@Env('N8N_AGENTS_FILES_MAX_GENERATED_FILE_SIZE_MB', nonnegativeIntSchema)
	maxGeneratedFileSizeMb: number = 50;

	/**
	 * Most files that tools and the sandbox can store in one agent conversation, sub-agents
	 * included. Files that users upload don't count.
	 */
	@Env('N8N_AGENTS_FILES_MAX_GENERATED_COUNT', nonnegativeIntSchema)
	maxGeneratedFileCount: number = 100;

	/**
	 * Most data, in megabytes, that tools and the sandbox can store in one agent
	 * conversation, sub-agents included.
	 */
	@Env('N8N_AGENTS_FILES_MAX_GENERATED_TOTAL_MB', nonnegativeIntSchema)
	maxGeneratedTotalMb: number = 500;

	/**
	 * Most data, in megabytes, that one agent conversation can store, sub-agents included.
	 * This counts user uploads and files from tools and the sandbox. When a conversation is
	 * full, n8n rejects new uploads.
	 */
	@Env('N8N_AGENTS_FILES_MAX_TOTAL_MB', nonnegativeIntSchema)
	maxTotalMb: number = 1536;

	/**
	 * Most data, in megabytes, that an agent can copy from its conversation files into its
	 * sandbox in one step.
	 */
	@Env('N8N_AGENTS_FILES_MAX_IMPORT_MB', nonnegativeIntSchema)
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
	 * Most requests that one IP address can send to the agent webhook channel in 5 minutes.
	 * Each main instance counts its requests separately. Set to 0 to turn off the limit, for
	 * example when one backend sends the requests of all your users.
	 */
	@Env('N8N_AGENTS_WEBHOOK_CHANNEL_RATE_LIMIT', nonnegativeIntSchema)
	webhookChannelRateLimit: number = 300;

	/**
	 * For testing only. Lets the WhatsApp setup accept a short-lived access token,
	 * like the one on the API Setup page in Meta. A channel that uses one stops
	 * working when the token expires, about a day later.
	 */
	@Env('N8N_AGENTS_WHATSAPP_ALLOW_TEMPORARY_TOKEN')
	whatsAppAllowTemporaryToken: boolean = false;

	/**
	 * In queue mode, lets main instances send agent turns to workers that have
	 * `N8N_AGENTS_WORKER_ENABLED` set. Use the same value on every main instance.
	 * When no agent worker is running, main instances run the turns themselves.
	 *
	 * Turns from n8n Assistant, Discord, and WhatsApp always run on main
	 * instances. Use database or S3 binary data storage so that workers can read
	 * agent files.
	 */
	@Env('N8N_AGENTS_QUEUE_MODE_ENABLED')
	queueModeEnabled: boolean = false;

	/**
	 * Lets this worker run agent turns that main instances send to it. Only has
	 * an effect in queue mode, when `N8N_AGENTS_QUEUE_MODE_ENABLED` is set on
	 * your main instances.
	 */
	@Env('N8N_AGENTS_WORKER_ENABLED')
	workerEnabled: boolean = false;

	/**
	 * Maximum number of agent turns that one worker runs at the same time.
	 * Background sub-agents that run on the worker count toward this limit. A
	 * turn spends most of its time waiting for the model, so a worker with one
	 * CPU core and 1 GB of memory runs 30 turns with room to spare for tools.
	 * Raise it when your workers have more CPU. Only applies
	 * when `N8N_AGENTS_WORKER_ENABLED` is set.
	 */
	@Env('N8N_AGENTS_WORKER_CONCURRENCY', positiveIntSchema)
	workerConcurrency: number = 30;

	/**
	 * Maximum number of agent turns that one main instance runs at the same time
	 * before it takes over turns that agent workers didn't start in time. A main
	 * takes over a turn only when the agent workers stop making progress, not
	 * when they're just busy. Set to 0 so that main instances never run these
	 * turns while an agent worker is running. `N8N_AGENTS_MAIN_MAX_TURNS` also
	 * limits these turns. Only applies when `N8N_AGENTS_QUEUE_MODE_ENABLED` is
	 * set.
	 */
	@Env('N8N_AGENTS_MAIN_FALLBACK_TURNS', nonnegativeIntSchema)
	mainFallbackTurns: number = 5;

	/**
	 * Maximum number of agent turns that one main instance runs at the same time.
	 * Turns over the limit wait until the main instance has room or an agent
	 * worker takes them. Only applies when `N8N_AGENTS_QUEUE_MODE_ENABLED` is set.
	 */
	@Env('N8N_AGENTS_MAIN_MAX_TURNS', positiveIntSchema)
	mainMaxTurns: number = 20;

	/**
	 * Memory use of a main instance, as a share of its memory limit from 0 to 1,
	 * above which it starts no new agent turns and opens no new live chat
	 * streams. Turns wait or run on agent workers, and the chat loads the reply
	 * when it's ready. Set to 1 to turn off this check. Only applies when
	 * `N8N_AGENTS_QUEUE_MODE_ENABLED` is set.
	 */
	@Env('N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL', memoryLevelSchema)
	mainMemoryHoldLevel: number = 0.8;

	/**
	 * Maximum number of chat messages that one main instance accepts at the same
	 * time. Accepting a message includes the permission checks, the agent and
	 * credential checks, and adding the message to the queue. Messages over the
	 * limit wait up to 10 seconds. After that, n8n rejects the message and the
	 * user sees that n8n is busy. Set to 0 for no limit. Only applies when
	 * `N8N_AGENTS_QUEUE_MODE_ENABLED` is set.
	 */
	@Env('N8N_AGENTS_MAIN_MAX_INTAKE', nonnegativeIntSchema)
	mainMaxIntake: number = 20;

	/**
	 * Maximum number of live chat streams that one main instance keeps open.
	 * Over the limit, n8n still accepts the message, and the chat loads the
	 * reply when it's ready instead of showing it as it's written. Set to 0 for
	 * no limit. Only applies when `N8N_AGENTS_QUEUE_MODE_ENABLED` is set.
	 */
	@Env('N8N_AGENTS_MAIN_MAX_STREAMS', nonnegativeIntSchema)
	mainMaxStreams: number = 200;

	/**
	 * Maximum number of agent turns that can wait for an agent worker. When this
	 * many turns wait, n8n rejects new chat messages, app chats, and webhook
	 * channel requests with a busy error, and webhook callers get a `503` with a
	 * `Retry-After` header. Messages from chat platforms such as Slack still
	 * queue. Set to 0 for no limit. Only applies when
	 * `N8N_AGENTS_QUEUE_MODE_ENABLED` is set.
	 */
	@Env('N8N_AGENTS_QUEUE_MAX_WAITING', nonnegativeIntSchema)
	queueMaxWaiting: number = 200;

	/**
	 * Maximum time, in seconds, that an app chat or a webhook channel request
	 * waits for an agent worker to start it. After that, n8n rejects the request
	 * with a busy error, and webhook callers get a `503` with a `Retry-After`
	 * header. Set to 0 to wait without a limit. Only applies when
	 * `N8N_AGENTS_QUEUE_MODE_ENABLED` is set.
	 */
	@Env('N8N_AGENTS_QUEUE_MAX_WAIT', nonnegativeIntSchema)
	queueMaxWaitSeconds: number = 60;

	/**
	 * Maximum time, in seconds, that one agent turn can run. n8n stops a turn that
	 * runs longer and marks it as failed. A turn that waits for a tool approval
	 * ends while it waits, so the wait doesn't count. Set to `0` for no limit.
	 */
	@Env('N8N_AGENTS_TURN_TIMEOUT', nonnegativeIntSchema)
	turnTimeoutSeconds: number = 0;
}
