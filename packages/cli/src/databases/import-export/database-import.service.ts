import { GlobalConfig } from '@n8n/config';
import { ensureError, jsonParse } from 'n8n-workflow';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import type { DirectoryResult } from 'tmp-promise';
import { dir } from 'tmp-promise';
import { Service } from 'typedi';

import { MalformedManifestError } from '@/errors/malformed-manifest.error';
import { MigrationsMismatchError } from '@/errors/migrations-mismatch.error';
import { NotObjectLiteralError } from '@/errors/not-object-literal.error';
import { RowCountMismatchError } from '@/errors/row-count-mismatch.error';
import { UnsupportedDestinationError } from '@/errors/unsupported-destination.error';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { Logger } from '@/logging/logger.service';
import { isObjectLiteral } from '@/utils';

import { MANIFEST_FILENAME } from './constants';
import { manifestSchema } from './manifest.schema';
import type { DatabaseImportConfig, Manifest } from './types';
import { DatabaseSchemaService } from '../database-schema.service';
import type { DatabaseType } from '../types';

// @TODO: Check minimum version for Postgres?
// @TODO: Make all info logs debug

@Service()
export class DatabaseImportService {
	private config: DatabaseImportConfig = {} as DatabaseImportConfig;

	private manifest: Manifest;

	private readonly dbType: DatabaseType;

	private tmpDir: DirectoryResult;

	constructor(
		globalConfig: GlobalConfig,
		private readonly fsService: FilesystemService,
		private readonly schemaService: DatabaseSchemaService,
		private readonly logger: Logger,
	) {
		this.dbType = globalConfig.database.type;

		if (this.dbType !== 'postgresdb') throw new UnsupportedDestinationError(this.dbType);
	}

	setConfig(config: Partial<DatabaseImportConfig>) {
		this.config = { ...this.config, ...config };
	}

	// #region Import

	/** Import DB tables from a tarball of `.jsonl` files in the storage dir. */
	async import() {
		this.logger.info('[ImportService] Starting import');
		const { input } = this.config;
		await this.fsService.checkAccessible(input);

		this.tmpDir = await dir();
		this.logger.debug(`Extracting temporary files in ${this.tmpDir.path}`);

		try {
			await this.fsService.extractTarball(this.config.input, this.tmpDir.path);

			this.manifest = await this.getManifest();

			const destinationLastMigration = await this.schemaService.getLastMigration();

			if (this.manifest.lastExecutedMigration !== destinationLastMigration) {
				throw new MigrationsMismatchError(
					this.manifest.lastExecutedMigration,
					destinationLastMigration,
				);
			}

			if (this.config.deleteExistingData) {
				for (const { entityTarget } of this.schemaService.getTables()) {
					await this.schemaService.getDataSource().getRepository(entityTarget).delete({});
				}
			} else {
				await this.schemaService.checkAllTablesEmpty();
			}
			await this.schemaService.disableForeignKeysPostgres();
			await this.adjustSequences();
			await this.importFiles();
			await this.checkImportsAgainstManifest();
		} finally {
			await this.schemaService.enableForeignKeysPostgres();
			await fs.promises.rm(this.tmpDir.path, { recursive: true, force: true });
		}

		this.logger.info('[ImportService] Completed import');
	}

	// #endregion

	// #region Import steps

	private async getManifest() {
		const manifestFilePath = path.join(this.tmpDir.path, MANIFEST_FILENAME);

		const manifestJson = await fs.promises.readFile(manifestFilePath, 'utf8');

		try {
			return manifestSchema.parse(jsonParse(manifestJson));
		} catch (error) {
			throw new MalformedManifestError(manifestFilePath, ensureError(error));
		}
	}

	/** Insert rows from `.jsonl` files into DB tables in a transaction. */
	private async importFiles() {
		await this.schemaService.getDataSource().transaction(async (tx) => {
			for (const { tableName, entityTarget } of this.schemaService.getTables()) {
				const jsonlFilePath = path.join(this.tmpDir.path, tableName) + '.jsonl';

				try {
					await fs.promises.access(jsonlFilePath);
				} catch (e) {
					const error = ensureError(e);
					if ('code' in error && error.code === 'ENOENT') continue; // we only exported populated tables
					throw error;
				}

				const lineStream = readline.createInterface({
					input: fs.createReadStream(jsonlFilePath),
					crlfDelay: Infinity, // treat CR and LF as single char
				});

				// @TODO: Insert in batches

				const txRepository = tx.getRepository(entityTarget);

				for await (const line of lineStream) {
					const parsedLine = jsonParse(line);

					if (!isObjectLiteral(parsedLine)) throw new NotObjectLiteralError(parsedLine);

					const entity = txRepository.create(parsedLine);

					await txRepository.insert(entity);
				}
			}
		});
	}

	/**
	 * Adjust incremental ID sequences in Postgres to match the source database.
	 */
	private async adjustSequences() {
		for (const [rawSeqName, rawSeqValue] of Object.entries(this.manifest.sequences)) {
			// `execution_metadata` has abnormally named and numbered sequence
			const sequenceName =
				rawSeqName === 'execution_metadata' ? `${rawSeqName}_temp_id_seq` : `${rawSeqName}_id_seq`;
			const sequenceValue = rawSeqValue <= 0 ? 1 : rawSeqValue;

			await this.schemaService
				.getDataSource()
				.query(`ALTER SEQUENCE "${sequenceName}" RESTART WITH ${sequenceValue};`);
		}
	}

	private async checkImportsAgainstManifest() {
		for (const { tableName, entityTarget } of this.schemaService.getTables()) {
			const actualRows = await this.schemaService
				.getDataSource()
				.getRepository(entityTarget)
				.count();

			const expectedRows = this.manifest.rowCounts[tableName];

			if (actualRows === 0 && expectedRows === undefined) continue; // manifest only contains populated tables

			if (expectedRows !== actualRows) {
				throw new RowCountMismatchError(tableName, expectedRows, actualRows);
			}
		}

		this.logger.info('[ImportService] Imports match manifest');
	}

	// #endregion
}
