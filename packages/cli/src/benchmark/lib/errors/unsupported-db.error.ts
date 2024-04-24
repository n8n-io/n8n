import { ApplicationError } from 'n8n-workflow';

export class UnsupportedDatabaseError extends ApplicationError {
	constructor() {
		super(
			'Currently only sqlite is supported for benchmarking. Please ensure DB_TYPE is set to `sqlite`',
			{ level: 'warning' },
		);
	}
}
