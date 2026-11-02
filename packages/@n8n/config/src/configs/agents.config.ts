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
	 * Whether agents keep their skills in the skills hub instead of inline on the agent.
	 * Read once when the agents module starts; a change needs a restart. Set the same value
	 * on every main and worker. With it on, each main copies inline skills into the hub at
	 * startup, once per agent.
	 */
	@Env('N8N_AGENTS_SKILLS_HUB_ENABLED')
	skillsHubEnabled: boolean = false;

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
	 * Set to `mxc` to run agent workspace commands and scripts on this host in Microsoft
	 * Execution Containers instead of a remote sandbox. It needs
	 * `N8N_AGENTS_AI_SANDBOX_ENABLED=true`. Agent workspaces then live on this host's disk, so
	 * only use it with a single main instance. When unset, agents use the sandbox provider of
	 * the n8n Assistant.
	 */
	@Env('N8N_AGENTS_AI_SANDBOX_PROVIDER')
	sandboxProvider: string = '';

	/**
	 * Absolute path of the folder where n8n creates one workspace folder for each agent when
	 * the agent sandbox provider is `mxc`. When unset, n8n uses `n8n-agent-workspaces` in the
	 * home folder of the user that runs n8n. Keep it outside the n8n user folder, because agent
	 * commands can't access that folder.
	 */
	@Env('N8N_AGENTS_MXC_WORKSPACE_ROOT')
	mxcWorkspaceRoot: string = '';

	/**
	 * Comma-separated list of absolute folder paths that agent commands can read but not
	 * change when the agent sandbox provider is `mxc`, for example `/data/reports,/data/exports`.
	 */
	@Env('N8N_AGENTS_MXC_READONLY_PATHS')
	mxcReadonlyPaths: string = '';

	/**
	 * Absolute path of a folder where n8n saves a report each time an agent command tries to
	 * access a blocked file or network address, when the agent sandbox provider is `mxc`.
	 * Only works on Windows. When unset, n8n doesn't save these reports.
	 */
	@Env('N8N_AGENTS_MXC_DENIALS_REPORT_DIR')
	mxcDenialsReportDir: string = '';

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
