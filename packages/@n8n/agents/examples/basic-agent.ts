/**
 * @n8n/agents — Full API Demonstration
 *
 * This example demonstrates the complete builder-pattern API for creating
 * and running AI agents. It shows: tools, agents, memory, guardrails,
 * scorers, multi-agent patterns (agent-as-tool), and tool interrupts.
 *
 * To run with real LLM calls, set ANTHROPIC_API_KEY.
 * Without keys, the runtime will throw on actual LLM calls.
 */
import { z } from 'zod';

import { Agent, Guardrail, Memory, Tool } from '../src';

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const searchTool = new Tool('web-search')
	.description('Search the web for information on a topic')
	.input(
		z.object({
			query: z.string().describe('The search query'),
			maxResults: z.number().default(3).describe('Maximum results to return'),
		}),
	)
	.output(
		z.object({
			results: z.array(
				z.object({
					title: z.string(),
					snippet: z.string(),
				}),
			),
		}),
	)
	.handler(async ({ query, maxResults }) => ({
		results: Array.from({ length: maxResults }, (_, i) => ({
			title: `Result ${i + 1} for "${query}"`,
			snippet: `This is a mock search result about ${query}.`,
		})),
	}));

const writeFileTool = new Tool('write-file')
	.description('Write content to a file (suspends for confirmation)')
	.input(
		z.object({
			path: z.string().describe('File path to write to'),
			content: z.string().describe('Content to write'),
		}),
	)
	.suspend(z.object({ message: z.string(), severity: z.string() }))
	.resume(z.object({ approved: z.boolean() }))
	.handler(async ({ path, content }, ctx) => {
		if (!ctx.resumeData) {
			return await ctx.suspend({ message: `Write to "${path}"?`, severity: 'warning' });
		}
		if (!ctx.resumeData.approved) return { written: false };
		console.log(`  [Mock] Would write ${content.length} chars to ${path}`);
		return { written: true };
	});

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

const memory = new Memory()
	.lastMessages(20)
	.semanticRecall({ topK: 4, messageRange: { before: 1, after: 1 } });

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

const researcher = new Agent('researcher')
	.model('anthropic/claude-sonnet-4')
	.instructions(
		'You are a research assistant. Search for information and return structured findings.',
	)
	.tool(searchTool)
	.memory(memory)
	.inputGuardrail(
		new Guardrail('injection-detector').type('prompt-injection').strategy('block').threshold(0.8),
	);

const writer = new Agent('writer')
	.model('anthropic/claude-sonnet-4')
	.instructions('You write clear, engaging content based on research provided to you.')
	.tool(writeFileTool)
	.checkpoint('memory');

// ---------------------------------------------------------------------------
// Multi-Agent: Agent as Tool
// ---------------------------------------------------------------------------

const orchestrator = new Agent('orchestrator')
	.model('anthropic/claude-sonnet-4')
	.instructions(
		'You coordinate research and writing. Delegate research to the researcher and writing to the writer.',
	)
	.tool(researcher.asTool('Delegate research tasks to the research specialist'))
	.tool(writer.asTool('Delegate writing tasks to the content writer'));

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function main() {
	console.log('=== @n8n/agents ===\n');

	// --- 1. Single agent generate ---
	console.log('1. Single agent generate:');
	try {
		const result = await researcher.generate('Find information about RAG architectures', {
			persistence: {
				resourceId: 'user-123',
				threadId: 'session-1',
			},
		});
		const text = result.messages
			.flatMap((m) => ('content' in m ? m.content : []))
			.filter((c) => c.type === 'text')
			.map((c) => ('text' in c ? c.text : ''))
			.join('');
		console.log(`   Result: ${text.slice(0, 100)}...`);
		console.log(
			`   Usage: ${result.usage?.promptTokens} in, ${result.usage?.completionTokens} out`,
		);
	} catch (error) {
		console.log(`   (Expected) Error: ${(error as Error).message}`);
		console.log('   (Set ANTHROPIC_API_KEY to run with real LLM calls)');
	}

	// --- 2. Orchestrator (agent-as-tool pattern) ---
	console.log('\n2. Orchestrator (agent-as-tool pattern):');
	try {
		const orchResult = await orchestrator.generate(
			'Research RAG architectures and write a summary',
		);
		const text = orchResult.messages
			.flatMap((m) => ('content' in m ? m.content : []))
			.filter((c) => c.type === 'text')
			.map((c) => ('text' in c ? c.text : ''))
			.join('');
		console.log(`   Result: ${text.slice(0, 100)}...`);
	} catch (error) {
		console.log(`   (Expected) Error: ${(error as Error).message}`);
	}

	console.log('\n=== Complete ===');
}

main().catch(console.error);
