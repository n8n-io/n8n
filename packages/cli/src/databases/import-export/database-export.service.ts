import { GlobalConfig } from '@n8n/config';
import type { ColumnMetadata } from '@n8n/typeorm/metadata/ColumnMetadata';
import { jsonParse } from 'n8n-workflow';
import { strict } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { Service } from 'typedi';

import { Logger } from '@/logger';

import { MANIFEST_FILENAME } from './constants';
import type { Manifest } from './manifest.schema';
import type { DatabaseExportConfig, Row } from './types';
import { FilesystemService } from '../../filesystem/filesystem.service';
import { DatabaseSchemaService } from '../database-schema.service';

// @TODO: Check minimum version for each DB type?

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

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly fsService: FilesystemService,
		private readonly schemaService: DatabaseSchemaService,
		private readonly logger: Logger,
	) {}

	setConfig(config: Partial<DatabaseExportConfig>) {
		this.config = { ...this.config, ...config };
	}

	// #region Export

	/** Export DB tables into a tarball of `.jsonl` files plus a `.json` metadata file. */
	async export() {
		await this.fsService.ensureDir(this.config.storageDirPath);

		this.logger.info('[ExportService] Starting export', {
			dbType: this.globalConfig.database.type,
			storageDirPath: this.config.storageDirPath,
		});

		await this.writeJsonlFiles();

		if (this.exportFilePaths.length === 0) {
			this.logger.info('[ExportService] Found no tables to export, aborted export');
			return;
		}

		this.logger.info('[ExportService] Exported tables', { exportedTables: this.exportFilePaths });

		await this.writeManifest();

		const tarballPath = path.join(this.config.storageDirPath, this.tarballFileName());

		await this.fsService.createTarball(tarballPath, this.exportFilePaths);

		await this.postExportCleanup();

		this.logger.info('[ExportService] Completed export', { tarballPath });
	}

	// #endregion

	// #region Export steps

	private async writeJsonlFiles() {
		for (const { tableName, columns } of this.schemaService.getTables()) {
			let offset = 0;
			let totalRows = 0;
			let writeStream: fs.WriteStream | undefined;

			while (true) {
				const rows = await this.schemaService
					.getDataSource()
					.query<Row[]>(
						`SELECT * FROM ${tableName} LIMIT ${this.config.batchSize} OFFSET ${offset};`,
					); // @TODO: Double-quotes for column in Postgres but not for other DB types?

				if (rows.length === 0) break;

				writeStream ??= fs.createWriteStream(
					path.join(this.config.storageDirPath, tableName) + '.jsonl',
				);

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
			}

			if (writeStream) {
				writeStream.end();
				const jsonlFilePath = path.join(this.config.storageDirPath, tableName + '.jsonl');
				this.exportFilePaths.push(jsonlFilePath);
				this.rowCounts[tableName] = totalRows;
			}
		}
	}

	/** Make values in SQLite and MySQL rows compatible with Postgres. */
	private normalizeRow(
		row: Row,
		{ column, tableName }: { column: ColumnMetadata; tableName: string },
	) {
		const dbType = this.globalConfig.database.type;

		if (dbType === 'postgresdb') return;

		if (dbType === 'sqlite' && column.type === Boolean) {
			const value = row[column.propertyName];

			strict(
				value === 1 || value === 0,
				'Expected boolean column in sqlite to contain number `1` or `0`',
			);

			row[column.propertyName] = value === 1;
		}

		if (dbType === 'sqlite' && (this.isJson(column) || this.isPossiblyJson(tableName, column))) {
			const value = row[column.propertyName];

			if (typeof value === 'string') {
				row[column.propertyName] = jsonParse(value, { fallbackValue: value });
			}
		}

		// @TODO: MySQL and MariaDB normalizations
	}

	/** Write a manifest file describing the export. */
	private async writeManifest() {
		const manifestFilePath = path.join(this.config.storageDirPath, MANIFEST_FILENAME);

		const manifest: Manifest = {
			lastExecutedMigration: await this.schemaService.getLastMigration(),
			sourceDbType: this.globalConfig.database.type,
			exportedAt: new Date().toISOString(),
			rowCounts: this.rowCounts,
			sequences: await this.schemaService.getSequences(),
		};

		await fs.promises.writeFile(manifestFilePath, JSON.stringify(manifest, null, 2), 'utf8');

		this.exportFilePaths.push(manifestFilePath);

		this.logger.info('[ExportService] Wrote manifest', { metadata: manifest });
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

	private tarballFileName() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');

		return `${this.config.tarballBaseFileName}-${year}-${month}-${day}.tar.gz`;
	}

	// #endregion
}
