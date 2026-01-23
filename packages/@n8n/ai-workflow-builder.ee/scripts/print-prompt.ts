#!/usr/bin/env tsx
/**
 * Print the full one-shot generator prompt for debugging/copying.
 *
 * Usage:
 *   pnpm prompt:print
 *   pnpm prompt:print > prompt.txt
 */

import { SDK_API_CONTENT } from '@n8n/workflow-sdk';

import {
	buildAvailableNodesSection,
	buildRawSystemPrompt,
} from '../src/prompts/one-shot-generator.prompt';
import type { NodeWithDiscriminators } from '../src/utils/node-type-parser';

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

function printPrompt() {
	// Build the raw system prompt
	const systemPrompt = buildRawSystemPrompt(sampleNodeIds, SDK_API_CONTENT);

	console.log('='.repeat(80));
	console.log('ONE-SHOT WORKFLOW GENERATOR - FULL SYSTEM PROMPT');
	console.log('='.repeat(80));
	console.log();
	console.log('--- SYSTEM MESSAGE ---');
	console.log();
	console.log(systemPrompt);
	console.log();
	console.log('--- HUMAN MESSAGE TEMPLATE ---');
	console.log();
	console.log('{userMessage}');
	console.log();
	console.log('='.repeat(80));
	console.log('END OF PROMPT');
	console.log('='.repeat(80));

	// Print stats
	console.log();
	console.log('Stats:');
	console.log(`  System message length: ${systemPrompt.length.toLocaleString()} characters`);
	console.log(`  SDK API content length: ${SDK_API_CONTENT.length.toLocaleString()} characters`);
	console.log(
		`  Available nodes section length: ${buildAvailableNodesSection(sampleNodeIds).length.toLocaleString()} characters`,
	);
}

printPrompt();
