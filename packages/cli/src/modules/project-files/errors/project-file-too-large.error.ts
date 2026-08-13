import { UserError } from 'n8n-workflow';

import { formatBytes } from '../utils/size-utils';

export class ProjectFileTooLargeError extends UserError {
	constructor(sizeBytes: number, maxBytes: number) {
		super(
			`File size ${formatBytes(sizeBytes)} exceeds the maximum of ${formatBytes(maxBytes)} per file`,
			{ level: 'warning' },
		);
	}
}
