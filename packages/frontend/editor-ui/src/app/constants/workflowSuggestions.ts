export interface WorkflowSuggestion {
	id: string;
	summary: string; // Short text shown on the pill
	prompt: string; // Full prompt
}

export const WORKFLOW_SUGGESTIONS: WorkflowSuggestion[] = [
	{
		id: 'multi-agent-research',
		summary: 'Multi-agent research workflow',
		prompt:
			'Create a multi-agent AI workflow using GPT-4.1-mini where several agents work together to research a topic, fact-check the findings, and write a report that\'s sent as an HTML email. One agent should gather recent, credible information about the topic. Another agent should verify the facts and only mark something as "verified" if it appears in at least two independent sources. A third agent should combine the verified information into a clear, well-written report under 1,000 words. A final agent should edit and format the report to make it look clean and professional in the body of the email. Use Gmail to send the report.',
	},
	{
		id: 'email-summary',
		summary: 'Summarize emails with AI',
		prompt:
			'Create an automation that runs on Monday mornings. It reads my Gmail inbox from the weekend, analyzes them with GPT-4.1-mini to find action items and priorities, and emails me a structured email using Gmail.',
	},
	{
		id: 'ai-news-digest',
		summary: 'Daily AI news digest',
		prompt:
			'Build an automation that runs every night 8pm. Use the NewsAPI "/everything" endpoint to search for AI-related news from the day. Pick the top 5 articles and use OpenAI GPT-4.1-mini to summarize each in two sentences. Generate an image using OpenAI based on the top article\'s summary. Send a structured Telegram message.',
	},
	{
		id: 'daily-weather-report',
		summary: 'Daily weather report',
		prompt:
			'Create an automation that checks the weather for my location every morning at 5 a.m using OpenWeather. Send me a short weather report by email using Gmail. Use OpenAI GPT-4.1-mini to write a short, fun formatted email body by adding personality when describing the weather and how the day might feel. Include all details relevant to decide on my plans and clothes for the day.',
	},
	{
		id: 'invoice-pipeline',
		summary: 'Invoice processing pipeline',
		prompt:
			'Create an invoice processing workflow using an n8n Form. When a user submits an invoice file (PDF or image) with their email address, use OpenAI GPT-4.1-mini to extract invoice data. Then, validate the date format is correct, the currency is valid, and the total amount is greater than zero. If validation fails, email the user a clear error message that explains which check failed from my Gmail. If the data passes validation, store the structured result in a datatable plus email the user. Every Monday morning, generate a weekly spending report using GPT-4.1-mini based on stored invoices and send a clean email using Gmail.',
	},
	{
		id: 'rag-assistant',
		summary: 'RAG knowledge assistant',
		prompt:
			'Build an automation that creates a document-to-chat RAG pipeline. The workflow starts with an n8n Form where a user uploads one or more files (PDF, CSV, or JSON). Each upload should trigger a process that reads the file, splits it into chunks, and generates embeddings using OpenAI GPT-4.1-mini model, saved in one Pinecone table. Add a second part of the workflow for querying: use a Chat Message Trigger to act as a chatbot interface. When a user sends a question, retrieve the top 5 most relevant chunks from Pinecone, pass them into GPT-4.1-mini as context, and have it answer naturally using only the retrieved information. If a question can\'t be answered confidently, the bot should respond with: "I couldn\'t find that in the uploaded documents." Log each chat interaction in a Data Table with the user query, matched file(s), and timestamp. Send a daily summary email through Gmail showing total questions asked, top files referenced, and any failed lookups.',
	},
	{
		id: 'lead-qualification',
		summary: 'Lead qualification and call scheduling',
		prompt:
			'Create an n8n form with a lead generation form I can embed on my website homepage. Build an automation that processes form submissions, uses AI to qualify the lead, sends data to an n8n data table. For high-score leads, it should also email them to offer to schedule a 15-min call in a free slot in my calendar.',
	},
	{
		id: 'youtube-auto-chapters',
		summary: 'YouTube video chapters',
		prompt:
			"Build an n8n workflow that automatically generates YouTube chapter timestamps from video captions. Use the n8n chat trigger for me to enter the URL of the YouTube video. Use the YouTube Get a video node to get the video title, description, and existing metadata. Use the YouTube Captions API to download the transcript for the given video ID. Send the transcript to AI agent using Anthropic's Claude model. Prompt the model to identify topic shifts and return structured output in timestamp - chapter format. Append the generated chapter list to the existing video description. Use the YouTube Update a video node to update the video description. Respond back with the updates using the respond to chat node.",
	},
];
