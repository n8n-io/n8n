// ---------------------------------------------------------------------------
// Deterministic parser for the intent-recognition skill's classification
// output format (see packages/@n8n/instance-ai/skills/intent-recognition/SKILL.md
// § Output Format). Pure — no LLM calls.
// ---------------------------------------------------------------------------

import type { IntentAnchor, IntentPrediction } from '../types';

const PART_LINE = /^part\s*:\s*(.*)$/i;
const ANCHOR_LINE = /^anchor\s*:\s*(.*)$/i;
const EMBEDS_LINE = /^embeds\s*other\s*:\s*(.*)$/i;
const RATIONALE_LINE = /^rationale\s*:\s*(.*)$/i;
const CLARIFYING_LINE = /^clarifying\s*questions\s*:\s*(.*)$/i;
const LEADING_BULLET = /^(?:[-*•]|\d+[.)])\s+/;

interface RawBlock {
	part?: string;
	anchor?: string;
	embeds?: string;
	rationaleLines: string[];
	clarifyingLines: string[];
}

type ActiveField = 'rationale' | 'clarifying' | null;

function stripQuotes(text: string): string {
	return text.trim().replace(/^["'\u201c\u2018]+|["'\u201d\u2019]+$/g, '');
}

/** Strip a leading bullet/number marker and markdown bold/italic emphasis, so
 *  header matching is tolerant of the model wrapping labels like
 *  "- **Anchor:** agent" or "*Anchor*: agent". */
function cleanLine(rawLine: string): string {
	let line = rawLine.trim();
	line = line.replace(LEADING_BULLET, '');
	line = line.replace(/\*\*/g, '').replace(/__/g, '').replace(/\*/g, '');
	return line.trim();
}

function normalizeAnchor(raw: string): IntentAnchor | undefined {
	const s = raw.trim().toLowerCase();
	if (s === 'workflow' || s === 'wf' || s === 'workflow-anchored' || s === 'wf-anchored') {
		return 'wf';
	}
	if (s === 'agent' || s === 'agent-anchored') return 'agent';
	if (s === 'clarify') return 'clarify';
	if (s === 'out-of-scope' || s === 'out of scope' || s === 'outofscope') return 'out-of-scope';
	return undefined;
}

function normalizeEmbeds(raw: string | undefined): boolean | 'n/a' {
	if (!raw) return 'n/a';
	const s = raw.trim().toLowerCase().replace(/\.$/, '');
	if (s === 'yes' || s === 'true' || s === 'y') return true;
	if (s === 'no' || s === 'false' || s === 'n') return false;
	return 'n/a';
}

/** Split a raw agent response into classification blocks. Every recognized
 *  header ("Part:", "Anchor:", "Embeds other:", "Rationale:", "Clarifying
 *  questions:") is tolerant of markdown bold/italic and a leading bullet, so
 *  reasonable formatting drift from the model doesn't break parsing. */
function scanRawBlocks(text: string): RawBlock[] {
	const blocks: RawBlock[] = [];
	let current: RawBlock | undefined;
	let pendingPart: string | undefined;
	let activeField: ActiveField = null;

	for (const rawLine of text.split(/\r?\n/)) {
		if (rawLine.trim().length === 0) {
			activeField = null;
			continue;
		}
		const line = cleanLine(rawLine);
		if (line.length === 0) {
			activeField = null;
			continue;
		}

		const partMatch = PART_LINE.exec(line);
		if (partMatch) {
			pendingPart = stripQuotes(partMatch[1]);
			activeField = null;
			continue;
		}

		const anchorMatch = ANCHOR_LINE.exec(line);
		if (anchorMatch) {
			if (current) blocks.push(current);
			current = {
				part: pendingPart,
				anchor: anchorMatch[1],
				rationaleLines: [],
				clarifyingLines: [],
			};
			pendingPart = undefined;
			activeField = null;
			continue;
		}

		if (!current) continue; // prose before the first Anchor: line — ignore

		const embedsMatch = EMBEDS_LINE.exec(line);
		if (embedsMatch) {
			current.embeds = embedsMatch[1];
			activeField = null;
			continue;
		}

		const rationaleMatch = RATIONALE_LINE.exec(line);
		if (rationaleMatch) {
			current.rationaleLines = rationaleMatch[1].trim() ? [rationaleMatch[1].trim()] : [];
			activeField = 'rationale';
			continue;
		}

		const clarifyingMatch = CLARIFYING_LINE.exec(line);
		if (clarifyingMatch) {
			current.clarifyingLines = clarifyingMatch[1].trim() ? [clarifyingMatch[1].trim()] : [];
			activeField = 'clarifying';
			continue;
		}

		if (activeField === 'rationale') {
			current.rationaleLines.push(line);
		} else if (activeField === 'clarifying') {
			current.clarifyingLines.push(line);
		}
		// else: unrecognized prose inside a block — ignore
	}
	if (current) blocks.push(current);
	return blocks;
}

export interface ParsedIntentPredictions {
	predictions: IntentPrediction[];
	error?: string;
}

/**
 * Parse the final agent text into one or more classification blocks per the
 * intent-recognition skill's output format. Blocks with an unrecognized
 * `Anchor:` value are dropped as unparseable; if every block is dropped (or
 * none were found at all), returns an empty prediction list with `error` set.
 */
export function parseIntentPredictions(finalAgentText: string): ParsedIntentPredictions {
	const rawBlocks = scanRawBlocks(finalAgentText);
	const predictions: IntentPrediction[] = [];

	for (const raw of rawBlocks) {
		const anchor = raw.anchor ? normalizeAnchor(raw.anchor) : undefined;
		if (!anchor) continue;

		const rationale = raw.rationaleLines.join(' ').trim();
		const clarifyingQuestions = raw.clarifyingLines.map((q) => q.trim()).filter(Boolean);

		predictions.push({
			span: raw.part,
			anchor,
			embedsOther: normalizeEmbeds(raw.embeds),
			rationale: rationale.length > 0 ? rationale : undefined,
			clarifyingQuestions: clarifyingQuestions.length > 0 ? clarifyingQuestions : undefined,
		});
	}

	if (predictions.length === 0) {
		return { predictions: [], error: 'no classification block found' };
	}
	return { predictions };
}
