import type { Agent } from './agent';
import type { Eval } from './eval';
import { filterLlmMessages } from './message';
import type { EvalResults, EvalRunResult, EvalScore, GenerateResult } from '../types';
import type { AgentMessage } from '../types/sdk/message';

/** Extract text content from messages. */
function extractText(messages: AgentMessage[]): string {
	return filterLlmMessages(messages)
		.flatMap((m) => m.content)
		.filter((c) => c.type === 'text')
		.map((c) => (c as { text: string }).text)
		.join('');
}

export interface DatasetRow {
	/** The prompt to send to the agent. */
	input: string;
	/** Expected answer (used by evals like correctness/similarity). */
	expected?: string;
	/**
	 * Per-tool resume data overrides for evaluation. By default all suspended
	 * tools are auto-resumed with `{ approved: true }` during evaluations.
	 * Use this to test denial or custom resume scenarios.
	 *
	 * - `'deny'` is shorthand for `{ approved: false }`
	 * - An object value is passed as-is to `agent.resume()`
	 */
	resumeData?: Record<string, 'deny' | Record<string, unknown>>;
}

export interface EvaluateConfig {
	/** Dataset of test cases to run through the agent. */
	dataset: DatasetRow[];
	/** Evals to run against each agent response. */
	evals: Eval[];
}

/**
 * Run a dataset through an agent and score the results with evals.
 *
 * All dataset rows and evals run in parallel for maximum throughput.
 * Suspended tool calls are **auto-resumed with `{ approved: true }`** during
 * evals. Use `resumeData` in dataset rows to override per tool.
 *
 * @example
 * ```typescript
 * const results = await evaluate(agent, {
 *   dataset: [
 *     { input: 'What is 2+2?', expected: '4' },
 *     { input: 'Delete temp files', resumeData: { delete_file: 'deny' } },
 *     { input: 'Book flight', resumeData: { book: { seat: '12A' } } },
 *   ],
 *   evals: [correctness, similarity],
 * });
 * ```
 */
export async function evaluate(agent: Agent, config: EvaluateConfig): Promise<EvalResults> {
	const { dataset, evals } = config;

	const runs: EvalRunResult[] = await Promise.all(
		dataset.map(async (row) => {
			const result = await runWithInterrupts(agent, row.input, row.resumeData);

			const toolCalls = result.toolCalls ?? [];

			// Build composite output: if the agent's text is empty but it made
			// tool calls, include the tool outputs so evals have something to score.
			let output = extractText(result.messages);
			if (!output.trim() && toolCalls.length > 0) {
				const toolOutputs = toolCalls
					.filter((tc) => tc.output !== undefined)
					.map((tc) => `[${tc.tool}] ${JSON.stringify(tc.output)}`);
				if (toolOutputs.length > 0) {
					output = toolOutputs.join('\n');
				}
			}

			const scoreEntries = await Promise.all(
				evals.map(async (ev): Promise<[string, EvalScore]> => {
					const score = await ev.run({
						input: row.input,
						output,
						expected: row.expected,
						toolCalls,
					});
					return [ev.name, score];
				}),
			);

			return {
				input: row.input,
				output,
				expected: row.expected,
				scores: Object.fromEntries(scoreEntries),
			};
		}),
	);

	const summary: EvalResults['summary'] = {};
	for (const ev of evals) {
		const results = runs
			.map((r) => r.scores[ev.name]?.pass)
			.filter((p): p is boolean => p !== undefined);

		if (results.length > 0) {
			const passed = results.filter(Boolean).length;
			summary[ev.name] = {
				passed,
				failed: results.length - passed,
				total: results.length,
			};
		}
	}

	return { runs, summary };
}

/**
 * Run the agent with automatic interrupt handling.
 * Uses generate() and loops: if the result has a pendingSuspend, resolves
 * the resume data and calls agent.resume('generate', ...) to get a
 * GenerateResult directly without needing to stream-and-re-generate.
 *
 * Tools are auto-resumed with `{ approved: true }` by default;
 * use `resumeOverrides` to override per tool.
 */
async function runWithInterrupts(
	agent: Agent,
	input: string,
	resumeOverrides?: Record<string, 'deny' | Record<string, unknown>>,
): Promise<GenerateResult> {
	let result = await agent.generate(input);
	const allToolCalls: Array<{ tool: string; input: unknown; output: unknown }> = [
		...(result.toolCalls ?? []),
	];

	while (result.pendingSuspend && result.pendingSuspend.length > 0) {
		const { runId, toolCallId, toolName } = result.pendingSuspend[0];
		const override = toolName ? resumeOverrides?.[toolName] : undefined;

		let data: Record<string, unknown>;
		if (override === 'deny') {
			data = { approved: false };
		} else if (override && typeof override === 'object') {
			data = override;
		} else {
			data = { approved: true };
		}

		result = await agent.resume('generate', data, { runId, toolCallId });
		allToolCalls.push(...(result.toolCalls ?? []));
	}

	return {
		...result,
		...(allToolCalls.length > 0 ? { toolCalls: allToolCalls } : {}),
	};
}
