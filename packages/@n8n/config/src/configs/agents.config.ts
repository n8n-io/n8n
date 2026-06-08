import { Time } from '@n8n/constants';

import { CommaSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';

/**
 * Known agent sub-feature modules. Add a token here to make it valid in
 * `N8N_AGENTS_MODULES`. The backend fails fast on unknown tokens so typos
 * surface at startup instead of silently disabling a feature.
 */
export const AGENTS_MODULE_NAMES = ['node-tools-searcher', 'knowledge-base'] as const;

export type AgentsModuleName = (typeof AGENTS_MODULE_NAMES)[number];

class AgentsModuleArray extends CommaSeparatedStringArray<AgentsModuleName> {
	constructor(str: string) {
		super(str);

		for (const name of this) {
			if (!AGENTS_MODULE_NAMES.includes(name)) {
				throw new Error(
					`Unknown agents module: "${name}". Valid tokens: ${AGENTS_MODULE_NAMES.join(', ')}.`,
				);
			}
		}
	}
}

@Config
export class AgentsConfig {
	/** TTL in seconds for agent checkpoint records. Stale checkpoints older than this are pruned. */
	@Env('N8N_AGENTS_CHECKPOINT_TTL')
	checkpointTtlSeconds: number = 96 * Time.hours.toSeconds;

	/** Maximum number of sub-agents a single parent run may spawn. Bounds fan-out width. */
	@Env('N8N_AGENTS_SUBAGENT_MAX_CHILDREN')
	subAgentMaxChildren: number = 5;

	/** Abort an individual sub-agent run after this many milliseconds. */
	@Env('N8N_AGENTS_SUBAGENT_TIMEOUT_MS')
	subAgentTimeoutMs: number = 5 * Time.minutes.toMilliseconds;

	/**
	 * Comma-separated list of opt-in agent sub-feature modules to enable.
	 * Each entry gates a specific frontend/runtime capability inside the
	 * agents module. Currently known:
	 * - `node-tools-searcher` — surfaces the "Built-in node tools" toggle in
	 *   the agent editor.
	 * - `knowledge-base` — enables agent knowledge file endpoints and search.
	 */
	@Env('N8N_AGENTS_MODULES')
	modules: AgentsModuleArray = [];

	/** Whether agent knowledge sandbox/search runtime is enabled. File endpoints remain gated by `knowledge-base`. */
	@Env('N8N_AGENTS_AI_SANDBOX_ENABLED')
	aiSandboxEnabled: boolean = true;

	/** Agent knowledge sandbox provider. Only `daytona` is supported for knowledge-base runtime operations. */
	@Env('N8N_AGENTS_AI_SANDBOX_PROVIDER')
	aiSandboxProvider: string = 'n8n-sandbox';

	/** Daytona API URL for agent knowledge sandboxing. */
	@Env('DAYTONA_API_URL')
	daytonaApiUrl: string = '';

	/** Daytona API key for agent knowledge sandboxing. */
	@Env('DAYTONA_API_KEY')
	daytonaApiKey: string = '';

	/** Daytona image used for agent knowledge operations. */
	@Env('N8N_AGENTS_AI_SANDBOX_IMAGE')
	aiSandboxImage: string = 'daytonaio/sandbox:0.5.0';

	/** Agent knowledge sandbox command timeout in milliseconds. */
	@Env('N8N_AGENTS_AI_SANDBOX_TIMEOUT')
	aiSandboxTimeout: number = 5 * Time.minutes.toMilliseconds;

	/** Prefix prepended to Daytona agent knowledge sandbox names and labels. */
	@Env('N8N_AGENTS_AI_SANDBOX_NAME_PREFIX')
	aiSandboxNamePrefix: string = '';

	/** Shared Daytona volume ID used for agent knowledge corpus projections. */
	@Env('N8N_AGENTS_AI_SANDBOX_DAYTONA_VOLUME_ID')
	aiSandboxDaytonaVolumeId: string = '';

	/** Prefix inside the shared Daytona volume for agent knowledge corpus projections. */
	@Env('N8N_AGENTS_AI_SANDBOX_DAYTONA_VOLUME_SUBPATH_PREFIX')
	aiSandboxDaytonaVolumeSubpathPrefix: string = 'agent-knowledge';
}
