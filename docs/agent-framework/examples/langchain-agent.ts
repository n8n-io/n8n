/**
 * LangChain 2.0 Agent Example
 *
 * Demonstrates:
 * - Defining tools with Zod schemas
 * - Sub-agent via the agent-as-tool pattern
 * - LangSmith observability (automatic with env vars)
 *
 * Environment variables:
 *   LANGSMITH_TRACING=true
 *   LANGSMITH_API_KEY=<your-key>
 *   OPENAI_API_KEY=<your-key>
 */

import { createAgent, tool } from 'langchain';
import { z } from 'zod';

// ─── LangSmith Observability ─────────────────────────────────────────────
// LangChain 2.0 traces to LangSmith automatically when LANGSMITH_TRACING=true.
// Every agent step, tool call, and LLM invocation appears in the dashboard
// with no additional code. Set the env vars and it works.

// ─── Tools ───────────────────────────────────────────────────────────────

const fetchWeather = tool(
	async ({ city }: { city: string }) => {
		// Replace with a real API call
		return JSON.stringify({ city, tempC: 18, condition: 'partly cloudy' });
	},
	{
		name: 'fetch_weather',
		description: 'Get the current weather for a city',
		schema: z.object({
			city: z.string().describe('City name, e.g. "San Francisco"'),
		}),
	},
);

const searchKnowledgeBase = tool(
	async ({ query }: { query: string }) => {
		// Replace with a real vector store / search call
		console.log(`Searching knowledge base for: ${query}`);
		return JSON.stringify({
			results: [
				{ title: 'PTO Policy', snippet: 'Employees get 25 days PTO per year.' },
				{ title: 'Remote Work', snippet: 'Fully remote with quarterly offsites.' },
			],
		});
	},
	{
		name: 'search_knowledge_base',
		description: 'Search the internal knowledge base for information',
		schema: z.object({
			query: z.string().describe('The search query'),
		}),
	},
);

// ─── Sub-Agent (research specialist) ─────────────────────────────────────
// In LangChain 2.0, a sub-agent is a full createAgent() with its own model,
// tools, and instructions. The `name` field is its node ID when used as a
// subgraph in a parent agent.

const researchAgent = createAgent({
	name: 'research_agent',
	model: 'openai:gpt-4o',
	tools: [searchKnowledgeBase],
	systemPrompt:
		'You are a research specialist. Use your tools to find information, then write a concise summary of your findings.',
});

// Wrap the sub-agent as a tool the main agent can call.
// The sub-agent runs its full ReAct loop independently and returns text.
const researchTool = tool(
	async ({ task }: { task: string }) => {
		const result = await researchAgent.invoke({
			messages: [{ role: 'user', content: task }],
		});
		const lastMessage = result.messages.at(-1);
		return typeof lastMessage?.content === 'string'
			? lastMessage.content
			: JSON.stringify(lastMessage?.content);
	},
	{
		name: 'research',
		description: 'Delegate a research question to a specialist agent',
		schema: z.object({
			task: z.string().describe('The research question to investigate'),
		}),
	},
);

// ─── Main Agent ──────────────────────────────────────────────────────────

const agent = createAgent({
	name: 'main_agent',
	model: 'openai:gpt-4o',
	tools: [fetchWeather, researchTool],
	systemPrompt: `You are a helpful assistant. You can check weather and
delegate research to a specialist when the question requires deeper lookup.`,
});

// ─── Run ─────────────────────────────────────────────────────────────────

async function main() {
	// Simple invocation — returns final state with all messages
	const result = await agent.invoke({
		messages: [
			{
				role: 'user',
				content: 'What is the weather in London, and what is our company PTO policy?',
			},
		],
	});

	const finalMessage = result.messages.at(-1);
	console.log(finalMessage?.content);

	// Streaming — get incremental updates as the agent thinks
	const stream = await agent.stream(
		{
			messages: [
				{
					role: 'user',
					content: 'Research our remote work policy and summarise it.',
				},
			],
		},
		{ streamMode: 'values' },
	);

	for await (const chunk of stream) {
		const latest = chunk.messages.at(-1);
		if (latest?.content) {
			console.log(`Agent: ${latest.content}`);
		} else if ((latest as any)?.tool_calls) {
			const names = (latest as any).tool_calls.map((tc: { name: string }) => tc.name);
			console.log(`Calling tools: ${names.join(', ')}`);
		}
	}
}

main().catch(console.error);
