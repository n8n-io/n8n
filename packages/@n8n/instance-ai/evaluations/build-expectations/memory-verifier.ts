import type { Message } from '@n8n/agents';
import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import { allFailVerdicts, buildAssertionsBlock, judgeExpectations } from './assertion-judge';
import { asMemoryVerdicts } from './collect';
import { EPHEMERAL_CACHE } from '../../src/utils/eval-agents';
import { buildMemoryContextBlock, summarizeMemoryContext } from '../harness/memory-context';
import { MEMORY_EXPECTATIONS_VERIFY_PROMPT } from '../system-prompts/memory-expectations-verify';
import type { BuildExpectationResult } from '../types';

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
	expectations: string[],
	runDebug: InstanceAiRunDebugResponse[] | undefined,
): Promise<BuildExpectationResult[]> {
	if (expectations.length === 0) return [];

	const summary = summarizeMemoryContext(runDebug);
	if (!summary) return asMemoryVerdicts(allFailVerdicts(expectations, NO_RUN_DEBUG_REASON));

	const messages: Message[] = [
		{
			role: 'user',
			content: [
				// The context block is stable for this build — one cache breakpoint, matching
				// how the conversation judge caches its workflow/artifact context.
				{
					type: 'text',
					text: buildMemoryContextBlock(summary),
					providerOptions: EPHEMERAL_CACHE,
				},
				{ type: 'text', text: buildAssertionsBlock(expectations) },
			],
		},
	];

	return asMemoryVerdicts(
		await judgeExpectations(messages, expectations, {
			agentName: 'eval-memory-expectations-verifier',
			instructions: MEMORY_EXPECTATIONS_VERIFY_PROMPT,
			logLabel: 'memory-expectations',
		}),
	);
}
