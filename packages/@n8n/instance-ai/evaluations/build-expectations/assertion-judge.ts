import type { Message } from '@n8n/agents';
import { z } from 'zod';

import { EPHEMERAL_CACHE, SONNET_MODEL, createEvalAgent } from '../../src/utils/eval-agents';
import { BUILD_EXPECTATIONS_VERIFY_PROMPT } from '../system-prompts/build-expectations-verify';
import type { BuildExpectationResult } from '../types';

// ---------------------------------------------------------------------------
// Structured output schema
// ---------------------------------------------------------------------------

export const expectationResultSchema = z.object({
	results: z.array(
		z.object({
			index: z.number(),
			pass: z.boolean(),
			reason: z.string(),
		}),
	),
});

const JUDGE_MODEL = SONNET_MODEL;
const MAX_VERIFY_ATTEMPTS = 2;
const VERIFY_ATTEMPT_TIMEOUT_MS = 120_000;

/** Numbered assertions block + the trailer instructing the judge to answer by index. */
export function buildAssertionsBlock(assertions: string[]): string {
	return [
		'## Expectations',
		'',
		assertions.map((e, i) => `${String(i)}. ${e}`).join('\n'),
		'',
		'Return a verdict for every numbered expectation, using its 0-based index.',
	].join('\n');
}

/**
 * Shared judge core: sends caller-built messages to the expectations judge and maps
 * the structured verdicts back onto `assertions` by index. Used by both the
 * workflow/conversation judge (`verifyBuildExpectations`) and static artifact handlers
 * (`runAssertionJudge`) so retry/timeout/parsing behavior stays in one place.
 */
export async function judgeExpectations(
	messages: Message[],
	assertions: string[],
): Promise<BuildExpectationResult[]> {
	if (assertions.length === 0) return [];

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
				if (entry.index >= 0 && entry.index < assertions.length) {
					byIndex.set(entry.index, { pass: entry.pass, reason: entry.reason });
				}
			}
		}

		if (byIndex.size > 0) {
			// Omitted expectations are marked `incomplete` (not a genuine fail).
			return assertions.map((expectation, i) => {
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
	return allFailVerdicts(assertions, 'judge produced no result');
}

/**
 * Verdicts when the judge produced nothing (exhausted attempts, or callers'
 * `.catch()`). Marked `incomplete` so a dead judge renders as neutral "no
 * verdict" rather than every expectation failing.
 */
export function allFailVerdicts(assertions: string[], reason: string): BuildExpectationResult[] {
	return assertions.map((expectation) => ({
		expectation,
		pass: false,
		reason,
		incomplete: true,
	}));
}

/**
 * Judge a static artifact (agent config, config-eval composite, ...) against free-text
 * assertions. Mirrors the workflow judge's message shape (cached artifact block + numbered
 * assertions block) so the shared prompt/schema apply unchanged to any artifact type.
 */
export async function runAssertionJudge(
	renderedArtifactBlock: string,
	assertions: string[],
): Promise<BuildExpectationResult[]> {
	const messages: Message[] = [
		{
			role: 'user',
			content: [
				{
					type: 'text',
					text: renderedArtifactBlock,
					providerOptions: EPHEMERAL_CACHE,
				},
				{
					type: 'text',
					text: buildAssertionsBlock(assertions),
				},
			],
		},
	];

	return await judgeExpectations(messages, assertions);
}
