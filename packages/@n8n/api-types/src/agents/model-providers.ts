export const AGENT_MODEL_PROVIDERS = [
	'openai',
	'anthropic',
	'google',
	'azure-openai',
	'aws-bedrock',
	'xai',
	'groq',
	'openrouter',
	'deepseek',
	'cohere',
	'mistral',
	'vercel',
	'nvidia',
] as const;

export type AgentModelProvider = (typeof AGENT_MODEL_PROVIDERS)[number];

const AGENT_MODEL_PROVIDER_SET = new Set<string>(AGENT_MODEL_PROVIDERS);

export function isAgentModelProvider(provider: string): provider is AgentModelProvider {
	return AGENT_MODEL_PROVIDER_SET.has(provider);
}
