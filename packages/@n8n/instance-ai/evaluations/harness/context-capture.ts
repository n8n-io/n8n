import type {
	InstanceAiRunDebugResponse,
	InstanceAiRunDebugStep,
	ReadableContentBlock,
	ReadableSegment,
} from '@n8n/api-types';
import { parseMessageBlocks, parseSystemPromptForDisplay } from '@n8n/api-types';

import type { ContextAnchor } from '../types';

/**
 * The three places a fact can be sitting when the model reads its context.
 *
 * Kept apart rather than concatenated so a verdict can say *where* a value was
 * found: surviving in the compressed observation block is a different claim about
 * the memory subsystem than still being visible in the raw message window.
 */
export interface ContextSnapshot {
	/** The compressed observation block. `null` when compression never ran, which is
	 *  itself a finding rather than a missing capture. */
	observations: string | null;
	systemPrompt: string;
	messageWindow: string;
}

/**
 * One thread's context state at the two moments worth grading.
 *
 * `probe` is deliberately optional. A step whose prompt and window both failed to
 * parse cannot answer a retention question, and substituting the end-of-turn state
 * would report content the agent produced *while answering* as evidence that it
 * remembered — a pass-biased lie. Making the absence a type rather than a flag means
 * a caller has to decide what to do about it.
 */
export interface CapturedContext {
	/** Absent when the graded turn's first step captured nothing gradable. */
	probe?: ContextSnapshot;
	turnEnd: ContextSnapshot;
}

function stringify(payload: unknown): string {
	if (payload === undefined) return '';
	try {
		return JSON.stringify(payload) ?? '';
	} catch {
		// Circular or otherwise unserialisable. Losing one payload beats losing the run.
		return '';
	}
}

/** Exhaustive over `ReadableSegment`, so a new segment kind is a type error here
 *  rather than a value that silently stops being searchable. */
function segmentText(segment: ReadableSegment): string {
	switch (segment.type) {
		case 'text':
		case 'reasoning':
			return segment.text;
		case 'tool-call':
			return `${segment.name} ${stringify(segment.payload)}`;
		case 'tool-result':
			return `${segment.name ?? ''} ${stringify(segment.payload)}`;
		case 'json':
			return `${segment.label ?? ''} ${stringify(segment.payload)}`;
	}
}

/** Segments are the parsed form of `content`, so prefer them and fall back only when
 *  they render to nothing. Payloads are included untruncated: this text is searched,
 *  never shown to a model, so it has no attention budget to protect. */
function blockText(block: ReadableContentBlock): string {
	const fromSegments = (block.segments ?? [])
		.map(segmentText)
		.filter((text) => text.trim().length > 0)
		.join('\n');
	return fromSegments.length > 0 ? fromSegments : block.content;
}

function snapshotOf(step: InstanceAiRunDebugStep): ContextSnapshot {
	const parsed = parseSystemPromptForDisplay(step.input?.system);
	const join = (blocks: string[]) => blocks.filter((text) => text.trim().length > 0).join('\n\n');
	return {
		observations: parsed.observations,
		systemPrompt: join(parsed.systemBlocks.map(blockText)),
		messageWindow: join(
			parseMessageBlocks(step.input?.messages).map((block) => `${block.role}\n${blockText(block)}`),
		),
	};
}

/** A snapshot can answer a question only if the model demonstrably had both a prompt
 *  and a window. Observations are excluded: `null` there means compression did not
 *  run, not that the capture failed. */
function isGradable(snapshot: ContextSnapshot): boolean {
	return snapshot.systemPrompt.trim().length > 0 && snapshot.messageWindow.trim().length > 0;
}

/**
 * Reduce a thread's captured run debug to the two anchored snapshots.
 *
 * The probe is anchored structurally — the first step of the last run — rather than
 * by matching the probe text. A follow-up turn is paraphrased by the user proxy, so
 * the message actually sent need not match the one the case authored.
 */
export function captureContext(
	runDebug: InstanceAiRunDebugResponse[] | undefined,
): CapturedContext | undefined {
	if (!runDebug || runDebug.length === 0) return undefined;

	const runs = [...runDebug].sort((a, b) => a.startedAt - b.startedAt);
	const turnEnd: ContextSnapshot = { observations: null, systemPrompt: '', messageWindow: '' };
	let sawStep = false;

	for (const run of runs) {
		for (const step of run.steps ?? []) {
			sawStep = true;
			const snapshot = snapshotOf(step);
			// Keep the newest non-empty value per tier: a trailing step whose prompt
			// failed to parse must not blank out the state we would otherwise report.
			if (snapshot.observations !== null) turnEnd.observations = snapshot.observations;
			if (snapshot.systemPrompt.trim().length > 0) turnEnd.systemPrompt = snapshot.systemPrompt;
			if (snapshot.messageWindow.trim().length > 0) turnEnd.messageWindow = snapshot.messageWindow;
		}
	}
	if (!sawStep) return undefined;

	const gradedRun = [...runs].reverse().find((run) => (run.steps ?? []).length > 0);
	const firstStep = [...(gradedRun?.steps ?? [])].sort((a, b) => a.stepNumber - b.stepNumber)[0];
	const probe = firstStep ? snapshotOf(firstStep) : undefined;

	return { probe: probe && isGradable(probe) ? probe : undefined, turnEnd };
}

export function snapshotFor(
	captured: CapturedContext,
	anchor: ContextAnchor,
): ContextSnapshot | undefined {
	return anchor === 'turn-end' ? captured.turnEnd : captured.probe;
}

/** Tier name → text, in the order a verdict should name them. */
export function tiersOf(snapshot: ContextSnapshot): Array<[string, string]> {
	return [
		['observation block', snapshot.observations ?? ''],
		['message window', snapshot.messageWindow],
		['system prompt', snapshot.systemPrompt],
	];
}
