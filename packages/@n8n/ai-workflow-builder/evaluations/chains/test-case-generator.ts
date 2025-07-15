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
			description: z.string(),
			prompt: z.string(),
			expectedNodeTypes: z.array(z.string()),
			complexity: z.enum(['simple', 'medium', 'complex']),
			tags: z.array(z.string()),
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

// Pre-defined basic test cases for immediate use
export const basicTestCases: TestCase[] = [
	{
		id: 'test_simple_001',
		name: 'Basic API Data Fetch',
		description: 'Fetch data from an API and save to Google Sheets',
		prompt:
			'Create a workflow that fetches weather data from OpenWeatherMap API for New York and saves it to a Google Sheet',
		expectedNodeTypes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.googleSheets'],
		complexity: 'simple',
		tags: ['api', 'integration', 'data-collection'],
	},
	{
		id: 'test_simple_002',
		name: 'CSV Data Processing',
		description: 'Read CSV file, transform data, and send email',
		prompt:
			'Build a workflow that reads a CSV file with customer data, filters for customers who spent over $100, and sends them a thank you email',
		expectedNodeTypes: [
			'n8n-nodes-base.readBinaryFile',
			'n8n-nodes-base.if',
			'n8n-nodes-base.emailSend',
		],
		complexity: 'simple',
		tags: ['file-processing', 'filtering', 'email'],
	},
	{
		id: 'test_medium_001',
		name: 'Slack Notification System',
		description: 'Monitor GitHub repo and notify Slack on new issues',
		prompt:
			'Create a workflow that monitors a GitHub repository for new issues, checks if they have a "bug" label, and sends a notification to Slack with issue details and assigns it to the on-call engineer',
		expectedNodeTypes: ['n8n-nodes-base.github', 'n8n-nodes-base.if', 'n8n-nodes-base.slack'],
		complexity: 'medium',
		tags: ['monitoring', 'conditional-logic', 'notifications'],
	},
	{
		id: 'test_medium_002',
		name: 'Data Sync Pipeline',
		description: 'Sync data between multiple systems with transformation',
		prompt:
			'Build a workflow that fetches new orders from Shopify, transforms the data format, checks inventory in a PostgreSQL database, and updates the order status in both systems',
		expectedNodeTypes: [
			'n8n-nodes-base.shopify',
			'n8n-nodes-base.postgres',
			'n8n-nodes-base.set',
			'n8n-nodes-base.if',
		],
		complexity: 'medium',
		tags: ['e-commerce', 'data-sync', 'database'],
	},
	{
		id: 'test_complex_001',
		name: 'Customer Support Automation',
		description: 'Multi-branch support ticket processing system',
		prompt:
			'Create a workflow that receives support tickets via webhook, categorizes them using AI, routes high-priority tickets to Slack, creates Jira issues for bugs, updates the customer via email, and logs everything to a database. Include error handling for each branch.',
		expectedNodeTypes: [
			'n8n-nodes-base.webhook',
			'@n8n/n8n-nodes-langchain.agent',
			'n8n-nodes-base.if',
			'n8n-nodes-base.slack',
			'n8n-nodes-base.jira',
			'n8n-nodes-base.emailSend',
			'n8n-nodes-base.postgres',
		],
		complexity: 'complex',
		tags: ['automation', 'ai', 'multi-branch', 'error-handling'],
	},
];
