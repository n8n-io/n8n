import { ConflictError } from '@n8n/errors';

import { SkillNameTakenError, skillNameTakenToolMessage } from './skill-name-taken.error';

/** A refused write that an AI tool reports, so the model can fix the call and retry. */
export type SkillToolRefusal =
	| { code: 'skill_name_taken'; message: string }
	| { code: 'stale_skill'; skillHash: string };

/**
 * How an AI tool reports an error from a skill write. A taken name always is a refusal. A
 * conflict on an update is a stale save only when the skill now has another hash than the
 * base of the update: other conflicts, such as a move that takes the skill from an agent,
 * keep their own message. Answers undefined for an error that the tool throws.
 * `currentHash` runs only for a conflict on an update.
 */
export async function toSkillToolRefusal(
	error: unknown,
	update?: { baseSkillHash: string; currentHash: () => Promise<string> },
): Promise<SkillToolRefusal | undefined> {
	if (error instanceof SkillNameTakenError) {
		return { code: 'skill_name_taken', message: skillNameTakenToolMessage(error.skillName) };
	}
	if (!update || !(error instanceof ConflictError)) return undefined;
	const skillHash = await update.currentHash();
	if (skillHash === update.baseSkillHash) return undefined;
	return { code: 'stale_skill', skillHash };
}
