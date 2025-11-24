import type { SimpleWorkflow } from '../workflow';

// retrieved from https://api.n8n.io/api/templates/categories
export const categories = [
	'AI',
	'AI Chatbot',
	'AI RAG',
	'AI Summarization',
	'Content Creation',
	'CRM',
	'Crypto Trading',
	'DevOps',
	'Document Extraction',
	'Document Ops',
	'Engineering',
	'File Management',
	'HR',
	'Internal Wiki',
	'Invoice Processing',
	'IT Ops',
	'Lead Generation',
	'Lead Nurturing',
	'Marketing',
	'Market Research',
	'Miscellaneous',
	'Multimodal AI',
	'Other',
	'Personal Productivity',
	'Project Management',
	'Sales',
	'SecOps',
	'Social Media',
	'Support',
	'Support Chatbot',
	'Ticket Management',
] as const;

export type Category = (typeof categories)[number];

/**
 * Query parameters for workflow examples search
 */
export interface TemplateSearchQuery {
	search?: string;
	rows?: number;
	page?: number;
	// sort is structured like column:desc/asc
	// examples: createdAt:desc|asc, _text_match:desc|asc, rank:desc|asc, trendingScore:desc|asc
	sort?: string;
	// 0 represents free
	price?: number;
	// how to combine these filters together
	combineWith?: 'or' | 'and';
	// category can be used to search by a pre-defined list
	category?: Category;
	// there are apps/nodes search properties as well - but have a specific format which is
	// hard to feed to the agent for use in search (free search will work better)
}

// describes a workflow that can be retrieved, there are many more properties such as
// icons, created at dates and user information - but these would not be useful to the builder
export interface TemplateWorkflowDescription {
	id: number;
	name: string;
	description: string;
	price: number;
	totalViews: number;
	nodes: Array<{
		id: number;
		name: string;
		displayName: string;
		nodeCategories: Array<{ id: number; name: string }>;
	}>;
	user: {
		id: number;
		name: string;
		username: string;
		verified: boolean;
		bio: string;
	};
}

export interface TemplateSearchResponse {
	totalWorkflows: number;
	workflows: TemplateWorkflowDescription[];
	// there is also a filters field which lists what was matched, but this isn't
	// useful to the workflow builder
}

export interface TemplateFetchResponse {
	id: number;
	name: string;
	workflow: SimpleWorkflow;
}
