import { SKILL_NAME_TAKEN_MESSAGE } from '@n8n/api-types';
import { ConflictError } from '@n8n/errors';

/**
 * A skill name is taken in its scope. It is a conflict like a stale save, but AI tools
 * must not report it as one: a retry with the same name fails again. So the error
 * carries the name, and each tool tells the model which name to change.
 */
export class SkillNameTakenError extends ConflictError {
	constructor(readonly skillName: string) {
		super(SKILL_NAME_TAKEN_MESSAGE);
	}
}

/** The message AI tools return for a taken name. Nothing is saved when it happens. */
export function skillNameTakenToolMessage(skillName: string): string {
	return (
		`The skill name "${skillName}" is taken by another skill in the same scope, so nothing ` +
		'was saved. Choose a different name and retry.'
	);
}
