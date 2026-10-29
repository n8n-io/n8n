import { OperationalError } from '@n8n/errors';

/**
 * The source, or one skill in it, is not there any more: deleted, moved, or private for this
 * access. Reason `not_found`. A synced skill keeps its last version.
 */
export class SkillSourceNotFoundError extends OperationalError {
	constructor(
		message: string,
		options: {
			/**
			 * True when only one skill is gone, such as a folder without SKILL.md, and the source
			 * itself answered. A check skips that skill and reads the others.
			 */
			skill?: boolean;
		} = {},
	) {
		super(message);
		this.skill = options.skill === true;
	}

	readonly skill: boolean;
}
