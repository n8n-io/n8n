import type { SkillSourceMovePreview } from '@n8n/api-types';
import { ResponseError } from '@n8n/errors';

/** All current blockers, so the dialog can show the skills that need attention. */
export class SkillSourceMoveError extends ResponseError {
	readonly meta: { preview: SkillSourceMovePreview };

	constructor(preview: SkillSourceMovePreview) {
		super(
			'The source cannot move to this scope. Resolve the reported conflicts and try again.',
			409,
			409,
		);
		this.meta = { preview };
	}
}
