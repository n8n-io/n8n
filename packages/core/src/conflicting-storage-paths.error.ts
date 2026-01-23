import { UserError } from 'n8n-workflow';

export class ConflictingStoragePathsError extends UserError {
	constructor() {
		super(
			[
				'Both N8N_STORAGE_PATH and N8N_BINARY_DATA_STORAGE_PATH are set to different values.',
				'N8N_BINARY_DATA_STORAGE_PATH is deprecated. Please use only N8N_STORAGE_PATH.',
			].join(' '),
		);
	}
}
