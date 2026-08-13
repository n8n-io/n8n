import { UserError } from 'n8n-workflow';

import type { ProjectFileQuotaScope } from '../project-files.types';
import { formatBytes } from '../utils/size-utils';

export class ProjectFileQuotaExceededError extends UserError {
	constructor(scope: ProjectFileQuotaScope, usedBytes: number, quotaBytes: number) {
		// Personal projects share one instance-wide budget, so a user can be blocked
		// by other people's uploads. Say so rather than implying a personal limit.
		const subject =
			scope === 'personal'
				? 'Storage limit for all personal projects on this instance reached'
				: 'Storage limit for this project reached';

		super(`${subject}. Using ${formatBytes(usedBytes)} of ${formatBytes(quotaBytes)}.`, {
			level: 'warning',
		});
	}
}
