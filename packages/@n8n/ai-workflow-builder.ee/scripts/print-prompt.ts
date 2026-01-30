#!/usr/bin/env tsx
/**
 * Print the full one-shot generator prompt for debugging/copying.
 *
 * Usage:
 *   pnpm prompt:print              # Print Sonnet 4.5 prompt (default)
 *   pnpm prompt:print sonnet       # Print Sonnet 4.5 prompt
 *   pnpm prompt:print opus         # Print Opus 4.5 prompt
 *   pnpm prompt:print > prompt.txt # Save to file
 */

import { SDK_API_CONTENT } from '@n8n/workflow-sdk';

import {
	buildAvailableNodesSection,
	buildRawSystemPrompt,
} from '../src/prompts/builder/one-shot/v1-sonnet.prompt';
import {
	buildOpusAvailableNodesSection,
	buildOpusRawSystemPrompt,
} from '../src/prompts/builder/one-shot/v2-opus.prompt';
import type { NodeWithDiscriminators } from '../src/utils/node-type-parser';

type PromptType = 'sonnet' | 'opus';

// Sample node IDs to show the structure (these are representative examples)
const sampleNodeIds: {
	triggers: NodeWithDiscriminators[];
	core: NodeWithDiscriminators[];
	ai: NodeWithDiscriminators[];
	other: NodeWithDiscriminators[];
} = {
	triggers: [
		{ id: 'n8n-nodes-base.manualTrigger', displayName: 'Manual Trigger' },
		{ id: 'n8n-nodes-base.scheduleTrigger', displayName: 'Schedule Trigger' },
		{ id: 'n8n-nodes-base.webhook', displayName: 'Webhook' },
		{ id: 'n8n-nodes-base.emailReadImap', displayName: 'Email Trigger (IMAP)' },
		{ id: '@n8n/n8n-nodes-langchain.chatTrigger', displayName: 'Chat Trigger' },
	],
	core: [
		{ id: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request' },
		{ id: 'n8n-nodes-base.set', displayName: 'Edit Fields (Set)' },
		{ id: 'n8n-nodes-base.if', displayName: 'IF' },
		{ id: 'n8n-nodes-base.switch', displayName: 'Switch' },
		{ id: 'n8n-nodes-base.merge', displayName: 'Merge' },
		{ id: 'n8n-nodes-base.splitInBatches', displayName: 'Split In Batches' },
		{ id: 'n8n-nodes-base.code', displayName: 'Code' },
		{ id: 'n8n-nodes-base.filter', displayName: 'Filter' },
		{ id: 'n8n-nodes-base.noOp', displayName: 'No Operation' },
		{ id: 'n8n-nodes-base.wait', displayName: 'Wait' },
	],
	ai: [
		{ id: '@n8n/n8n-nodes-langchain.agent', displayName: 'AI Agent' },
		{ id: '@n8n/n8n-nodes-langchain.chainLlm', displayName: 'Basic LLM Chain' },
		{ id: '@n8n/n8n-nodes-langchain.lmChatOpenAi', displayName: 'OpenAI Chat Model' },
		{ id: '@n8n/n8n-nodes-langchain.lmChatAnthropic', displayName: 'Anthropic Chat Model' },
		{ id: '@n8n/n8n-nodes-langchain.memoryBufferWindow', displayName: 'Window Buffer Memory' },
		{ id: '@n8n/n8n-nodes-langchain.toolCalculator', displayName: 'Calculator Tool' },
		{ id: '@n8n/n8n-nodes-langchain.toolSerpApi', displayName: 'SerpAPI Tool' },
		{
			id: '@n8n/n8n-nodes-langchain.outputParserStructured',
			displayName: 'Structured Output Parser',
		},
		{ id: '@n8n/n8n-nodes-langchain.agentTool', displayName: 'Call n8n Workflow Tool' },
	],
	other: [
		{ id: 'n8n-nodes-base.slack', displayName: 'Slack' },
		{ id: 'n8n-nodes-base.gmail', displayName: 'Gmail' },
		{ id: 'n8n-nodes-base.googleSheets', displayName: 'Google Sheets' },
		{ id: 'n8n-nodes-base.notion', displayName: 'Notion' },
		{ id: 'n8n-nodes-base.airtable', displayName: 'Airtable' },
		{
			id: 'n8n-nodes-base.freshservice',
			displayName: 'Freshservice',
			discriminators: {
				type: 'resource_operation',
				resources: [
					{ value: 'ticket', operations: ['create', 'get', 'getAll', 'update', 'delete'] },
					{ value: 'contact', operations: ['create', 'get', 'getAll'] },
				],
			},
		},
	],
};

// Sample user requests for testing
const sampleRequests = [
	'Create a workflow that fetches data from an API every hour and sends a Slack notification if there are any errors',
	'Build an AI assistant that can search the web and send emails based on user questions',
	'Make a workflow that processes incoming webhooks, transforms the data, and stores it in Google Sheets',
	'Create a multi-agent system where one agent researches topics and another writes reports',
];

// Sample current workflow (for edit scenarios)
const sampleCurrentWorkflow = `return workflow('existing-flow', 'My Existing Workflow')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } }))
  .then(node({
    type: 'n8n-nodes-base.httpRequest',
    version: 4.2,
    config: {
      name: 'Fetch Data',
      parameters: { method: 'GET', url: 'https://api.example.com/data' }
    }
  }));`;

// Tool definitions
const tools = [
	{
		name: 'search_nodes',
		description:
			'Search for n8n nodes by name or service. Accepts multiple search queries and returns separate result lists for each. Use this when you need to find nodes for specific integrations or services (e.g., ["salesforce", "http", "gmail"]).',
		schema: {
			type: 'object',
			properties: {
				queries: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of search queries (e.g., ["salesforce", "http", "gmail"])',
				},
			},
			required: ['queries'],
		},
	},
	{
		name: 'get_nodes',
		description:
			'Get the full TypeScript type definitions for one or more nodes. Returns the complete type information including parameters, credentials, and node type variants. By default returns the latest version. For nodes with resource/operation or mode discriminators, you MUST specify them. Use search_nodes first to discover available discriminators. ALWAYS call this with ALL node types you plan to use BEFORE generating workflow code.',
		schema: {
			type: 'object',
			properties: {
				nodeIds: {
					type: 'array',
					description:
						'Array of nodes to fetch. Can be simple strings for flat nodes (e.g., ["n8n-nodes-base.aggregate"]) or objects with discriminators for split nodes.',
					items: {
						oneOf: [
							{ type: 'string' },
							{
								type: 'object',
								properties: {
									nodeId: {
										type: 'string',
										description: 'The node ID (e.g., "n8n-nodes-base.httpRequest")',
									},
									version: {
										type: 'string',
										description: 'Optional version (e.g., "34" for v34). Omit for latest version.',
									},
									resource: {
										type: 'string',
										description:
											'Resource discriminator for REST API nodes (e.g., "ticket", "contact")',
									},
									operation: {
										type: 'string',
										description: 'Operation discriminator (e.g., "get", "create", "update")',
									},
									mode: {
										type: 'string',
										description:
											'Mode discriminator for nodes like Code (e.g., "runOnceForAllItems")',
									},
								},
								required: ['nodeId'],
							},
						],
					},
				},
			},
			required: ['nodeIds'],
		},
	},
];

function printPrompt(promptType: PromptType = 'sonnet') {
	// Build the raw system prompt based on type
	const isOpus = promptType === 'opus';
	const systemPrompt = isOpus
		? buildOpusRawSystemPrompt(sampleNodeIds, SDK_API_CONTENT)
		: buildRawSystemPrompt(sampleNodeIds, SDK_API_CONTENT);

	const availableNodesSection = isOpus
		? buildOpusAvailableNodesSection(sampleNodeIds)
		: buildAvailableNodesSection(sampleNodeIds);

	// Pick a random sample request
	const randomRequest = sampleRequests[Math.floor(Math.random() * sampleRequests.length)];

	const promptName = isOpus ? 'OPUS 4.5' : 'SONNET 4.5';

	console.log('='.repeat(80));
	console.log(`ONE-SHOT WORKFLOW GENERATOR - ${promptName} PROMPT`);
	console.log('='.repeat(80));
	console.log();
	console.log('--- SYSTEM MESSAGE ---');
	console.log();
	console.log(systemPrompt);
	console.log();
	console.log('--- USER MESSAGE (new workflow) ---');
	console.log();
	console.log(randomRequest);
	console.log();
	console.log('--- USER MESSAGE (edit existing workflow) ---');
	console.log();
	console.log(`<current_workflow>\n${sampleCurrentWorkflow}\n</current_workflow>`);
	console.log();
	console.log('User request:');
	console.log('Add error handling and send a Slack notification when the API request fails');
	console.log();
	console.log('--- TOOLS ---');
	console.log();
	for (const t of tools) {
		console.log(`Tool: ${t.name}`);
		console.log(`Description: ${t.description}`);
		console.log('Schema:');
		console.log(JSON.stringify(t.schema, null, 2));
		console.log();
	}
	console.log('='.repeat(80));
	console.log('END OF PROMPT');
	console.log('='.repeat(80));

	// Print stats
	console.log();
	console.log('Stats:');
	console.log(`  Prompt type: ${promptName}`);
	console.log(`  System message length: ${systemPrompt.length.toLocaleString()} characters`);
	if (isOpus) {
		console.log(`  SDK API content length: ${SDK_API_CONTENT.length.toLocaleString()} characters`);
	} else {
		console.log(`  SDK API content: NOT INCLUDED (Sonnet 4.5 optimized prompt)`);
	}
	console.log(
		`  Available nodes section length: ${availableNodesSection.length.toLocaleString()} characters`,
	);
	console.log(`  Tools: ${tools.length}`);
}

// Parse command line argument
const arg = process.argv[2]?.toLowerCase();
let promptType: PromptType = 'sonnet';

if (arg === 'opus') {
	promptType = 'opus';
} else if (arg === 'sonnet' || !arg) {
	promptType = 'sonnet';
} else {
	console.error(`Unknown prompt type: ${arg}`);
	console.error('Usage: pnpm prompt:print [sonnet|opus]');
	process.exit(1);
}

printPrompt(promptType);
