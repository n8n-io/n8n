import type { Message } from '@n8n/agents';
import { z } from 'zod';

import { EPHEMERAL_CACHE, SONNET_MODEL, createEvalAgent } from '../../src/utils/eval-agents';
import type { WorkflowResponse } from '../clients/n8n-client';
import { buildWorkflowContextBlock } from '../harness/workflow-context';
import { BUILD_EXPECTATIONS_VERIFY_PROMPT } from '../system-prompts/build-expectations-verify';
import type { BuildExpectationResult, ConversationMetrics, TranscriptTurn } from '../types';
import { transcriptAsText } from '../utils/conversation-text';

// ---------------------------------------------------------------------------
// Structured output schema
// ---------------------------------------------------------------------------

const expectationResultSchema = z.object({
	results: z.array(
		z.object({
			index: z.number(),
			pass: z.boolean(),
			reason: z.string(),
		}),
	),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The conversation/build artifacts the judge reasons over. */
export interface BuildExpectationsInput {
	transcript: TranscriptTurn[];
	workflowJson?: WorkflowResponse;
	metrics?: ConversationMetrics;
}

const JUDGE_MODEL = SONNET_MODEL;
const MAX_VERIFY_ATTEMPTS = 2;
const VERIFY_ATTEMPT_TIMEOUT_MS = 120_000;

/**
 * Judge author-written natural-language expectations about the build conversation +
 * resulting workflow. Informational only — never feeds verify_pass@k. On judge failure
 * (errors or timeouts across all attempts) it returns `incomplete` verdicts so the report
 * stays complete while reading as "no verdict" rather than failures; callers additionally
 * guard with `.catch()`.
 */
export async function verifyBuildExpectations(
	expectations: string[],
	build: BuildExpectationsInput,
): Promise<BuildExpectationResult[]> {
	if (expectations.length === 0) return [];

	// Workflow block is stable per build — mark it as an Anthropic cache breakpoint.
	const messages: Message[] = [
		{
			role: 'user',
			content: [
				{
					type: 'text',
					text: buildWorkflowContextBlock(build.workflowJson),
					providerOptions: EPHEMERAL_CACHE,
				},
				{
					type: 'text',
					text: buildConversationContext(expectations, build.transcript, build.metrics),
				},
			],
		},
	];

	for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++) {
		const agent = createEvalAgent('eval-build-expectations-verifier', {
			instructions: BUILD_EXPECTATIONS_VERIFY_PROMPT,
			cache: true,
			model: JUDGE_MODEL,
		}).structuredOutput(expectationResultSchema);

		const abortController = new AbortController();
		const timer = setTimeout(
			() =>
				abortController.abort(
					new Error(`expectations judge timed out after ${VERIFY_ATTEMPT_TIMEOUT_MS}ms`),
				),
			VERIFY_ATTEMPT_TIMEOUT_MS,
		);
		let result;
		try {
			result = await agent.generate(messages, { abortSignal: abortController.signal });
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			console.warn(`[expectations] attempt ${attempt}/${MAX_VERIFY_ATTEMPTS} failed: ${msg}`);
			continue;
		} finally {
			clearTimeout(timer);
		}

		const parsed = expectationResultSchema.safeParse(result.structuredOutput);
		const byIndex = new Map<number, { pass: boolean; reason: string }>();
		if (parsed.success) {
			for (const entry of parsed.data.results) {
				// Schema validated index/pass/reason types; only the range needs checking.
				if (entry.index >= 0 && entry.index < expectations.length) {
					byIndex.set(entry.index, { pass: entry.pass, reason: entry.reason });
				}
			}
		}

		if (byIndex.size > 0) {
			// Omitted expectations are marked `incomplete` (not a genuine fail).
			return expectations.map((expectation, i) => {
				const verdict = byIndex.get(i);
				return verdict
					? { expectation, pass: verdict.pass, reason: verdict.reason }
					: { expectation, pass: false, reason: 'no verdict returned', incomplete: true };
			});
		}

		console.warn(
			`[expectations] attempt ${attempt}/${MAX_VERIFY_ATTEMPTS} produced no parseable results`,
		);
	}

	console.warn(`[expectations] exhausted ${MAX_VERIFY_ATTEMPTS} attempts, returning all-fail`);
	return allFailVerdicts(expectations, 'judge produced no result');
}

/**
 * Verdicts when the judge produced nothing (exhausted attempts, or callers'
 * `.catch()`). Marked `incomplete` so a dead judge renders as neutral "no
 * verdict" rather than every expectation failing.
 */
export function allFailVerdicts(expectations: string[], reason: string): BuildExpectationResult[] {
	return expectations.map((expectation) => ({
		expectation,
		pass: false,
		reason,
		incomplete: true,
	}));
}

// ---------------------------------------------------------------------------
// Artifact assembly
// ---------------------------------------------------------------------------

function buildConversationContext(
	expectations: string[],
	transcript: TranscriptTurn[],
	metrics: ConversationMetrics | undefined,
): string {
	const metricsBlock = metrics
		? `\`\`\`json\n${JSON.stringify(metrics, null, 2)}\n\`\`\``
		: '(none captured)';
	return [
		'## Conversation transcript',
		'',
		transcriptAsText(transcript),
		'',
		'## Conversation metrics (ground truth — do not recount)',
		'',
		metricsBlock,
		'',
		'## Expectations',
		'',
		expectations.map((e, i) => `${String(i)}. ${e}`).join('\n'),
		'',
		'Return a verdict for every numbered expectation, using its 0-based index.',
	].join('\n');
}
