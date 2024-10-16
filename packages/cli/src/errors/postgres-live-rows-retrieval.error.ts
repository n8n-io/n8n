import { ApplicationError } from 'n8n-workflow';

export class PostgresLiveRowsRetrievalError extends ApplicationError {
	constructor(rows: unknown) {
		super('Failed to retrieve live execution rows in Postgres', { extra: { rows } });
	}
}
