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

// This function is extracted to make it easier to unit test it.
// Mocking turned into a mess due to this command using typeorm and the db
// config directly and customizing and monkey patching parts.
export async function main(
	connectionOptions: ConnectionOptions,
	logger: Logger,
	DataSource: typeof Connection,
) {
	const dbType = config.getEnv('database.type');

	(connectionOptions.migrations as Migration[]).forEach(wrapMigration);

	const connection = new DataSource(connectionOptions);
	await connection.initialize();
	if (dbType === 'postgresdb') await setSchema(connection);

	const lastMigration = connection.migrations.at(-1);

	if (lastMigration === undefined) {
		logger.error('There is no migration to reverse.');
		return;
	}

	if (!lastMigration.down) {
		logger.error('The last migration was irreversible and cannot be reverted.');
		return;
	}

	await connection.undoLastMigration();
	await connection.destroy();
}

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
		const connectionOptions: ConnectionOptions = {
			...getConnectionOptions(),
			subscribers: [],
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
			logging: ['query', 'error', 'schema'],
		};

		return await main(connectionOptions, this.logger, Connection);
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
