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
	 * Per-tool approval overrides. By default all tools are auto-approved
	 * during evaluations. Use this to test denial scenarios.
	 *
	 * @example
	 * ```typescript
	 * { input: 'Delete the file', approvals: { delete_file: 'deny' } }
	 * ```
	 */
	approvals?: Record<string, 'approve' | 'deny'>;
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
 * Tools with `.requiresApproval()` are **auto-approved by default** during
 * evals. Use `approvals` in dataset rows to override per tool.
 *
 * @example
 * ```typescript
 * const results = await evaluate(agent, {
 *   dataset: [
 *     { input: 'What is 2+2?', expected: '4' },
 *     { input: 'Delete temp files', approvals: { delete_file: 'deny' } },
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

			// Drain stream with approval handling, collecting tool results
			// from ALL streams (including resumed streams after approval).
			const collectedToolResults: CollectedToolResult[] = [];
			await drainStreamWithApprovals(
				fullStream.getReader(),
				agent,
				collectedToolResults,
				row.approvals,
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
 * Drain a fullStream, auto-approving tool calls unless overridden.
 * Collects tool results from ALL streams (original + resumed after approval)
 * since getResult().toolCalls may not capture results from resumed streams.
 *
 * The stream uses the SDK's StreamChunk format where:
 * - Tool results are `{ type: 'content', content: { type: 'tool-result', ... } }`
 * - Approval requests are `{ type: 'tool-call-approval', runId, tool, toolCallId }`
 */
async function drainStreamWithApprovals(
	reader: ReadableStreamDefaultReader<unknown>,
	agent: Agent<Provider | undefined>,
	collected: CollectedToolResult[],
	approvals?: Record<string, 'approve' | 'deny'>,
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

		// Handle approval requests
		if (chunk.type === 'tool-call-approval') {
			const decision = chunk.tool ? (approvals?.[chunk.tool] ?? 'approve') : 'approve';
			const runId = chunk.runId ?? '';
			const toolCallId = chunk.toolCallId;

			if (decision === 'approve') {
				const resumed = await agent.approveToolCall(runId, toolCallId);
				await drainStreamWithApprovals(resumed.fullStream.getReader(), agent, collected, approvals);
			} else {
				const resumed = await agent.declineToolCall(runId, toolCallId);
				await drainStreamWithApprovals(resumed.fullStream.getReader(), agent, collected, approvals);
			}
			return;
		}
	}
}
