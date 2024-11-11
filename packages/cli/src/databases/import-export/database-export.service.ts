import { GlobalConfig } from '@n8n/config';
import type { ColumnMetadata } from '@n8n/typeorm/metadata/ColumnMetadata';
import { jsonParse } from 'n8n-workflow';
import fs from 'node:fs';
import path from 'node:path';
import { createGzip } from 'node:zlib';
import tar from 'tar-stream';
import { Service } from 'typedi';

import { Logger } from '@/logging/logger.service';

import { BATCH_SIZE, EXCLUDE_LIST, MANIFEST_FILENAME, ZIP_BASE_FILE_NAME } from './constants';
import type { DatabaseExportConfig, Manifest, Row } from './types';
import { DatabaseSchemaService } from '../database-schema.service';
import type { DatabaseType } from '../types';

// @TODO: Check minimum version for each DB type?

@Service()
export class DatabaseExportService {
	private config: DatabaseExportConfig = {
		outDir: '/tmp/backup', // @TODO: Update to cwd
		mode: 'full',
	};

	private readonly rowCounts: Manifest['rowCounts'] = {};

	private readonly dbType: DatabaseType;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly schemaService: DatabaseSchemaService,
		private readonly logger: Logger,
	) {
		this.dbType = globalConfig.database.type;
	}

	setConfig(config: Partial<DatabaseExportConfig>) {
		this.config = { ...this.config, ...config };
	}

	get tarballPath() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');

		const tarballFileName = `${ZIP_BASE_FILE_NAME}-${year}-${month}-${day}.tar.gz`;

		return path.join(this.config.outDir, tarballFileName);
	}

	// #region Export

	async export() {
		this.logger.info('[ExportService] Starting export', { outDir: this.config.outDir });

		try {
			await fs.promises.access(this.config.outDir);
		} catch {
			await fs.promises.mkdir(this.config.outDir, { recursive: true });
		}

		await this.writeTarball();

		this.logger.info('[ExportService] Completed export', { zipPath: this.tarballPath });
	}

	// #endregion

	// #region Export steps

	private async writeTarball() {
		const pack = tar.pack();

		pack.pipe(createGzip()).pipe(fs.createWriteStream(this.tarballPath));

		// DB row -> entryStream -> tarStream -> gzipStream -> writeStream

		const tables =
			this.config.mode === 'full'
				? this.schemaService.getTables()
				: this.schemaService.getTables().filter((t) => !EXCLUDE_LIST.includes(t.tableName));

		for (const { tableName, columns } of tables) {
			const totalRowsCount = await this.schemaService
				.getDataSource()
				.query(`SELECT COUNT(*) AS count FROM ${tableName}`)
				.then((rows: Array<{ count: number }>) => rows[0].count);

			if (totalRowsCount === 0) continue;

			const tableFilePath = path.join(this.config.outDir, `${tableName}.jsonl`);
			const writeStream = fs.createWriteStream(tableFilePath);

			let offset = 0;
			let totalRows = 0;

			while (true) {
				const batch = await this.schemaService
					.getDataSource()
					.query<Row[]>(`SELECT * FROM ${tableName} LIMIT ${BATCH_SIZE} OFFSET ${offset};`);
				// @TODO: Double quotes for Postgres but not others

				if (batch.length === 0) break;

				for (const row of batch) {
					for (const column of columns) {
						this.normalizeRow(row, { column, tableName });
					}
					const json = JSON.stringify(row);
					writeStream.write(json);
					writeStream.write('\n');
				}

				totalRows += batch.length;
				offset += BATCH_SIZE;
			}

			if (totalRows === 0) continue;

			this.rowCounts[tableName] = totalRows;
			this.logger.debug(`[ExportService] Exported ${totalRows} rows from ${tableName}`);

			writeStream.end();
			pack.entry({ name: `${tableName}.jsonl` }, await fs.promises.readFile(tableFilePath));
			await fs.promises.rm(tableFilePath);
		}

		const manifest: Manifest = {
			lastExecutedMigration: await this.schemaService.getLastMigration(),
			sourceDbType: this.dbType,
			exportedAt: new Date().toISOString(),
			rowCounts: this.rowCounts,
			sequences: await this.schemaService.getSequences(),
		};

		const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8');

		pack.entry({ name: MANIFEST_FILENAME }, manifestBuffer);

		pack.finalize();
	}

	private normalizeRow(
		row: Row,
		{ column, tableName }: { column: ColumnMetadata; tableName: string },
	) {
		if (this.dbType === 'postgresdb') return;

		if (this.dbType === 'sqlite' && column.type === Boolean) {
			row[column.propertyName] = Boolean(row[column.propertyName]);
		}

		if (
			this.dbType === 'sqlite' &&
			(this.isJson(column) || this.isPossiblyJson(tableName, column))
		) {
			const value = row[column.propertyName];

			if (typeof value === 'string') {
				row[column.propertyName] = jsonParse(value, { fallbackValue: value });
			}
		}

		// @TODO: MySQL and MariaDB normalizations
	}

	// #endregion

	// #region Utils

	private isJson(column: ColumnMetadata) {
		return this.globalConfig.database.type === 'sqlite'
			? column.type === 'simple-json'
			: column.type === 'json';
	}

	/** Check whether the column is not JSON-type but may contain JSON. */
	private isPossiblyJson(tableName: string, column: ColumnMetadata) {
		return tableName === 'settings' && column.propertyName === 'value';
	}

	// #endregion
}
