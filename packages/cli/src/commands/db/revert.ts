/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { Command, flags } from '@oclif/command';
import { Connection, ConnectionOptions, createConnection } from 'typeorm';
import { LoggerProxy } from 'n8n-workflow';

import { getLogger } from '@/Logger';
import { getConnectionOptions } from '@/Db';
import config from '@/config';

export class DbRevertMigrationCommand extends Command {
	static description = 'Revert last database migration';

	static examples = ['$ n8n db:revert'];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		this.parse(DbRevertMigrationCommand);

		let connection: Connection | undefined;
		try {
			const dbType = config.getEnv('database.type');
			const connectionOptions: ConnectionOptions = {
				...(await getConnectionOptions(dbType)),
				subscribers: [],
				synchronize: false,
				migrationsRun: false,
				dropSchema: false,
				logging: ['query', 'error', 'schema'],
			};
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
