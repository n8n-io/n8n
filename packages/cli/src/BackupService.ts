import Container, { Service } from 'typedi';
import { Logger } from '@/Logger';
import { OrchestrationService } from '@/services/orchestration.service';
import { Time } from './constants';
import { InstanceSettings } from 'n8n-core';
import { join } from 'path';
import { promises } from 'fs';
import { transaction } from './Db';
import config from './config';
import { table } from '@oclif/core/lib/cli-ux/styled/table';

@Service()
export class BackupService {
	mainTimer: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		readonly orchestrationService: OrchestrationService,
	) {
		if (config.getEnv('database.type') !== 'sqlite') {
			return;
		}

		const { isSingleMainSetup, isLeader, multiMainSetup } = orchestrationService;

		if (isSingleMainSetup) {
			this.startBackups();
			return;
		}

		if (isLeader) this.startBackups();

		multiMainSetup
			.on('leader-takeover', () => this.startBackups())
			.on('leader-stepdown', () => this.stopBackups());
	}

	startBackups() {
		this.logger.debug('Wait tracker started tracking waiting executions');

		// Poll every 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			void this.createBackup();
		}, 6 * Time.hours.toMilliseconds);
		void this.createBackup();
	}

	async createBackup() {
		this.logger.debug('Backup routine started');

		const fileName = join(
			Container.get(InstanceSettings).n8nFolder,
			`bkp-${new Date().toISOString()}.dump`,
		);

		const fileHandle = await promises.open(fileName, 'w');

		await transaction(async (transactionManager) => {
			const schema: Array<{ sql: string }> = await transactionManager.query(
				'SELECT sql FROM sqlite_schema where sql is not null and name != "sqlite_sequence"',
			);
			await fileHandle.write(Buffer.from(schema.map((row) => `${row.sql?.trim()};`).join('\n')));
			const allTables: Array<{ name: string }> = await transactionManager.query(
				'SELECT name FROM sqlite_master WHERE type="table";',
			);
			const tables = new Set(allTables.map((row) => row.name));
			tables.delete('execution_entity');
			tables.delete('execution_data');
			tables.delete('execution_metadata');
			tables.delete('sqlite_sequence');

			const iterableTables = Array.from(tables);

			for (let i = 0; i < iterableTables.length; i++) {
				const tableName = iterableTables[i];
				console.log('dumping table', tableName);
				const allData = await transactionManager.query(`SELECT * FROM ${tableName}`);

				const allWrites = allData.map(async (row) => {
					let [sql, params] = transactionManager
						.createQueryBuilder()
						.insert()
						.into(tableName)
						.values(row)
						.getQueryAndParameters();

					params.forEach((value) => {
						if (typeof value === 'string') {
							sql = sql.replace('?', `"${value.replaceAll('"', '\\"')}"`);
						}
						if (typeof value === 'object') {
							if (Array.isArray(value)) {
								sql = sql.replace(
									'?',
									value
										.map((element) => (typeof element === 'string' ? `"${element}"` : element))
										.join(','),
								);
							} else {
								sql = sql.replace('?', value);
							}
						}
						if (['number', 'boolean'].includes(typeof value)) {
							sql = sql.replace('?', value.toString());
						}
					});
					sql += ';\n';

					await fileHandle.write(Buffer.from(sql));
				});
				await Promise.all(allWrites);

				// if (allData.length > 0) {
				// 	const columns = Object.keys(allData[0]);
				// 	const columnList = columns
				// 		.map((columnName) => transactionManager.connection.driver.escape(columnName))
				// 		.join(',');

				// 	const writes = allData.map(async (singleRow) => {
				// 		try {
				// 			const values = columns
				// 				.map((columnName) => singleRow[columnName] ?? '')
				// 				.map((value) => (typeof value === 'string' ? value.replace('"', '\\"') : value))
				// 				.map((value) => (typeof value === 'string' ? `'${value}'` : value))
				// 				.join(',');

				// 			const statement = `INSERT INTO ${tableName} (${columnList}) values (${values});\n`;
				// 			// console.log(statement);
				// 			await fileHandle.write(Buffer.from(statement));
				// 		} catch (error) {
				// 			console.log(tableName, singleRow);
				// 			console.log(error);
				// 		}
				// 	});
				// 	await Promise.all(writes);
				// }
			}

			await fileHandle.close();
		});
	}

	stopBackups() {
		this.logger.debug('Backup routine stopped');

		clearInterval(this.mainTimer);
	}
}
