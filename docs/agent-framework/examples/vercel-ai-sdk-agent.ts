/**
 * Vercel AI SDK 6 Agent Example
 *
 * Demonstrates:
 * - Defining tools with Zod schemas
 * - Sub-agent via the agent-as-tool pattern
 * - LangSmith observability via OpenTelemetry
 *
 * Environment variables:
 *   LANGSMITH_TRACING=true
 *   LANGSMITH_API_KEY=<your-key>
 *   OPENAI_API_KEY=<your-key>
 */

// @ts-ignore
import { ToolLoopAgent, tool, stepCountIs } from 'ai';
// @ts-ignore
import { openai } from '@ai-sdk/openai';
// @ts-ignore
import { AISDKExporter } from 'langsmith/vercel';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { z } from 'zod';

// ─── LangSmith Observability ─────────────────────────────────────────────
// ToolLoopAgent emits OpenTelemetry spans when experimental_telemetry is
// enabled. The AISDKExporter from LangSmith acts as a span processor,
// forwarding every LLM call, tool execution, and agent step to your
// LangSmith dashboard.
const sdk = new NodeSDK({
	spanProcessors: [new AISDKExporter()],
});
sdk.start();

// Shared telemetry config — pass to every ToolLoopAgent so their internal
// generateText/streamText calls emit spans.
const telemetry = { isEnabled: true, functionId: 'n8n-agent-example' } as const;

// ─── Tools ───────────────────────────────────────────────────────────────

const fetchWeatherTool = tool({
	description: 'Get the current weather for a city',
	inputSchema: z.object({
		city: z.string().describe('City name, e.g. "San Francisco"'),
	}),
	// @ts-ignore
	execute: async ({ city }) => ({
		city,
		tempC: 18,
		condition: 'partly cloudy',
	}),
});

const searchKnowledgeBaseTool = tool({
	description: 'Search the internal knowledge base for information',
	inputSchema: z.object({
		query: z.string().describe('The search query'),
	}),
	execute: async ({}) => ({
		results: [
			{ title: 'PTO Policy', snippet: 'Employees get 25 days PTO per year.' },
			{ title: 'Remote Work', snippet: 'Fully remote with quarterly offsites.' },
		],
	}),
});

// ─── Sub-Agent (research specialist) ─────────────────────────────────────
// The sub-agent has its own context window and tools. It runs autonomously
// and can do heavy exploration without polluting the main agent's context.

const researchAgent = new ToolLoopAgent({
	model: openai('gpt-4o'),
	instructions: `You are a research specialist. Use your tools to find
information, then write a concise summary of your findings.`,
	tools: {
		searchKnowledgeBase: searchKnowledgeBaseTool,
	},
	stopWhen: stepCountIs(5),
	experimental_telemetry: telemetry,
});

// Wrap the sub-agent as a tool the main agent can call.
// toModelOutput controls what tokens flow back into the parent's context —
// the sub-agent may use thousands of tokens internally, but only the
// summary is fed back to keep the main agent focused.
const researchTool = tool({
	description: 'Delegate a research question to a specialist agent',
	inputSchema: z.object({
		task: z.string().describe('The research question to investigate'),
	}),
	// @ts-ignore
	execute: async ({ task }, { abortSignal }) => {
		const result = await researchAgent.generate({
			prompt: task,
			abortSignal,
		});
		return result.text;
	},
	// @ts-ignore
	toModelOutput: ({ output }) => ({
		type: 'text' as const,
		value: typeof output === 'string' ? output : JSON.stringify(output),
	}),
});

// ─── Main Agent ──────────────────────────────────────────────────────────

const agent = new ToolLoopAgent({
	model: openai('gpt-4o'),
	instructions: `You are a helpful assistant. You can check weather and
delegate research to a specialist when the question requires deeper lookup.`,
	tools: {
		fetchWeather: fetchWeatherTool,
		research: researchTool,
	},
	stopWhen: stepCountIs(10),
	experimental_telemetry: telemetry,
});

// ─── Run ─────────────────────────────────────────────────────────────────

async function main() {
	try {
		const result = await agent.generate({
			prompt: 'What is the weather in London, and what is our company PTO policy?',
		});

		console.log(result.text);
		console.log(`Steps taken: ${result.steps.length}`);
	} finally {
		// Flush traces before exit — must run even if generation fails
		await sdk.shutdown();
	}
}

main().catch(console.error);
