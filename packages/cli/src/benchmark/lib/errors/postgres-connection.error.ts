import { ApplicationError } from 'n8n-workflow';
import type { DataSourceOptions } from '@n8n/typeorm';

export class PostgresConnectionError extends ApplicationError {
	constructor(error: unknown, pgOptions: DataSourceOptions) {
		super('Failed to connect to Postgres - check your Postgres configuration', {
			level: 'warning',
			cause: error,
			extra: { postgresConfig: { pgOptions } },
		});
	}
}
