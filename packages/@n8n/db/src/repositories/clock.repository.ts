import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

/** Provides access to the database server's clock for time-sensitive scheduling. */
@Service()
export class ClockRepository {
	constructor(
		private readonly dataSource: DataSource,
		private readonly databaseConfig: DatabaseConfig,
	) {}

	async getDbTime(): Promise<Date> {
		if (this.databaseConfig.type === 'postgresdb') {
			const [{ now }] = await this.dataSource.query<[{ now: Date }]>(
				'SELECT CURRENT_TIMESTAMP(3) AS now',
			);
			return now;
		}

		// SQLite: use ISO-friendly format directly to avoid JS-side string manipulation
		const [{ now }] = await this.dataSource.query<[{ now: string }]>(
			"SELECT STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW') AS now",
		);
		const date = new Date(now);
		if (Number.isNaN(date.getTime())) {
			throw new UnexpectedError(`Invalid DB server time: ${now}`);
		}
		return date;
	}
}
