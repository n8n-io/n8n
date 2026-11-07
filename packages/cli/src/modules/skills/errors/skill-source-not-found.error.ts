import { OperationalError, type OperationalErrorOptions } from '@n8n/errors';

/**
 * The source, or one skill in it, is not there any more: deleted, moved, or private for this
 * access. Reason `not_found`. A synced skill keeps its last version.
 */
export class SkillSourceNotFoundError extends OperationalError {
	/**
	 * True when only one skill is gone, such as a folder without SKILL.md, and the source itself
	 * answered. A check skips that skill and reads the others.
	 */
	readonly skill: boolean;

	constructor(message: string, options: OperationalErrorOptions & { skill?: boolean } = {}) {
		const { skill, ...base } = options;
		super(message, base);
		this.skill = skill === true;
	}
}
