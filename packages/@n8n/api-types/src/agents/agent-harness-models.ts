export const AGENT_HARNESS_ADAPTERS = ['claude-code', 'codex'] as const;

export type AgentHarnessAdapter = (typeof AGENT_HARNESS_ADAPTERS)[number];

export const AGENT_HARNESS_MODEL_PROVIDERS = {
	'claude-code': 'anthropic',
	codex: 'openai',
} as const satisfies Record<AgentHarnessAdapter, string>;

/**
 * Models supported by each installed harness adapter. The model selector
 * intersects these ids with the selected credential's provider catalog.
 */
export const AGENT_HARNESS_MODELS = {
	'claude-code': [
		'anthropic/claude-fable-5',
		'anthropic/claude-opus-5',
		'anthropic/claude-sonnet-5',
		'anthropic/claude-haiku-4-5',
	],
	codex: [
		'openai/gpt-5.6-sol',
		'openai/gpt-5.6-terra',
		'openai/gpt-5.6-luna',
		'openai/gpt-5.5',
		'openai/gpt-5.2',
	],
} as const satisfies Record<AgentHarnessAdapter, readonly string[]>;

export function isAgentHarnessModel(adapter: AgentHarnessAdapter, model: string): boolean {
	return AGENT_HARNESS_MODELS[adapter].some((supportedModel) => supportedModel === model);
}
