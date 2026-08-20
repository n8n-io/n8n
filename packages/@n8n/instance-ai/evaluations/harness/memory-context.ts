import type { InstanceAiRunDebugResponse } from '@n8n/api-types';
import { parseMessageBlocks, parseSystemPromptForDisplay } from '@n8n/api-types';

/** Cap on the rendered context block. The final system prompt carries the whole
 *  baked knowledge base, which dwarfs the observation block and would push the
 *  part we actually grade out of the judge's attention. */
const MAX_SYSTEM_PROMPT_CHARS = 40_000;

/** Cap on the rendered message window. Tool results dominate the message log, so an
 *  uncapped window would swamp both other sections. */
const MAX_MESSAGE_WINDOW_CHARS = 40_000;

export interface MemoryContextSummary {
	/** Last non-empty compressed observation block seen across the thread's runs. */
	observations: string | null;
	/** System prompt the model saw on the final captured step. */
	finalSystemPrompt: string;
	/**
	 * Raw message window the model was handed on the final captured step.
	 *
	 * Load-bearing, not extra colour. The Observer only compresses past its token
	 * threshold, so a thread that stays under it has NO observation block while every
	 * fact is still sitting in this window — the model genuinely still has them.
	 * Grading such a thread on the observation block alone fails every memory
	 * expectation for a structural reason rather than a recall one, which would make
	 * the whole kind useless on exactly the short threads the suite is made of.
	 */
	finalMessageWindow: string;
	runCount: number;
	stepCount: number;
	/** How many steps carried an observation block — 0 means compression never ran. */
	observationStepCount: number;
}

function segmentsToText(content: string, segments: unknown): string {
	if (!Array.isArray(segments) || segments.length === 0) return content;
	const parts: string[] = [];
	for (const segment of segments) {
		if (typeof segment !== 'object' || segment === null) continue;
		const seg = segment as { type?: unknown; text?: unknown; name?: unknown };
		if ((seg.type === 'text' || seg.type === 'reasoning') && typeof seg.text === 'string') {
			parts.push(seg.text);
		} else if (typeof seg.name === 'string') {
			parts.push(`[${String(seg.type)}: ${seg.name}]`);
		}
	}
	return parts.length > 0 ? parts.join('\n') : content;
}

/**
 * Reduce a thread's captured run debug to the context state worth grading.
 *
 * Walks every step in start order so the *last* observation block wins — that is
 * the compressed state the agent was carrying at the end of the thread, which is
 * what a memory expectation asserts about. Steps without an observation block are
 * counted, not skipped: `observationStepCount === 0` is itself the finding that
 * compression never ran, and the judge is told so explicitly rather than being
 * handed an empty section it might read as a failed assertion.
 */
export function summarizeMemoryContext(
	runDebug: InstanceAiRunDebugResponse[] | undefined,
): MemoryContextSummary | undefined {
	if (!runDebug || runDebug.length === 0) return undefined;

	let observations: string | null = null;
	let finalSystemPrompt = '';
	let finalMessageWindow = '';
	let stepCount = 0;
	let observationStepCount = 0;

	const runs = [...runDebug].sort((a, b) => a.startedAt - b.startedAt);
	for (const run of runs) {
		for (const step of run.steps ?? []) {
			stepCount++;
			const parsed = parseSystemPromptForDisplay(step.input?.system);
			if (parsed.observations) {
				observations = parsed.observations;
				observationStepCount++;
			}
			const systemText = parsed.systemBlocks
				.map((block) => segmentsToText(block.content, block.segments))
				.filter((text) => text.trim().length > 0)
				.join('\n\n');
			// Keep the newest non-empty prompt: a trailing step whose system prompt
			// failed to parse must not blank out the one we'd otherwise report.
			if (systemText.trim().length > 0) finalSystemPrompt = systemText;

			const windowText = parseMessageBlocks(step.input?.messages)
				.map((block) => `### ${block.role}\n${segmentsToText(block.content, block.segments)}`)
				.filter((text) => text.trim().length > 0)
				.join('\n\n');
			if (windowText.trim().length > 0) finalMessageWindow = windowText;
		}
	}

	if (stepCount === 0) return undefined;

	return {
		observations,
		finalSystemPrompt,
		finalMessageWindow,
		runCount: runs.length,
		stepCount,
		observationStepCount,
	};
}

function truncate(text: string, limit: number, fallback: string): string {
	if (text.length === 0) return fallback;
	return text.length > limit ? `${text.slice(0, limit)}\n\n[…truncated]` : text;
}

/**
 * Render the context state as the judge's sole grading input.
 *
 * Carries what the model was actually handed on its final step — the compressed
 * observation block, the system prompt, and the raw message window — and
 * deliberately NOT the full conversation transcript or the built workflow. The
 * distinction matters: the window is what the agent still had, whereas the
 * transcript also contains turns long since evicted from it. Grading against the
 * transcript would let the judge satisfy "the agent still knew X" from the turn
 * where X was first said even after the fact fell out of context, which is the
 * confound this expectation kind exists to remove; grading against the window is
 * simply the truth about what was retained.
 */
export function buildMemoryContextBlock(summary: MemoryContextSummary): string {
	// Named so the judge is told which tier held the fact, without being invited to
	// treat an absent observation block as an automatic failure.
	const observations =
		summary.observations ??
		'(none — the Observer never compressed this thread, so no facts were moved into observational memory. This is NOT itself a failure: on a thread this short the facts should still be present in the raw message window below, which is what the model actually received.)';

	return [
		'## Compressed observation block (final state)',
		'',
		observations,
		'',
		'## Raw message window (what the model received on its last step)',
		'',
		truncate(summary.finalMessageWindow, MAX_MESSAGE_WINDOW_CHARS, '(no message window captured)'),
		'',
		'## Final system prompt (what the model saw on the last step)',
		'',
		truncate(summary.finalSystemPrompt, MAX_SYSTEM_PROMPT_CHARS, '(no system prompt captured)'),
		'',
		'## Capture summary (ground truth — do not recount)',
		'',
		`\`\`\`json\n${JSON.stringify(
			{
				runs: summary.runCount,
				steps: summary.stepCount,
				stepsCarryingObservations: summary.observationStepCount,
				compressionRan: summary.observationStepCount > 0,
			},
			null,
			2,
		)}\n\`\`\``,
	].join('\n');
}
