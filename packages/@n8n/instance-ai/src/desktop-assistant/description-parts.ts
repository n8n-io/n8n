/**
 * Segmented-description helpers shared by the desktop-assistant surfaces:
 * the task detail view (cli) generates description parts from workflow JSON,
 * and the `propose-task-plan` tool emits the same shape for not-yet-built
 * tasks. Pure functions over the `DesktopAssistantDescriptionPart` API type.
 */
import type { DesktopAssistantDescriptionPart } from '@n8n/api-types';
import { DESKTOP_ASSISTANT_PART_MAX_OPTIONS } from '@n8n/api-types';

/** Loosely-shaped part as the model returns it; normalization tightens it into
 *  the API shape. */
export interface RawDescriptionPart {
	kind: 'text' | 'param';
	text?: string;
	value?: string;
	options?: string[];
}

/** Cap mirroring the description instructions; enforced again here so a
 *  misbehaving generation can't bloat the stored cache. */
const MAX_DESCRIPTION_PARAMS = 4;

/**
 * Param/option guidance shared verbatim by every prompt that asks the model to
 * produce description parts — the agent profile, the propose-task-plan tool,
 * and the cli's description generation — so the conventions can't drift
 * between surfaces.
 */
export const PARAM_OPTIONS_COUNT_GUIDANCE =
	'as many as are genuinely useful: a couple for a service, more for something like a schedule';

export const CHANNEL_PARAM_GUIDANCE =
	'The channel a result is delivered or posted through is itself a tweakable value — mark it as a param rather than baking it into the prose ("send it via email to you" has two params: the channel and the recipient).';

/**
 * Tighten the model's parts into the API shape: drop empty/malformed parts,
 * merge adjacent text parts, de-duplicate options (and the current value out
 * of them), cap param/option counts, repair missing inter-word spacing at
 * text↔param boundaries, and assign stable per-description param ids
 * (`p1`, `p2`, …) used by the apply-edits request to reference a chip.
 */
export function normalizeDescriptionParts(
	rawParts: RawDescriptionPart[],
): DesktopAssistantDescriptionPart[] {
	const parts: DesktopAssistantDescriptionPart[] = [];
	let paramCount = 0;
	for (const raw of rawParts) {
		if (raw.kind === 'param' && raw.value?.trim() && paramCount < MAX_DESCRIPTION_PARAMS) {
			const value = raw.value.trim();
			const options = [...new Set((raw.options ?? []).map((o) => o.trim()))]
				.filter((o) => o.length > 0 && o !== value)
				.slice(0, DESKTOP_ASSISTANT_PART_MAX_OPTIONS);
			paramCount += 1;
			parts.push({ kind: 'param', id: `p${paramCount}`, value, options });
			continue;
		}
		// Anything else degrades to text (a param without a value, params past the
		// cap) so the sentence still reads fully.
		const text = raw.kind === 'text' ? raw.text : (raw.value ?? raw.text);
		if (!text) continue;
		const previous = parts.at(-1);
		if (previous?.kind === 'text') previous.text += text;
		else parts.push({ kind: 'text', text });
	}
	return repairBoundarySpacing(parts);
}

/** Text already opening a gap before a param: trailing whitespace or an opening
 *  delimiter the param should hug ("save it in (").  */
const NO_SPACE_AFTER_TEXT = /[\s([{'"“‘]$/;

/** Text that must hug the preceding param: leading whitespace, punctuation or a
 *  closing delimiter ("…orange_joke.txt" + "."). */
const NO_SPACE_BEFORE_TEXT = /^[\s.,!?;:)\]}'"”’…]/;

/** The prompts ask the model to carry all inter-word spacing in the text parts,
 *  but a generation that trims them would otherwise render chips glued to the
 *  prose — so insert the missing space at every text↔param boundary. Mutates
 *  and returns `parts` (always the freshly-built array from normalization). */
function repairBoundarySpacing(
	parts: DesktopAssistantDescriptionPart[],
): DesktopAssistantDescriptionPart[] {
	const repaired: DesktopAssistantDescriptionPart[] = [];
	for (const part of parts) {
		const previous = repaired.at(-1);
		if (previous?.kind === 'text' && part.kind === 'param') {
			if (!NO_SPACE_AFTER_TEXT.test(previous.text)) previous.text += ' ';
		} else if (previous?.kind === 'param' && part.kind === 'text') {
			if (!NO_SPACE_BEFORE_TEXT.test(part.text)) part.text = ` ${part.text}`;
		} else if (previous?.kind === 'param' && part.kind === 'param') {
			repaired.push({ kind: 'text', text: ' ' });
		}
		repaired.push(part);
	}
	return repaired;
}

/** Render the description parts back into the plain sentence, used to ground
 *  the apply-edits instruction. */
export function renderDescriptionSentence(parts: DesktopAssistantDescriptionPart[]): string {
	return parts.map((part) => (part.kind === 'text' ? part.text : part.value)).join('');
}
