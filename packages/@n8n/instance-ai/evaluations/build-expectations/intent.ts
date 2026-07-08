// ---------------------------------------------------------------------------
// Deterministic exact-match grader for the agent's fenced ```intent block.
//
// Sibling to verifier.ts (the LLM judge for free-text expectations): this
// module grades the anchor/embeds_other classification decision by parsing
// structured JSON instead, emitting the same BuildExpectationResult[] shape
// so the rest of the pipeline (aggregation, report, LangSmith) is unchanged.
// ---------------------------------------------------------------------------

import type { BuildExpectationResult, IntentExpectation, IntentTuple } from '../types';

export type IntentParseResult =
	| { ok: true; kind: 'single'; tuple: IntentTuple }
	| { ok: true; kind: 'parts'; tuples: IntentTuple[] }
	| { ok: false; error: string };

/** Finds the LAST fenced ```intent block in the text, tolerating leading
 *  whitespace before the fence and \r\n line endings. */
function findLastIntentBlock(text: string): string | undefined {
	const re = /[ \t]*```intent[ \t]*\r?\n([\s\S]*?)\r?\n?[ \t]*```/g;
	let match: RegExpExecArray | null;
	let last: string | undefined;
	while ((match = re.exec(text)) !== null) {
		last = match[1];
	}
	return last;
}

function normalizeAnchor(
	raw: unknown,
): { ok: true; anchor: IntentTuple['anchor'] } | { ok: false; error: string } {
	const v = typeof raw === 'string' ? raw.trim().toLowerCase() : undefined;
	if (v === 'workflow-anchored' || v === 'wf-anchored' || v === 'workflow' || v === 'wf') {
		return { ok: true, anchor: 'wf' };
	}
	if (v === 'agent-anchored' || v === 'agent') {
		return { ok: true, anchor: 'agent' };
	}
	if (v === 'needs-clarification' || v === 'clarify' || v === 'clarification') {
		return { ok: true, anchor: 'clarify' };
	}
	if (v === 'out-of-scope' || v === 'out_of_scope' || v === 'meta') {
		return { ok: true, anchor: 'out-of-scope' };
	}
	return { ok: false, error: `unrecognized anchor value: ${JSON.stringify(raw)}` };
}

function normalizeEmbedsOther(
	raw: unknown,
): { ok: true; value: boolean | 'n/a' } | { ok: false; error: string } {
	if (raw === true || raw === false) return { ok: true, value: raw };
	if (raw === null || raw === undefined) return { ok: true, value: 'n/a' };
	if (typeof raw === 'string') {
		const v = raw.trim().toLowerCase();
		if (v === 'n/a') return { ok: true, value: 'n/a' };
		if (v === 'true') return { ok: true, value: true };
		if (v === 'false') return { ok: true, value: false };
	}
	return { ok: false, error: `unrecognized embeds_other value: ${JSON.stringify(raw)}` };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTuple(
	obj: Record<string, unknown>,
): { ok: true; tuple: IntentTuple } | { ok: false; error: string } {
	const anchor = normalizeAnchor(obj.anchor);
	if (!anchor.ok) return anchor;
	const rawEmbeds = 'embeds_other' in obj ? obj.embeds_other : obj.embedsOther;
	const embedsOther = normalizeEmbedsOther(rawEmbeds);
	if (!embedsOther.ok) return embedsOther;
	return { ok: true, tuple: { anchor: anchor.anchor, embedsOther: embedsOther.value } };
}

/** Parses the LAST fenced ```intent block, if any. `undefined` means no block
 *  was found at all — the caller reports that as a distinct failure reason
 *  from a malformed block (`ok: false`). */
export function parseIntentBlock(finalText: string): IntentParseResult | undefined {
	const block = findLastIntentBlock(finalText);
	if (block === undefined) return undefined;

	let json: unknown;
	try {
		json = JSON.parse(block);
	} catch {
		return { ok: false, error: 'intent block is not valid JSON' };
	}
	if (!isRecord(json)) {
		return { ok: false, error: 'intent block is not a JSON object' };
	}

	if ('parts' in json) {
		if (!Array.isArray(json.parts)) {
			return { ok: false, error: 'intent block "parts" is not an array' };
		}
		const tuples: IntentTuple[] = [];
		for (const part of json.parts) {
			if (!isRecord(part)) {
				return { ok: false, error: 'intent block part is not a JSON object' };
			}
			const result = parseTuple(part);
			if (!result.ok) return result;
			tuples.push(result.tuple);
		}
		return { ok: true, kind: 'parts', tuples };
	}

	const result = parseTuple(json);
	if (!result.ok) return result;
	return { ok: true, kind: 'single', tuple: result.tuple };
}

function tuplesMatch(produced: IntentTuple, accepted: IntentTuple): boolean {
	if (produced.anchor !== accepted.anchor) return false;
	if (accepted.anchor === 'clarify' || accepted.anchor === 'out-of-scope') return true;
	return accepted.embedsOther === 'n/a' || produced.embedsOther === accepted.embedsOther;
}

function formatTuple(t: IntentTuple): string {
	return `{anchor: ${t.anchor}, embeds_other: ${String(t.embedsOther)}}`;
}

function matchAgainstAccepts(
	produced: IntentTuple,
	accepts: IntentTuple[],
): { pass: boolean; reason: string } {
	if (accepts.some((a) => tuplesMatch(produced, a))) {
		return { pass: true, reason: `matched ${formatTuple(produced)}` };
	}
	return {
		pass: false,
		reason: `got ${formatTuple(produced)}; accepted: [${accepts.map(formatTuple).join(', ')}]`,
	};
}

/** Grades the structured `intentExpectation` against the agent's captured
 *  final text. Mirrors `verifyBuildExpectations`'s result shape so the two
 *  grading paths are interchangeable downstream. */
export function gradeIntentExpectation(
	expectation: IntentExpectation,
	finalText: string | undefined,
): BuildExpectationResult[] {
	const parts = expectation.parts;
	const accepts = expectation.accepts;
	const unitLabels = parts ? parts.map((p) => p.label) : [undefined];
	const expectationName = (l: string | undefined): string =>
		l === undefined
			? 'intent: anchor + embeds_other exact-match'
			: `intent [${l}]: anchor + embeds_other exact-match`;

	if (finalText === undefined) {
		return unitLabels.map((l) => ({
			expectation: expectationName(l),
			pass: false,
			reason: 'no agent output captured',
			incomplete: true,
		}));
	}

	const parsed = parseIntentBlock(finalText);
	if (!parsed?.ok) {
		const reason = parsed === undefined ? 'no intent block found' : parsed.error;
		return unitLabels.map((l) => ({ expectation: expectationName(l), pass: false, reason }));
	}

	if (parts) {
		const produced = parsed.kind === 'parts' ? parsed.tuples : [parsed.tuple];
		if (produced.length !== parts.length) {
			const reason = `expected ${String(parts.length)} parts, got ${String(produced.length)}`;
			return parts.map((p) => ({ expectation: expectationName(p.label), pass: false, reason }));
		}
		return parts.map((p, i) => {
			const { pass, reason } = matchAgainstAccepts(produced[i], p.accepts);
			return { expectation: expectationName(p.label), pass, reason };
		});
	}

	if (parsed.kind === 'parts') {
		return [
			{
				expectation: expectationName(undefined),
				pass: false,
				reason: `expected a single classification, got ${String(parsed.tuples.length)} parts`,
			},
		];
	}
	const { pass, reason } = matchAgainstAccepts(parsed.tuple, accepts ?? []);
	return [{ expectation: expectationName(undefined), pass, reason }];
}
