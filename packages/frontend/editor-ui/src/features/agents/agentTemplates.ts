import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import type { AgentJsonConfig } from '@n8n/api-types';

/**
 * A one-click starter agent template. Selecting one pre-fills the agent
 * editor config so the user sees a working example immediately instead
 * of a blank screen.
 */
export interface AgentTemplate {
	id: string;
	icon: IconName;
	labelKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	/** Partial config merged into the agent's local config on apply. */
	config: Partial<AgentJsonConfig>;
	/** Channel triggers to pre-connect (without credentials). */
	connectedTriggers?: string[];
}

export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
	{
		id: 'customer-support',
		icon: 'headset',
		labelKey: 'agents.builder.templates.customerSupport.label',
		descriptionKey: 'agents.builder.templates.customerSupport.description',
		config: {
			name: 'Customer Support Agent',
			instructions:
				'You are a friendly customer support agent. Answer user questions using the provided knowledge base. If you cannot find an answer, say so and offer to escalate to a human agent. Always be polite and concise.',
			model: '',
		},
		connectedTriggers: ['telegram'],
	},
	{
		id: 'research-assistant',
		icon: 'search',
		labelKey: 'agents.builder.templates.researchAssistant.label',
		descriptionKey: 'agents.builder.templates.researchAssistant.description',
		config: {
			name: 'Research Assistant',
			instructions:
				'You are a research assistant. Use the Wikipedia tool to look up factual information, and the Calculator tool to perform arithmetic on any numbers you find. Summarize key findings in a structured format and cite your sources.',
			model: '',
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
		icon: 'chart-bar',
		labelKey: 'agents.builder.templates.dataAnalyst.label',
		descriptionKey: 'agents.builder.templates.dataAnalyst.description',
		config: {
			name: 'Data Analyst',
			instructions:
				'You are a data analyst. Answer questions by querying the connected database, summarizing results, and presenting insights. Use clear tables when helpful.',
			model: '',
		},
	},
	{
		id: 'social-media-monitor',
		icon: 'megaphone',
		labelKey: 'agents.builder.templates.socialMediaMonitor.label',
		descriptionKey: 'agents.builder.templates.socialMediaMonitor.description',
		config: {
			name: 'Social Media Monitor',
			instructions:
				'You are a social media monitoring agent. Track mentions of configured keywords, summarize sentiment, and alert the team when critical issues are detected.',
			model: '',
		},
	},
];

export function getAgentTemplateById(id: string): AgentTemplate | undefined {
	return AGENT_TEMPLATES.find((t) => t.id === id);
}
