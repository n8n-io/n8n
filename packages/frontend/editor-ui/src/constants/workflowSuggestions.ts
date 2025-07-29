export interface WorkflowSuggestion {
	id: string;
	summary: string; // Short text shown on the pill
	prompt: string; // Full prompt
}

export const WORKFLOW_SUGGESTIONS: WorkflowSuggestion[] = [
	{
		id: 'invoice-pipeline',
		summary: 'Invoice processing pipeline',
		prompt:
			'Create an invoice parsing workflow using n8n forms. Extract key information (vendor, date, amount, line items) using AI, validate the data, and store structured information in Airtable. Generate a weekly spending report every Sunday at 6 PM using AI analysis and send via email.',
	},
	{
		id: 'ai-news-digest',
		summary: 'Daily AI news digest',
		prompt:
			'Create a workflow that fetches the latest AI news every morning at 8 AM. It should aggregate news from multiple sources, use LLM to summarize the top 5 stories, generate a relevant image using AI, and send everything as a structured Telegram message with article links. I should be able to chat about the news with the LLM so at least 40 last messages should be stored.',
	},
	{
		id: 'rag-assistant',
		summary: 'RAG knowledge assistant',
		prompt:
			'Build a pipeline that accepts PDF, CSV, or JSON files through an n8n form. Chunk documents into 1000-token segments, generate embeddings, and store in a vector database. Use the filename as the document key and add metadata including upload date and file type. Include a chatbot that can answer questions based on a knowledge base.',
	},
	{
		id: 'email-summary',
		summary: 'Summarize emails with AI',
		prompt:
			'Build a workflow that retrieves the last 50 emails from multiple email accounts. Merge all emails, perform AI analysis to identify action items, priorities, and sentiment. Generate a brief summary and send to Slack with categorized insights and recommended actions.',
	},
	{
		id: 'youtube-auto-chapters',
		summary: 'YouTube video chapters',
		prompt:
			"I want to build an n8n workflow that automatically creates YouTube chapter timestamps by analyzing the video captions. When I trigger it manually, it should take a video ID as input, fetch the existing video metadata and captions from YouTube, use an AI language model like Google Gemini to parse the transcript into chapters with timestamps, and then update the video's description with these chapters appended. The goal is to save time and improve SEO by automating the whole process.",
	},
	{
		id: 'pizza-delivery',
		summary: 'Pizza delivery chatbot',
		prompt:
			"I need an n8n workflow that creates a chatbot for my pizza delivery service. The bot should be able to answer customer questions about our pizza menu, take their orders accurately by capturing pizza type, quantity, and customer details, and also provide real-time updates when customers ask about their order status. It should use OpenAI's gpt-4.1-mini to handle conversations and integrate with HTTP APIs to get product info and manage orders. The workflow must maintain conversation context so the chatbot feels natural and can process multiple user queries sequentially.",
	},
	{
		id: 'lead-qualification',
		summary: 'Lead qualification and call scheduling',
		prompt:
			'Create a form with fields for email, company, and role. Build an automation that processes form submissions, enrich with company data from their website, uses AI to qualify the lead, sends data to Google Sheets. For high-score leads it should also schedule a 15-min call in a free slot in my calendar and send a confirmation email to both me and the lead.',
	},
	{
		id: 'multi-agent-research',
		summary: 'Multi-agent research workflow',
		prompt:
			'Create a multi-agent AI workflow where different AI agents collaborate to research a topic, fact-check information, and compile comprehensive reports.',
	},
];
