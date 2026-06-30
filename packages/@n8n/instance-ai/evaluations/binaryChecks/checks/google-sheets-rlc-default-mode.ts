import type { BinaryCheck } from '../types';
import { GOOGLE_SHEETS_TYPE } from '../utils';

// Placeholder marker produced by the SDK's `placeholder()` helper (see
// workflow-sdk string-utils). list mode clears these to ''; id mode keeps them.
const PLACEHOLDER_RE = /<__PLACEHOLDER_VALUE__[\s\S]*?__>/;

const RLC_FIELDS = ['documentId', 'sheetName'] as const;

interface ResourceLocator {
	mode?: string;
	value?: unknown;
}

function isResourceLocator(value: unknown): value is ResourceLocator {
	return typeof value === 'object' && value !== null && '__rl' in value;
}

/**
 * The "By ID" antipattern (INS-631): id mode pointing at something the user
 * never gave, so setup renders a raw ID text box instead of the From-list
 * picker. Empty/placeholder = degraded default; a value absent from the prompt
 * = fabricated/hallucinated ID. A genuinely user-supplied ID (present in the
 * prompt) is fine.
 */
function isBadIdMode(rl: ResourceLocator, prompt: string): boolean {
	if (rl.mode !== 'id') return false;
	const { value } = rl;
	if (value === undefined || value === null || value === '') return true;
	if (typeof value !== 'string') return false;
	if (PLACEHOLDER_RE.test(value)) return true;
	return !prompt.includes(value);
}

/**
 * Google Sheets resource locators should default to the node's 'list' (picker)
 * mode so users select from their own sheets at setup, instead of a raw 'By ID'
 * field. id mode is only acceptable when the user actually supplied that ID
 * (it appears in the prompt); empty, placeholder, and fabricated IDs all fail.
 * ponytail: prompt-substring check is a heuristic — false-negative only if the
 * model echoes a fabricated ID that happens to be in the prompt.
 */
export const googleSheetsRlcDefaultMode: BinaryCheck = {
	name: 'google_sheets_rlc_default_mode',
	description:
		"Google Sheets resource locators use the 'From list' picker, not 'By ID' with an empty or fabricated value",
	kind: 'deterministic',
	dimension: 'parameter_correctness',
	run(workflow, ctx) {
		const sheetNodes = (workflow.nodes ?? []).filter((n) => n.type === GOOGLE_SHEETS_TYPE);
		if (sheetNodes.length === 0) return { pass: true, applicable: false };

		const offenders: string[] = [];
		for (const node of sheetNodes) {
			const params = node.parameters ?? {};
			for (const field of RLC_FIELDS) {
				const rl = params[field];
				if (isResourceLocator(rl) && isBadIdMode(rl, ctx.prompt)) {
					offenders.push(`${node.name}.${field}`);
				}
			}
		}

		return {
			pass: offenders.length === 0,
			...(offenders.length > 0
				? {
						comment: `Google Sheets locator(s) use 'By ID' with a non-user-supplied value instead of the 'From list' picker: ${offenders.join(', ')}`,
					}
				: {}),
		};
	},
};
