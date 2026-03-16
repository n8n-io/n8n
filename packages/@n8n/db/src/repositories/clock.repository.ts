import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

@Service()
export class ClockRepository {
	constructor(
		private readonly dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {}

	async getServerTime(): Promise<Date> {
		if (this.globalConfig.database.type === 'postgresdb') {
			const [{ now }] = (await this.dataSource.query('SELECT CURRENT_TIMESTAMP(3) AS now')) as [
				{ now: Date },
			];
			return new Date(now.getTime());
		}

		// SQLite: use ISO-friendly format directly to avoid JS-side string manipulation
		const [{ now }] = (await this.dataSource.query(
			"SELECT STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW') AS now",
		)) as [{ now: string }];
		const date = new Date(now);
		if (Number.isNaN(date.getTime())) {
			throw new UnexpectedError(`Invalid DB server time: ${now}`);
		}
		return date;
	}
}
