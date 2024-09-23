import { GlobalConfig } from '@n8n/config';
import { DataSource, MigrationExecutor } from '@n8n/typeorm';
import archiver from 'archiver';
import { ApplicationError } from 'n8n-workflow';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Service } from 'typedi';
import { Extract } from 'unzip-stream';

import { jsonColumnType } from '@/databases/entities/abstract-entity';

/** These tables are not backed up to reduce the backup size */
const excludeList = [
	'execution_annotation_tags',
	'execution_annotations',
	'execution_data',
	'execution_entity',
	'execution_metadata',
	'annotation_tag_entity',
];

@Service()
export class BackupService {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly dataSource: DataSource,
	) {}

	async createBackup(archivePath: string) {
		if (existsSync(archivePath)) {
			throw new ApplicationError(
				'Backup file already exists. Please delete that file and try again.',
			);
		}

		await mkdir(dirname(archivePath), { recursive: true });
		const archive = archiver('zip', { zlib: { level: 9 } });
		archive.pipe(createWriteStream(archivePath));

		for (const { name: tableName, columns } of this.tables) {
			const totalRowsCount = await this.dataSource
				.query(`SELECT COUNT(*) AS count FROM ${tableName}`)
				.then((rows: Array<{ count: number }>) => rows[0].count);
			if (totalRowsCount === 0) continue;

			const fileName = `${tableName}.jsonl`;
			const stream = new PassThrough();
			archive.append(stream, { name: fileName });

			let cursor = 0;
			const batchSize = 10;
			while (cursor < totalRowsCount) {
				const rows = await this.dataSource.query(
					`SELECT * from ${tableName} LIMIT ${cursor}, ${batchSize}`,
				);

				for (const row of rows) {
					// Our sqlite setup has some quirks. The following code normalizes the exported data so that it can be imported into a new postgres or sqlite database.
					if (this.globalConfig.database.type === 'sqlite') {
						for (const { type: columnType, propertyName } of columns) {
							if (propertyName in row) {
								// Our sqlite setup used `simple-json` for JSON columns, which is stored as strings.
								// This is because when we wrote this code, sqlite did not support native JSON column types.
								if (columnType === jsonColumnType) {
									row[propertyName] = JSON.parse(row[propertyName]);
								}
								// Sqlite does not have a separate Boolean data type, and uses integers 0/1 to mark values as boolean
								else if (columnType === Boolean) {
									row[propertyName] = Boolean(row[propertyName]);
								}
							}
						}
					}

					stream.write(JSON.stringify(row));
					stream.write('\n');
				}

				cursor += batchSize;
			}

			stream.end();
		}

		// Add this hidden file to store the last migration.
		// This is used during import to ensure that the importing DB schema is up to date
		archive.append(Buffer.from(await this.getLastMigrationName(), 'utf8'), {
			name: '.lastMigration',
		});

		await archive.finalize();
	}

	async importBackup(archivePath: string) {
		if (!existsSync(archivePath)) {
			throw new ApplicationError('Backup archive not found. Please check the path.');
		}

		// TODO: instead of extracting to the filesystem, stream the files directly
		const backupPath = '/tmp/backup';
		await pipeline(createReadStream(archivePath), Extract({ path: backupPath }));

		const lastMigrationInBackup = await readFile(join(backupPath, '.lastMigration'), 'utf8');
		const getLastMigrationInDB = await this.getLastMigrationName();
		if (lastMigrationInBackup !== getLastMigrationInDB) {
			throw new ApplicationError('Last Migrations Differ, make sure to use the same n8n version');
		}

		// (2. if clean truncate)
		// (2. if no clean, check if tables are empty)
		// 3. disable foreign keys

		// 4. import each jsonl
		for (const { name, target } of this.tables) {
			const repo = this.dataSource.getRepository(target);
			await repo.delete({});

			const filePath = join(backupPath, `${name}.jsonl`);
			if (!existsSync(filePath)) continue;

			const fileStream = createReadStream(filePath);
			const lineStream = createInterface({ input: fileStream });
			for await (const line of lineStream) {
				// TODO: insert in batches to reduce DB load
				await repo.insert(JSON.parse(line));
			}

			fileStream.close();
		}

		// 5. enable foreign keys
	}

	async getLastMigrationName() {
		const migrationExecutor = new MigrationExecutor(this.dataSource);
		const executedMigrations = await migrationExecutor.getExecutedMigrations();
		return executedMigrations.at(0)!.name;
	}

	get tables() {
		return this.dataSource.entityMetadatas
			.filter((v) => !excludeList.includes(v.tableName))
			.map(({ tableName, columns, target }) => ({ name: tableName, columns, target }));
	}
}
