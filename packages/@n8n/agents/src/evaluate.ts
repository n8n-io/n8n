import type { Agent } from './agent';
import type { Eval } from './eval';
import type { Message } from './message';
import type { EvalResults, EvalRunResult, EvalScore, Provider, StreamChunk } from './types';

/** Extract text content from messages. */
function extractText(messages: Message[]): string {
	return messages
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

interface CollectedToolResult {
	tool: string;
	input: unknown;
	output: unknown;
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
export async function evaluate(
	agent: Agent<Provider | undefined>,
	config: EvaluateConfig,
): Promise<EvalResults> {
	const { dataset, evals } = config;

	const runs: EvalRunResult[] = await Promise.all(
		dataset.map(async (row) => {
			const { fullStream, getResult } = await agent.streamText(row.input);

			// Drain stream with interrupt handling, collecting tool results
			// from ALL streams (including resumed streams after interrupts).
			const collectedToolResults: CollectedToolResult[] = [];
			await drainStreamWithInterrupts(
				fullStream.getReader(),
				agent,
				collectedToolResults,
				row.resumeData,
			);

			const result = await getResult();

			// Prefer collected tool results — getResult().toolCalls may have
			// undefined outputs for tools that went through the approval flow,
			// because their results arrive on the resumed stream which the
			// adapter's promise-based path doesn't see.
			const resultToolCalls = result.toolCalls ?? [];
			const hasUndefined = resultToolCalls.some((tc) => tc.output === undefined);
			const toolCalls =
				collectedToolResults.length > 0 && (resultToolCalls.length === 0 || hasUndefined)
					? collectedToolResults
					: resultToolCalls;

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
 * Drain a fullStream, auto-resuming suspended tools unless overridden.
 * Collects tool results from ALL streams (original + resumed after interrupts)
 * since getResult().toolCalls may not capture results from resumed streams.
 *
 * The stream uses the SDK's StreamChunk format where:
 * - Tool results are `{ type: 'content', content: { type: 'tool-result', ... } }`
 * - Suspend events are `{ type: 'tool-call-suspended', runId, toolName, toolCallId }`
 */
async function drainStreamWithInterrupts(
	reader: ReadableStreamDefaultReader<unknown>,
	agent: Agent<Provider | undefined>,
	collected: CollectedToolResult[],
	resumeOverrides?: Record<string, 'deny' | Record<string, unknown>>,
): Promise<void> {
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		const chunk = value as StreamChunk;

		// Collect tool results — they arrive as content chunks.
		// The stream transform stringifies input, so parse it back to JSON.
		if (chunk.type === 'content' && chunk.content.type === 'tool-result') {
			let parsedInput: unknown = chunk.content.input;
			if (typeof parsedInput === 'string') {
				try {
					parsedInput = JSON.parse(parsedInput);
				} catch {
					// keep as string if not valid JSON
				}
			}
			collected.push({
				tool: chunk.content.toolName,
				input: parsedInput,
				output: chunk.content.result,
			});
		}

		// Handle suspended tool calls
		if (chunk.type === 'tool-call-suspended') {
			const toolName = chunk.toolName ?? '';
			const override = toolName ? resumeOverrides?.[toolName] : undefined;
			const runId = chunk.runId ?? '';
			const toolCallId = chunk.toolCallId ?? '';

			let data: Record<string, unknown>;
			if (override === 'deny') {
				data = { approved: false };
			} else if (override && typeof override === 'object') {
				data = override;
			} else {
				data = { approved: true };
			}

			const resumed = await agent.resume(data, { runId, toolCallId });
			await drainStreamWithInterrupts(
				resumed.fullStream.getReader(),
				agent,
				collected,
				resumeOverrides,
			);
			return;
		}
	}
}
