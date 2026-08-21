import type { Message } from '@n8n/agents';
import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import { allFailVerdicts, buildAssertionsBlock, judgeExpectations } from './assertion-judge';
import { asMemoryVerdicts } from './collect';
import { EPHEMERAL_CACHE } from '../../src/utils/eval-agents';
import { buildMemoryContextBlock, summarizeMemoryContext } from '../harness/memory-context';
import { MEMORY_EXPECTATIONS_VERIFY_PROMPT } from '../system-prompts/memory-expectations-verify';
import { asMemoryExpectation } from '../types';
import type { BuildExpectationResult, ContextAnchor, MemoryExpectation } from '../types';

/** Recorded when the run debug never arrived, so the reason reaches the report
 *  instead of the expectations reading as product failures. */
const NO_RUN_DEBUG_REASON =
	'not judged — no run debug was captured for this thread, so there was no context state to grade';

/**
 * Judge author-written expectations about the agent's CONTEXT STATE.
 *
 * Runs as its own judge call against its own rubric, deliberately separate from
 * `verifyBuildExpectations`. The conversation judge receives the full transcript,
 * which would let it satisfy "the agent still knew X" from the turn where X was
 * first said — exactly the confound this expectation kind exists to remove. Keeping
 * the inputs disjoint is what makes a miss attributable to recall rather than to the
 * build.
 *
 * Returns `incomplete` verdicts (not failures) when there is no context state to
 * grade, so a missing capture reads as "no verdict" and stays out of the pass rate.
 */
export async function verifyMemoryExpectations(
	expectations: Array<string | MemoryExpectation>,
	runDebug: InstanceAiRunDebugResponse[] | undefined,
): Promise<BuildExpectationResult[]> {
	if (expectations.length === 0) return [];

	const claims = expectations.map(asMemoryExpectation);
	const texts = claims.map((c) => c.text);

	const summary = summarizeMemoryContext(runDebug);
	if (!summary) return asMemoryVerdicts(allFailVerdicts(texts, NO_RUN_DEBUG_REASON));

	// One judge call per anchor. Claims anchored at different moments need different
	// context blocks, and handing the judge both would put it back in the position of
	// guessing which snapshot a claim meant — the exact ambiguity the anchor removes.
	const anchors = [...new Set(claims.map((c) => c.anchor ?? 'probe'))];
	const byIndex = new Map<number, BuildExpectationResult>();

	for (const anchor of anchors) {
		const group = claims
			.map((claim, index) => ({ claim, index }))
			.filter(({ claim }) => (claim.anchor ?? 'probe') === anchor);
		const groupTexts = group.map(({ claim }) => claim.text);

		const verdicts = await judgeAnchoredGroup(summary, anchor, groupTexts);
		verdicts.forEach((verdict, i) => {
			const target = group[i];
			if (target) byIndex.set(target.index, verdict);
		});
	}

	// Restore author order: a case reads its verdicts against the list it wrote, and
	// grouping by anchor would otherwise silently reorder them.
	return claims.map(
		(claim, index) =>
			byIndex.get(index) ?? {
				expectation: claim.text,
				pass: false,
				reason: NO_RUN_DEBUG_REASON,
				incomplete: true,
				kind: 'memory' as const,
			},
	);
}

async function judgeAnchoredGroup(
	summary: NonNullable<ReturnType<typeof summarizeMemoryContext>>,
	anchor: ContextAnchor,
	texts: string[],
): Promise<BuildExpectationResult[]> {
	const messages: Message[] = [
		{
			role: 'user',
			content: [
				// The context block is stable for this build — one cache breakpoint, matching
				// how the conversation judge caches its workflow/artifact context.
				{
					type: 'text',
					text: buildMemoryContextBlock(summary, anchor),
					providerOptions: EPHEMERAL_CACHE,
				},
				{ type: 'text', text: buildAssertionsBlock(texts) },
			],
		},
	];

	return asMemoryVerdicts(
		await judgeExpectations(messages, texts, {
			agentName: 'eval-memory-expectations-verifier',
			instructions: MEMORY_EXPECTATIONS_VERIFY_PROMPT,
			logLabel: `memory-expectations:${anchor}`,
		}),
	);
}
