import { UserError } from '@n8n/errors';

/** What the write tried: change the content, or move the skill without its source. */
export type SkillSyncedAction = 'edit' | 'move';

/**
 * A write tried to change the content of a synced skill, or to move it on its own. The source
 * holds the content of a synced skill, and all skills of a source share its scope. Only Skill
 * Sync changes the content, when a user accepts an update. Stop syncing makes the skill a
 * normal skill again.
 */
export class SkillSyncedError extends UserError {
	constructor(
		readonly skillName: string,
		readonly sourceLabel: string,
		readonly action: SkillSyncedAction = 'edit',
	) {
		super(
			action === 'edit'
				? `"${skillName}" is synced from ${sourceLabel}, so it is read-only in n8n. Change it in ${sourceLabel}.`
				: `"${skillName}" is synced from ${sourceLabel}, so it moves only with its source. Stop syncing it to move it on its own.`,
		);
	}
}

/** The message AI tools return for a change to a synced skill. A retry fails again. */
export function skillSyncedToolMessage(
	skillName: string,
	sourceLabel: string,
	action: SkillSyncedAction = 'edit',
): string {
	if (action === 'move') {
		return (
			`The skill "${skillName}" is synced from ${sourceLabel}, so it moves only with its ` +
			'source and nothing was saved. Do not retry. Tell the user to stop syncing it first.'
		);
	}
	return (
		`The skill "${skillName}" is synced from ${sourceLabel}, so it is read-only and nothing ` +
		`was saved. Do not retry. Tell the user to change it in ${sourceLabel}.`
	);
}
