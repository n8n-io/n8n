import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import type { TestCase } from '../types/evaluation';

const testCasesSchema = z.object({
	testCases: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			summary: z.string(),
			prompt: z.string(),
		}),
	),
});

const systemPrompt = `You are an expert at generating diverse test cases for an n8n workflow builder AI. Create test cases that cover various real-world scenarios and complexity levels.

## Test Case Requirements:

1. **Simple Test Cases**: Single operation workflows
   - API calls
   - Data transformations
   - File operations
   - Basic integrations

2. **Medium Test Cases**: Multi-step workflows with logic
   - Conditional logic (IF nodes)
   - Data filtering and transformation
   - Multiple API integrations
   - Error handling

3. **Complex Test Cases**: Advanced workflows
   - Parallel execution branches
   - Complex error handling and retry logic
   - Multiple integrations with data synchronization
   - Webhooks and event-driven flows

## Guidelines:
- Create realistic business scenarios
- Include specific requirements that can be evaluated
- Vary the domains (e-commerce, HR, marketing, DevOps, etc.)
- Include both common and edge-case scenarios
- Make prompts clear and unambiguous
- Specify expected node types when possible

## Output Format:
Each test case should have:
- Unique ID (e.g., "test_001")
- Descriptive name
- Brief description
- Clear prompt that a user would give
- Expected node types (array of node names)
- Complexity level
- Relevant tags`;

const humanTemplate = `Generate {count} diverse test cases for workflow generation evaluation.

Focus on:
{focus}

Ensure a good mix of complexity levels and use cases.`;

export function createTestCaseGeneratorChain(llm: BaseChatModel) {
	if (!llm.bindTools) {
		throw new OperationalError("LLM doesn't support binding tools");
	}

	const prompt = ChatPromptTemplate.fromMessages([
		new SystemMessage(systemPrompt),
		HumanMessagePromptTemplate.fromTemplate(humanTemplate),
	]);

	const llmWithStructuredOutput = llm.withStructuredOutput(testCasesSchema);
	return prompt.pipe(llmWithStructuredOutput);
}

export async function generateTestCases(
	llm: BaseChatModel,
	count: number = 10,
	focus: string = 'balanced mix of API integrations, data processing, and automation scenarios',
): Promise<TestCase[]> {
	const chain = createTestCaseGeneratorChain(llm);

	const result = (await chain.invoke({
		count,
		focus,
	})) as z.infer<typeof testCasesSchema>;

	return result.testCases;
}

export const basicTestCases: TestCase[] = [
	{
		id: 'invoice-pipeline',
		name: 'Invoice processing pipeline',
		prompt:
			'Create an invoice parsing workflow using n8n forms. Extract key information (vendor, date, amount, line items) using AI, validate the data, and store structured information in Airtable. Generate a weekly spending report every Sunday at 6 PM using AI analysis and send via email.',
	},
	{
		id: 'ai-news-digest',
		name: 'Daily AI news digest',
		prompt:
			'Create a workflow that fetches the latest AI news every morning at 8 AM. It should aggregate news from multiple sources, use LLM to summarize the top 5 stories, generate a relevant image using AI, and send everything as a structured Telegram message with article links. I should be able to chat about the news with the LLM so at least 40 last messages should be stored.',
	},
	{
		id: 'rag-assistant',
		name: 'RAG knowledge assistant',
		prompt:
			'Build a pipeline that accepts PDF, CSV, or JSON files through an n8n form. Chunk documents into 1000-token segments, generate embeddings, and store in a vector database. Use the filename as the document key and add metadata including upload date and file type. Include a chatbot that can answer questions based on a knowledge base.',
	},
	{
		id: 'email-summary',
		name: 'Summarize emails with AI',
		prompt:
			'Build a workflow that retrieves the last 50 emails from multiple email accounts. Merge all emails, perform AI analysis to identify action items, priorities, and sentiment. Generate a brief summary and send to Slack with categorized insights and recommended actions.',
	},
	{
		id: 'youtube-auto-chapters',
		name: 'YouTube video chapters',
		prompt:
			"I want to build an n8n workflow that automatically creates YouTube chapter timestamps by analyzing the video captions. When I trigger it manually, it should take a video ID as input, fetch the existing video metadata and captions from YouTube, use an AI language model like Google Gemini to parse the transcript into chapters with timestamps, and then update the video's description with these chapters appended. The goal is to save time and improve SEO by automating the whole process.",
	},
	{
		id: 'pizza-delivery',
		name: 'Pizza delivery chatbot',
		prompt:
			"I need an n8n workflow that creates a chatbot for my pizza delivery service. The bot should be able to answer customer questions about our pizza menu, take their orders accurately by capturing pizza type, quantity, and customer details, and also provide real-time updates when customers ask about their order status. It should use OpenAI's gpt-4.1-mini to handle conversations and integrate with HTTP APIs to get product info and manage orders. The workflow must maintain conversation context so the chatbot feels natural and can process multiple user queries sequentially.",
	},
	{
		id: 'lead-qualification',
		name: 'Lead qualification and call scheduling',
		prompt:
			'Create a form with fields for email, company, and role. Build an automation that processes form submissions, enrich with company data from their website, uses AI to qualify the lead, sends data to Google Sheets. For high-score leads it should also schedule a 15-min call in a free slot in my calendar and send a confirmation email to both me and the lead.',
	},
	{
		id: 'multi-agent-research',
		name: 'Multi-agent research workflow',
		prompt:
			'Create a multi-agent AI workflow where different AI agents collaborate to research a topic, fact-check information, and compile comprehensive reports.',
	},
	{
		id: 'google-sheets-processing',
		name: 'Process large Google Sheets data',
		prompt:
			'Create a workflow that reads all rows from a Google Sheets document with thousands of customer records. For each row, call an external API to get additional customer data, process the response, and update the row with the enriched information. Handle rate limiting and errors gracefully.',
	},
	{
		id: 'extract-from-file',
		name: 'Extract data from uploaded files',
		prompt:
			'Build a workflow that accepts file uploads through an n8n form. When users upload PDF documents, CSV files, or Excel spreadsheets, automatically extract the text content and data from these files. Transform the extracted data into a structured format and save it to a database or send it via email as a summary.',
	},
];
