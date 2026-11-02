import { UserError } from 'n8n-workflow';

export interface SkillInstructionEdit {
	oldText: string;
	newText: string;
}

/** Applies each edit in order. Each `oldText` must match exactly one place in the current text. */
export function applySkillInstructionEdits(
	instructions: string,
	edits: SkillInstructionEdit[],
): string {
	return edits.reduce((text, { oldText, newText }, index) => {
		const count = text.split(oldText).length - 1;
		if (count !== 1) {
			throw new UserError(
				`instructionEdits[${index}]: oldText matches ${count} places; it must match exactly one. ` +
					'No edits were saved.',
			);
		}
		// A replacer function keeps `$&`-style sequences in newText literal.
		return text.replace(oldText, () => newText);
	}, instructions);
}
