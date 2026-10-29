import { UserError } from '@n8n/errors';

/**
 * A write tried to change the content of a synced skill. The source holds the content of
 * a synced skill. Only Skill Sync changes it, when a user accepts an update.
 */
export class SkillSyncedError extends UserError {
	constructor(
		readonly skillName: string,
		readonly sourceLabel: string,
	) {
		super(
			`"${skillName}" is synced from ${sourceLabel}, so it is read-only in n8n. Change it in ${sourceLabel}.`,
		);
	}
}

/** The message AI tools return for a change to a synced skill. A retry fails again. */
export function skillSyncedToolMessage(skillName: string, sourceLabel: string): string {
	return (
		`The skill "${skillName}" is synced from ${sourceLabel}, so it is read-only and nothing ` +
		`was saved. Do not retry. Tell the user to change it in ${sourceLabel}.`
	);
}
