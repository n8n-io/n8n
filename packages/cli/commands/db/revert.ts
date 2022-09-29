/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { Command, flags } from '@oclif/command';
import { Connection, ConnectionOptions, createConnection } from 'typeorm';
import { LoggerProxy } from 'n8n-workflow';

import { getLogger } from '../../src/Logger';

import { Db } from '../../src';

export class DbRevertMigrationCommand extends Command {
	static description = 'Revert last database migration';

	static examples = ['$ n8n db:revert'];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// eslint-disable-next-line @typescript-eslint/no-shadow, @typescript-eslint/no-unused-vars
		const { flags } = this.parse(DbRevertMigrationCommand);

		let connection: Connection | undefined;
		try {
			await Db.init();
			connection = Db.collections.Credentials.manager.connection;

			if (!connection) {
				throw new Error(`No database connection available.`);
			}

			const connectionOptions: ConnectionOptions = Object.assign(connection.options, {
				subscribers: [],
				synchronize: false,
				migrationsRun: false,
				dropSchema: false,
				logging: ['query', 'error', 'schema'],
			});

			// close connection in order to reconnect with updated options
			await connection.close();
			connection = await createConnection(connectionOptions);

			await connection.undoLastMigration();
			await connection.close();
		} catch (error) {
			if (connection) await connection.close();

			console.error('Error reverting last migration. See log messages for details.');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			logger.error(error.message);
			this.exit(1);
		}

		this.exit();
	}
}
