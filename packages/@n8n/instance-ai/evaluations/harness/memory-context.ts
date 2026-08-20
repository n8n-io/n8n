import type { InstanceAiRunDebugResponse } from '@n8n/api-types';
import { parseMessageBlocks, parseSystemPromptForDisplay } from '@n8n/api-types';

/** Cap on the rendered context block. The final system prompt carries the whole
 *  baked knowledge base, which dwarfs the observation block and would push the
 *  part we actually grade out of the judge's attention. */
const MAX_SYSTEM_PROMPT_CHARS = 40_000;

/** Cap on the rendered message window. Tool results dominate the message log, so an
 *  uncapped window would swamp both other sections — but the window is where fetched
 *  context lands, so it gets the largest share of the budget. */
const MAX_MESSAGE_WINDOW_CHARS = 80_000;

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

/** Per-payload cap. Tool results carry whole workflows and search hits; without a
 *  per-segment bound one large result would consume the whole window budget and
 *  push every other retrieved fact out of view. */
const MAX_SEGMENT_PAYLOAD_CHARS = 4_000;

function renderPayload(payload: unknown): string {
	if (payload === undefined || payload === null) return '';
	const text = typeof payload === 'string' ? payload : safeJson(payload);
	return text.length > MAX_SEGMENT_PAYLOAD_CHARS
		? `${text.slice(0, MAX_SEGMENT_PAYLOAD_CHARS)}…[payload truncated]`
		: text;
}

function safeJson(value: unknown): string {
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}

/**
 * Flatten one content block to text.
 *
 * Tool-call arguments and tool-result payloads are rendered in full (bounded), not
 * summarised to a `[tool-result: name]` placeholder. Context the agent fetches on
 * demand — another workflow, an execution, a doc, a data-table schema — arrives as a
 * tool result, so dropping payloads would make the judge report "not present" for
 * exactly the retrieved content a context system exists to deliver.
 */
function segmentsToText(content: string, segments: unknown): string {
	if (!Array.isArray(segments) || segments.length === 0) return content;
	const parts: string[] = [];
	for (const segment of segments) {
		if (typeof segment !== 'object' || segment === null) continue;
		const seg = segment as {
			type?: unknown;
			text?: unknown;
			name?: unknown;
			label?: unknown;
			payload?: unknown;
		};
		if ((seg.type === 'text' || seg.type === 'reasoning') && typeof seg.text === 'string') {
			parts.push(seg.text);
			continue;
		}
		const label =
			typeof seg.name === 'string'
				? seg.name
				: typeof seg.label === 'string'
					? seg.label
					: undefined;
		const rendered = renderPayload(seg.payload);
		const header = `[${String(seg.type)}${label ? `: ${label}` : ''}]`;
		parts.push(rendered ? `${header} ${rendered}` : header);
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
 * Keep both ends of an oversized window, dropping the middle.
 *
 * Presence claims can point anywhere: a fact planted early sits at the head, while
 * content the agent just fetched sits at the tail. Head-only truncation would hide
 * fresh tool results, and tail-only would hide the planted facts — so keep both and
 * say plainly what was dropped, rather than letting the judge read a cut as absence.
 */
function truncateMiddle(text: string, limit: number, fallback: string): string {
	if (text.length === 0) return fallback;
	if (text.length <= limit) return text;
	const half = Math.floor(limit / 2);
	const dropped = text.length - half * 2;
	return [
		text.slice(0, half),
		`\n\n[…${dropped.toLocaleString()} characters of the middle of the window omitted — treat absence here as unknown, not as evidence…]\n\n`,
		text.slice(text.length - half),
	].join('');
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
		truncateMiddle(
			summary.finalMessageWindow,
			MAX_MESSAGE_WINDOW_CHARS,
			'(no message window captured)',
		),
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
