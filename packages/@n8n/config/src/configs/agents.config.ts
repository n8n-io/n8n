import { CommaSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';

/**
 * Known agent sub-feature modules. Add a token here to make it valid in
 * `N8N_AGENTS_MODULES`. The backend fails fast on unknown tokens so typos
 * surface at startup instead of silently disabling a feature.
 */
export const AGENTS_MODULE_NAMES = ['node-tools-searcher'] as const;

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
	checkpointTtlSeconds: number = 345600; // 96 hours

	/**
	 * Comma-separated list of agent sub-feature modules to enable. Each entry
	 * gates a specific frontend/runtime capability inside the agents module.
	 * Currently known: `node-tools-searcher` (surfaces the "Built-in node tools"
	 * toggle in the agent editor).
	 *
	 * Gates the UI surface only — existing agents persisted with a given
	 * capability turned on continue to run even if its token is removed here.
	 */
	@Env('N8N_AGENTS_MODULES')
	modules: AgentsModuleArray = [];
}
