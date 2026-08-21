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
	/**
	 * The same three tiers as the model received them at the START of its final run —
	 * before it produced anything in the turn being graded.
	 *
	 * This is the snapshot memory claims are graded against. The agent restates facts
	 * while it works, and anything it restates lands back in the window, so grading
	 * the end-of-thread state lets a probe manufacture its own evidence: asking the
	 * agent to apply a rule makes it narrate the rule, and the narration is then found
	 * and scored as retention.
	 *
	 * Known residual: output from EARLIER runs is still present here, including a
	 * resume of the same turn. This removes the dominant confound — the agent being
	 * graded on the very response it just produced — not every trace of restatement.
	 */
	atProbeObservations: string | null;
	atProbeSystemPrompt: string;
	atProbeMessageWindow: string;
	/** False when no run carried a step, so the at-probe snapshot fell back to final. */
	atProbeCaptured: boolean;
	runCount: number;
	stepCount: number;
	/** How many steps carried an observation block — 0 means compression never ran. */
	observationStepCount: number;
}

/** Per-payload cap for the JUDGE's view. Tool results carry whole workflows and
 *  search hits; without a per-segment bound one large result would consume the whole
 *  window budget and push every other retrieved fact out of view.
 *
 *  Deliberately NOT applied on the deterministic-assertion path — see `capPayloads`. */
const MAX_SEGMENT_PAYLOAD_CHARS = 4_000;

function renderPayload(payload: unknown, capPayloads: boolean): string {
	if (payload === undefined || payload === null) return '';
	const text = typeof payload === 'string' ? payload : safeJson(payload);
	return capPayloads && text.length > MAX_SEGMENT_PAYLOAD_CHARS
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
function segmentsToText(content: string, segments: unknown, capPayloads: boolean): string {
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
		const rendered = renderPayload(seg.payload, capPayloads);
		const header = `[${String(seg.type)}${label ? `: ${label}` : ''}]`;
		parts.push(rendered ? `${header} ${rendered}` : header);
	}
	return parts.length > 0 ? parts.join('\n') : content;
}

/**
 * Reduce a thread's captured run debug to the context state worth grading.
 *
 * Walks every step in start order so the *last* observation block wins — the
 * compressed state the agent was carrying at the end of the thread. That end state is
 * NOT what claims are graded against: grading uses the at-probe snapshot below, and
 * the final tiers serve as its fallback and as the way to tell "never had it" apart
 * from "re-derived it while answering". Steps without an observation block are
 * counted, not skipped: `observationStepCount === 0` is itself the finding that
 * compression never ran, and the judge is told so explicitly rather than being
 * handed an empty section it might read as a failed assertion.
 */
/** The value when it carries content, else undefined — so a caller can fall back on
 *  an empty tier as well as an absent one. */
function nonEmpty(text: string | undefined): string | undefined {
	return text !== undefined && text.trim().length > 0 ? text : undefined;
}

interface StepTiers {
	observations: string | null;
	systemPrompt: string;
	messageWindow: string;
}

/** One step's three context tiers, as the model received them. */
function tiersOf(step: { input?: Record<string, unknown> }, capPayloads: boolean): StepTiers {
	const parsed = parseSystemPromptForDisplay(step.input?.system);
	return {
		observations: parsed.observations,
		systemPrompt: parsed.systemBlocks
			.map((block) => segmentsToText(block.content, block.segments, capPayloads))
			.filter((text) => text.trim().length > 0)
			.join('\n\n'),
		messageWindow: parseMessageBlocks(step.input?.messages)
			.map(
				(block) =>
					`### ${block.role}\n${segmentsToText(block.content, block.segments, capPayloads)}`,
			)
			.filter((text) => text.trim().length > 0)
			.join('\n\n'),
	};
}

export interface SummarizeOptions {
	/**
	 * Whether to bound each tool payload at `MAX_SEGMENT_PAYLOAD_CHARS`.
	 *
	 * True for the judge, whose attention is the scarce resource: one 200KB workflow
	 * dump would push every other retrieved fact out of view.
	 *
	 * False for deterministic assertions, which have no attention budget and must not
	 * report a value as absent merely because it sat past the cap inside a large tool
	 * result. Fetched workflows, executions, docs and table schemas routinely exceed
	 * it, and those are exactly the payloads a context assertion exists to check.
	 */
	capPayloads?: boolean;
}

export function summarizeMemoryContext(
	runDebug: InstanceAiRunDebugResponse[] | undefined,
	options: SummarizeOptions = {},
): MemoryContextSummary | undefined {
	const capPayloads = options.capPayloads ?? true;
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
			const tiers = tiersOf(step, capPayloads);
			if (tiers.observations) {
				observations = tiers.observations;
				observationStepCount++;
			}
			// Keep the newest non-empty value: a trailing step whose prompt failed to
			// parse must not blank out the one we'd otherwise report.
			if (tiers.systemPrompt.trim().length > 0) finalSystemPrompt = tiers.systemPrompt;
			if (tiers.messageWindow.trim().length > 0) finalMessageWindow = tiers.messageWindow;
		}
	}

	if (stepCount === 0) return undefined;

	// The at-probe snapshot: the FIRST step of the LAST run that has any. Anchored
	// structurally rather than by matching the probe text, which is unreliable — a
	// follow-up turn is paraphrased by the user proxy, so the sent message need not
	// match the authored one.
	const lastRunWithSteps = [...runs].reverse().find((run) => (run.steps ?? []).length > 0);
	const firstStep = lastRunWithSteps
		? [...(lastRunWithSteps.steps ?? [])].sort((a, b) => a.stepNumber - b.stepNumber)[0]
		: undefined;
	const atProbe = firstStep ? tiersOf(firstStep, capPayloads) : undefined;

	return {
		observations,
		finalSystemPrompt,
		finalMessageWindow,
		atProbeObservations: atProbe ? atProbe.observations : observations,
		// Falls back on an EMPTY tier, not just a missing one: a first step whose
		// prompt or window failed to parse would otherwise blank the snapshot and read
		// as "the model was given nothing", which is a finding we would be inventing.
		atProbeSystemPrompt: nonEmpty(atProbe?.systemPrompt) ?? finalSystemPrompt,
		atProbeMessageWindow: nonEmpty(atProbe?.messageWindow) ?? finalMessageWindow,
		atProbeCaptured: atProbe !== undefined,
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
		summary.atProbeObservations ??
		'(none — the Observer never compressed this thread, so no facts were moved into observational memory. This is NOT itself a failure: on a thread this short the facts should still be present in the raw message window below, which is what the model actually received.)';

	return [
		'## Compressed observation block (as the probe arrived)',
		'',
		observations,
		'',
		'## Raw message window (what the model had when the probe arrived)',
		'',
		truncateMiddle(
			summary.atProbeMessageWindow,
			MAX_MESSAGE_WINDOW_CHARS,
			'(no message window captured)',
		),
		'',
		'## System prompt (as the probe arrived)',
		'',
		truncate(summary.atProbeSystemPrompt, MAX_SYSTEM_PROMPT_CHARS, '(no system prompt captured)'),
		'',
		'## Capture summary (ground truth — do not recount)',
		'',
		`\`\`\`json\n${JSON.stringify(
			{
				runs: summary.runCount,
				steps: summary.stepCount,
				stepsCarryingObservations: summary.observationStepCount,
				compressionRan: summary.observationStepCount > 0,
				snapshot: summary.atProbeCaptured
					? 'as the probe arrived, before the agent answered it'
					: 'end of thread (no per-run snapshot available)',
			},
			null,
			2,
		)}\n\`\`\``,
	].join('\n');
}
