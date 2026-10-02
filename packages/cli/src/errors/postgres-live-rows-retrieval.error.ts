import { UnexpectedError } from '@n8n/errors';

export class PostgresLiveRowsRetrievalError extends UnexpectedError {
	constructor(rows: unknown) {
		super('Failed to retrieve live execution rows in Postgres', { extra: { rows } });
	}
}
