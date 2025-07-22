export interface WorkflowSuggestion {
	id: string;
	summary: string; // Short text shown on the pill
	prompt: string; // Full detailed prompt sent to AI
}

export const WORKFLOW_SUGGESTIONS: WorkflowSuggestion[] = [
	{
		id: 'rag-assistant',
		summary: 'Build RAG knowledge assistant',
		prompt:
			'Create a RAG (Retrieval-Augmented Generation) workflow that can answer questions based on a knowledge base. Include document ingestion, vector storage, and a chat interface.',
	},
	{
		id: 'email-analyzer',
		summary: 'Analyze and summarize emails with AI',
		prompt:
			'Build a workflow that monitors an email inbox, uses AI to analyze and summarize incoming emails, categorizes them by topic, and sends daily digest reports.',
	},
	{
		id: 'chatbot-memory',
		summary: 'Build AI chatbot with memory',
		prompt:
			'Create an AI chatbot workflow with conversation memory that can maintain context across multiple interactions. Include user authentication and conversation history storage.',
	},
	{
		id: 'spreadsheet-ai',
		summary: 'Analyze spreadsheet data with AI assistant',
		prompt:
			'Build a workflow that reads data from Google Sheets or Excel, uses AI to analyze patterns and insights, and generates automated reports with visualizations.',
	},
	{
		id: 'multi-agent-research',
		summary: 'Build multi-agent research workflow',
		prompt:
			'Create a multi-agent AI workflow where different AI agents collaborate to research a topic, fact-check information, and compile comprehensive reports.',
	},
];
