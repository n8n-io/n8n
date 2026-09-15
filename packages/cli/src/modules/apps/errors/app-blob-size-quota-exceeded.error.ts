import { toMb } from '@n8n/utils/number/bytes';
import { UserError } from 'n8n-workflow';

export class AppBlobSizeQuotaExceededError extends UserError {
	constructor(limit: number, current: number) {
		super(
			`App storage limit exceeded: this project's apps use ${toMb(current)}MB, limit is ${toMb(limit)}MB. Delete an old app or version to free up space.`,
			{ level: 'warning' },
		);
	}
}
