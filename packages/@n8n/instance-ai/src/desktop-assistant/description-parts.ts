/**
 * Segmented-description helpers shared by the desktop-assistant surfaces:
 * the task detail view (cli) generates description parts from workflow JSON,
 * and the `propose-task-plan` tool emits the same shape for not-yet-built
 * tasks. Pure functions over the `DesktopAssistantDescriptionPart` API type.
 */
import type { DesktopAssistantDescriptionPart } from '@n8n/api-types';

/** Loosely-shaped part as the model returns it; normalization tightens it into
 *  the API shape. */
export interface RawDescriptionPart {
	kind: 'text' | 'param';
	text?: string;
	value?: string;
	options?: string[];
}

/** Caps mirroring the description instructions; enforced again here so a
 *  misbehaving generation can't bloat the stored cache. */
const MAX_DESCRIPTION_PARAMS = 4;
const MAX_PARAM_OPTIONS = 4;

/**
 * Tighten the model's parts into the API shape: drop empty/malformed parts,
 * merge adjacent text parts, de-duplicate options (and the current value out
 * of them), cap param/option counts, and assign stable per-description param
 * ids (`p1`, `p2`, …) used by the apply-edits request to reference a chip.
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
				.slice(0, MAX_PARAM_OPTIONS);
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
	return parts;
}

/** Render the description parts back into the plain sentence, used to ground
 *  the apply-edits instruction. */
export function renderDescriptionSentence(parts: DesktopAssistantDescriptionPart[]): string {
	return parts.map((part) => (part.kind === 'text' ? part.text : part.value)).join('');
}
