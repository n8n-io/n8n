/**
 * Mastra 1.0 Agent Example
 *
 * Demonstrates:
 * - Defining tools with Zod input/output schemas
 * - Sub-agent via the agent network pattern
 * - LangSmith observability via OpenTelemetry exporter
 *
 * Environment variables:
 *   LANGSMITH_TRACING=true
 *   LANGSMITH_API_KEY=<your-key>
 *   LANGSMITH_ENDPOINT=https://api.smith.langchain.com
 *   LANGSMITH_PROJECT=<your-project>
 *   OPENAI_API_KEY=<your-key>
 */

import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
// @ts-ignore
import { Observability } from '@mastra/observability';
// @ts-ignore
import { AISDKExporter } from 'langsmith/vercel';
import { z } from 'zod';

// ─── LangSmith Observability ─────────────────────────────────────────────
// Mastra uses OpenTelemetry under the hood. The AISDKExporter from LangSmith
// plugs in as a span exporter, so every agent step, tool call, and LLM
// invocation is traced automatically — no per-call opt-in.

const observability = new Observability({
	configs: {
		langsmith: {
			serviceName: 'n8n-agents-example',
			exporters: [new AISDKExporter()],
		},
	},
});

// ─── Tools ───────────────────────────────────────────────────────────────
// Mastra 1.0 execute signature: (inputData, context?) => Promise<output>
// inputData is the validated input directly (not wrapped in an object).

const fetchWeatherTool = createTool({
	id: 'fetch-weather',
	description: 'Get the current weather for a city',
	inputSchema: z.object({
		city: z.string().describe('City name, e.g. "San Francisco"'),
	}),
	outputSchema: z.object({
		city: z.string(),
		tempC: z.number(),
		condition: z.string(),
	}),
	execute: async (inputData) => ({
		city: inputData.city,
		tempC: 18,
		condition: 'partly cloudy',
	}),
});

const searchKnowledgeBaseTool = createTool({
	id: 'search-knowledge-base',
	description: 'Search the internal knowledge base for information',
	inputSchema: z.object({
		query: z.string().describe('The search query'),
	}),
	outputSchema: z.object({
		results: z.array(
			z.object({
				title: z.string(),
				snippet: z.string(),
			}),
		),
	}),
	execute: async (_inputData) => ({
		results: [
			{ title: 'PTO Policy', snippet: 'Employees get 25 days PTO per year.' },
			{ title: 'Remote Work', snippet: 'Fully remote with quarterly offsites.' },
		],
	}),
});

// ─── Sub-Agent (research specialist) ─────────────────────────────────────
// In Mastra, sub-agents are full Agent instances registered on a parent via
// the `agents` property. The parent's routing LLM decides when to delegate
// to them based on their description.

const researchAgent = new Agent({
	id: 'research-agent',
	name: 'Research Agent',
	description: `This agent gathers research insights using the knowledge base.
It extracts key facts and writes concise summaries.`,
	model: 'openai/gpt-4o',
	instructions:
		'You are a research specialist. Use your tools to find information, then write a concise summary of your findings.',
	tools: {
		searchKnowledgeBase: searchKnowledgeBaseTool,
	},
});

// ─── Main Agent (routing agent with network) ─────────────────────────────
// The main agent has direct tools AND sub-agents. When you call .network(),
// the routing LLM reads each primitive's description and decides what to
// invoke, in what order, and with what data.

const mainAgent = new Agent({
	id: 'main-agent',
	name: 'Main Agent',
	model: 'openai/gpt-4o',
	instructions: `You are a helpful assistant. You can check weather directly
and delegate research to the Research Agent when the question requires
deeper knowledge base lookup. Always respond with complete answers.`,
	tools: {
		fetchWeather: fetchWeatherTool,
	},
	agents: {
		researchAgent,
	},
});

// ─── Register with Mastra ────────────────────────────────────────────────
// Registering agents with Mastra wires up observability automatically.

new Mastra({
	agents: { mainAgent, researchAgent },
	observability,
});

// ─── Run ─────────────────────────────────────────────────────────────────

async function main() {
	// Simple generation — single agent, no network routing
	const simple = await mainAgent.generate('What is the weather in London?');
	console.log(simple.text);

	// Network execution — the routing LLM coordinates sub-agents
	// and tools automatically based on their descriptions
	const stream = await mainAgent.network(
		'What is the weather in London, and what is our company PTO policy?',
	);

	for await (const chunk of stream) {
		if (chunk.type === 'network-execution-event-step-finish') {
			console.log(chunk.payload.result);
		}
	}
}

main().catch(console.error);
