import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import type { ExampleResult } from '../harness/harness-types';

export interface IntrospectionSummary {
	totalEvents: number;
	categoryBreakdown: Record<string, number>;
	llmAnalysis: string;
}

const SUMMARIZATION_PROMPT = `You are analyzing introspection events from an AI workflow builder evaluation.

These events were reported by the AI when it encountered issues with its instructions or documentation.

Given these events, provide:
1. A summary of the most common issues by category
2. Specific actionable recommendations for improving the instructions
3. Patterns you notice across multiple events

Be concise and focus on actionable insights.

Events:
{events}`;

/**
 * Summarize introspection results from an evaluation run using an LLM.
 *
 * @param results - Array of example results from the evaluation
 * @param llm - LLM to use for summarization
 * @returns Summary including total events, category breakdown, and LLM analysis
 */
export async function summarizeIntrospectionResults(
	results: ExampleResult[],
	llm: BaseChatModel,
): Promise<IntrospectionSummary> {
	const allEvents = results.flatMap((r) => r.introspectionEvents ?? []);

	if (allEvents.length === 0) {
		return {
			totalEvents: 0,
			categoryBreakdown: {},
			llmAnalysis: 'No introspection events were captured.',
		};
	}

	// Group by category
	const categoryBreakdown: Record<string, number> = {};
	for (const event of allEvents) {
		categoryBreakdown[event.category] = (categoryBreakdown[event.category] || 0) + 1;
	}

	// Format events for LLM
	const eventsText = allEvents
		.map(
			(e, i) => `${i + 1}. [${e.category}] ${e.issue}${e.source ? ` (source: ${e.source})` : ''}`,
		)
		.join('\n');

	const prompt = SUMMARIZATION_PROMPT.replace('{events}', eventsText);
	const response = await llm.invoke(prompt);

	return {
		totalEvents: allEvents.length,
		categoryBreakdown,
		llmAnalysis:
			typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
	};
}
