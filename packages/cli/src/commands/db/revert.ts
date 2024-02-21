import { Command, Flags } from '@oclif/core';
import type { DataSourceOptions as ConnectionOptions } from '@n8n/typeorm';
import { DataSource as Connection } from '@n8n/typeorm';
import { Container } from 'typedi';
import { Logger } from '@/Logger';
import { setSchema } from '@/Db';
import { getConnectionOptions } from '@db/config';
import type { Migration } from '@db/types';
import { wrapMigration } from '@db/utils/migrationHelpers';
import config from '@/config';

export class DbRevertMigrationCommand extends Command {
	static description = 'Revert last database migration';

	static examples = ['$ n8n db:revert'];

	static flags = {
		help: Flags.help({ char: 'h' }),
	};

	protected logger = Container.get(Logger);

	private connection: Connection;

	async init() {
		await this.parse(DbRevertMigrationCommand);
	}

	async run() {
		const dbType = config.getEnv('database.type');
		const connectionOptions: ConnectionOptions = {
			...getConnectionOptions(),
			subscribers: [],
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
			logging: ['query', 'error', 'schema'],
		};

		(connectionOptions.migrations as Migration[]).forEach(wrapMigration);

		this.connection = new Connection(connectionOptions);
		await this.connection.initialize();
		if (dbType === 'postgresdb') await setSchema(this.connection);
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
