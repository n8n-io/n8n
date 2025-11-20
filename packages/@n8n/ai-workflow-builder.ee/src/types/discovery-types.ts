import type { INodeTypeDescription } from 'n8n-workflow';

import type { PromptCategorization } from './categorization';

export interface DiscoveryContext {
	categorization?: PromptCategorization;
	nodesFound: Array<{ nodeType: INodeTypeDescription; reasoning: string }>;
	bestPractices?: string;
	requirements: string[];
	constraints: string[];
	dataNeeds: string[];
	summary: string;
}
