import type { BaseTextKey } from '@n8n/i18n';
import type { AgentIntegrationConfig, AgentJsonConfig, AgentJsonToolConfig } from '@n8n/api-types';

/**
 * A one-click starter agent template. Selecting one writes a working example
 * onto a blank agent so the user sees something to react to instead of an
 * empty screen. `model` is deliberately absent: the seeded default model stays.
 */
export interface AgentTemplate {
	id: string;
	labelKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	/** Written onto a blank agent. `model` is never set here. */
	config: {
		name: string;
		instructions: string;
		tools?: AgentJsonToolConfig[];
		/** Draft channel integrations (empty `credentialId`) so the trigger
		 * chips show as highlighted until the user connects a credential.
		 * The trigger types are derived from this list — no separate
		 * `connectedTriggers` field is needed. */
		integrations?: AgentIntegrationConfig[];
	};
}

export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
	{
		id: 'customer-support',
		labelKey: 'agents.builder.templates.customerSupport.label',
		descriptionKey: 'agents.builder.templates.customerSupport.description',
		config: {
			name: 'Customer Support Agent',
			instructions:
				'You are a friendly customer support agent. Answer user questions using the provided knowledge base. If you cannot find an answer, say so and offer to escalate to a human agent. Always be polite and concise.',
			integrations: [{ type: 'telegram', credentialId: '' }],
		},
	},
	{
		id: 'research-assistant',
		labelKey: 'agents.builder.templates.researchAssistant.label',
		descriptionKey: 'agents.builder.templates.researchAssistant.description',
		config: {
			name: 'Research Assistant',
			instructions:
				'You are a research assistant. Use the Wikipedia tool to look up factual information, and the Calculator tool to perform arithmetic on any numbers you find. Summarize key findings in a structured format and cite your sources.',
			tools: [
				{
					type: 'node',
					name: 'Wikipedia',
					description: 'Search Wikipedia for factual information.',
					node: {
						nodeType: '@n8n/n8n-nodes-langchain.toolWikipedia',
						nodeTypeVersion: 1,
						nodeParameters: {},
					},
				},
				{
					type: 'node',
					name: 'Calculator',
					description: 'Perform arithmetic calculations.',
					node: {
						nodeType: '@n8n/n8n-nodes-langchain.toolCalculator',
						nodeTypeVersion: 1,
						nodeParameters: {},
					},
				},
			],
		},
	},
	{
		id: 'data-analyst',
		labelKey: 'agents.builder.templates.dataAnalyst.label',
		descriptionKey: 'agents.builder.templates.dataAnalyst.description',
		config: {
			name: 'Data Analyst',
			instructions:
				'You are a data analyst. Answer questions by querying the connected database, summarizing results, and presenting insights. Use clear tables when helpful.',
		},
	},
	{
		id: 'social-media-monitor',
		labelKey: 'agents.builder.templates.socialMediaMonitor.label',
		descriptionKey: 'agents.builder.templates.socialMediaMonitor.description',
		config: {
			name: 'Social Media Monitor',
			instructions:
				'You are a social media monitoring agent. Track mentions of configured keywords, summarize sentiment, and alert the team when critical issues are detected.',
		},
	},
];

/**
 * A blank agent: no instructions, no tools, and no channel integrations.
 * `name` and `model` are ignored — both are seeded on every new agent, so a
 * default name or model does not count as content the user would lose by
 * applying a template.
 */
export function isAgentConfigBlank(config: AgentJsonConfig): boolean {
	return (
		config.instructions.trim() === '' &&
		(config.tools?.length ?? 0) === 0 &&
		(config.integrations?.length ?? 0) === 0
	);
}

/**
 * Returns the config with the template written onto it, or `null` when the
 * agent already has content (instructions or tools). `name` is only replaced
 * while it still equals `defaultName` (the seeded "New Agent"), so a renamed
 * agent keeps its name. `model` and every other field are preserved.
 */
export function applyAgentTemplate(
	config: AgentJsonConfig,
	template: AgentTemplate,
	defaultName: string,
): AgentJsonConfig | null {
	if (!isAgentConfigBlank(config)) return null;
	return {
		...config,
		name: config.name === defaultName ? template.config.name : config.name,
		instructions: template.config.instructions,
		tools: template.config.tools ?? [],
		integrations: template.config.integrations ?? [],
	};
}
