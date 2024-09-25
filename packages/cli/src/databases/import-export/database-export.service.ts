import { GlobalConfig } from '@n8n/config';
import type { ColumnMetadata } from '@n8n/typeorm/metadata/ColumnMetadata';
import archiver from 'archiver';
import { jsonParse } from 'n8n-workflow';
import { strict } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { Service } from 'typedi';

import { Logger } from '@/logger';

import { MANIFEST_FILENAME } from './constants';
import type { Manifest } from './manifest.schema';
import type { DatabaseExportConfig, Row } from './types';
import { FilesystemService } from '../../filesystem/filesystem.service';
import { DatabaseSchemaService } from '../database-schema.service';
import type { DatabaseType } from '../types';

// @TODO: Check minimum version for each DB type?
// @TODO: Optional table exclude list

@Service()
export class DatabaseExportService {
	private config: DatabaseExportConfig = {
		storageDirPath: '/tmp/backup',
		tarballBaseFileName: 'n8n-db-export',
		batchSize: 500,
	};

	/** Paths to the files to include in the tarball. */
	private readonly exportFilePaths: string[] = [];

	/** Number of rows in tables being exported. */
	private readonly rowCounts: { [tableName: string]: number } = {};

	private readonly dbType: DatabaseType;

	get tarballPath() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');

		const tarballFileName = `${this.config.tarballBaseFileName}-${year}-${month}-${day}.tar.gz`;

		return path.join(this.config.storageDirPath, tarballFileName);
	}

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly fsService: FilesystemService,
		private readonly schemaService: DatabaseSchemaService,
		private readonly logger: Logger,
	) {
		this.dbType = globalConfig.database.type;
	}

	setConfig(config: Partial<DatabaseExportConfig>) {
		this.config = { ...this.config, ...config };
	}

	// #region Export

	/** Export DB tables into a tarball of `.jsonl` files plus a `.json` metadata file. */
	async export() {
		await this.fsService.ensureDir(this.config.storageDirPath);

		this.logger.info('[ExportService] Starting export', {
			dbType: this.dbType,
			storageDirPath: this.config.storageDirPath,
		});

		await this.writeTarball();

		await this.postExportCleanup();

		this.logger.info('[ExportService] Completed export', { tarballPath: this.tarballPath });
	}

	// #endregion

	// #region Export steps

	private async writeTarball() {
		const tarballPath = path.join(this.config.storageDirPath, this.tarballPath);

		const archive = archiver('zip', { zlib: { level: 9 } });

		archive.pipe(fs.createWriteStream(tarballPath));

		const writeStream = new PassThrough();

		for (const { tableName, columns } of this.schemaService.getTables()) {
			archive.append(writeStream, { name: `${tableName}.jsonl` });

			let offset = 0;
			let totalRows = 0;

			while (true) {
				const rows = await this.schemaService
					.getDataSource()
					.query<Row[]>(
						`SELECT * FROM ${tableName} LIMIT ${this.config.batchSize} OFFSET ${offset};`,
					); // @TODO: Double-quotes for column in Postgres but not for other DB types?

				if (rows.length === 0) break;

				for (const row of rows) {
					for (const column of columns) {
						this.normalizeRow(row, { column, tableName });
					}

					const json = JSON.stringify(row);
					writeStream.write(json);
					writeStream.write('\n');
				}

				totalRows += rows.length;
				offset += this.config.batchSize;

				this.logger.info(`[ExportService] Exported ${totalRows} rows from ${tableName}`);

				writeStream.end();
			}

			this.rowCounts[tableName] = totalRows;
		}

		const manifest: Manifest = {
			lastExecutedMigration: await this.schemaService.getLastMigration(),
			sourceDbType: this.dbType,
			exportedAt: new Date().toISOString(),
			rowCounts: this.rowCounts,
			sequences: await this.schemaService.getSequences(),
		};

		const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8');

		archive.append(manifestBuffer, { name: MANIFEST_FILENAME });

		await archive.finalize();
	}

	/** Make values in SQLite and MySQL rows compatible with Postgres. */
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

	/** Clear all `.jsonl` and `.json` files from the storage dir. */
	async postExportCleanup() {
		await this.fsService.removeFiles(this.exportFilePaths);

		this.exportFilePaths.length = 0;
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
