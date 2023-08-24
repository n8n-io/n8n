import { Command, flags } from '@oclif/command';
import type { DataSourceOptions as ConnectionOptions } from '@n8n/typeorm';
import { DataSource as Connection } from '@n8n/typeorm';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { getConnectionOptions } from '@/Db';
import type { Migration } from '@db/types';
import { wrapMigration } from '@db/utils/migrationHelpers';
import config from '@/config';

export class DbRevertMigrationCommand extends Command {
	static description = 'Revert last database migration';

	static examples = ['$ n8n db:revert'];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	protected logger = LoggerProxy.init(getLogger());

	private connection: Connection;

	async init() {
		this.parse(DbRevertMigrationCommand);
	}

	async run() {
		const dbType = config.getEnv('database.type');
		const connectionOptions: ConnectionOptions = {
			...getConnectionOptions(dbType),
			subscribers: [],
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
			logging: ['query', 'error', 'schema'],
		};

		(connectionOptions.migrations as Migration[]).forEach(wrapMigration);

		this.connection = new Connection(connectionOptions);
		await this.connection.initialize();
		await this.connection.undoLastMigration();
		await this.connection.destroy();
	}

	async catch(error: Error) {
		this.logger.error('Error reverting last migration. See log messages for details.');
		this.logger.error(error.message);
	}

	protected async finally(error: Error | undefined) {
		if (this.connection?.isInitialized) await this.connection.destroy();

		this.exit(error ? 1 : 0);
	}
}
