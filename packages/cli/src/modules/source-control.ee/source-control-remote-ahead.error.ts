import { SOURCE_CONTROL_PUSH_REMOTE_AHEAD_REASON } from '@n8n/api-types';
import { ConflictError } from '@n8n/errors';

export class SourceControlRemoteAheadError extends ConflictError {
	constructor() {
		super(
			'The remote branch has commits that this instance does not have. Pull the changes first, then push again.',
			undefined,
			{ reason: SOURCE_CONTROL_PUSH_REMOTE_AHEAD_REASON },
		);
	}
}
