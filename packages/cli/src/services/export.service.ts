import { Logger, safeJoinPath } from '@n8n/backend-common';
import { mkdir, rm, readdir, appendFile } from 'fs/promises';

import { Service } from '@n8n/di';

// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { DataSource } from '@n8n/typeorm';
import { validateDbTypeForExportEntities } from '@/utils/validate-database-type';
import { Cipher } from 'n8n-core';
import { compressFolder } from '@/utils/compression.util';

@Service()
export class ExportService {
	constructor(
		private readonly logger: Logger,
		private readonly dataSource: DataSource,
		private readonly cipher: Cipher,
	) {}

	private async clearExistingEntityFiles(outputDir: string, entityName: string): Promise<void> {
		const existingFiles = await readdir(outputDir);
		const entityFiles = existingFiles.filter(
			(file) => file.startsWith(`${entityName}.`) && file.endsWith('.jsonl'),
		);

		if (entityFiles.length > 0) {
			this.logger.info(
				`   🗑️  Found ${entityFiles.length} existing file(s) for ${entityName}, deleting...`,
			);
			for (const file of entityFiles) {
				await rm(safeJoinPath(outputDir, file));
				this.logger.info(`      Deleted: ${file}`);
			}
		}
	}

	private async exportMigrationsTable(outputDir: string): Promise<number> {
		this.logger.info('\n🔧 Exporting migrations table:');
		this.logger.info('==============================');

		// Get the table prefix from DataSource options
		const tablePrefix = this.dataSource.options.entityPrefix || '';
		const migrationsTableName = `${tablePrefix}migrations`;

		let systemTablesExported = 0;

		// Check if migrations table exists and export it
		try {
			// Test if the migrations table exists by querying it
			await this.dataSource.query(
				`SELECT id FROM ${this.dataSource.driver.escape(migrationsTableName)} LIMIT 1`,
			);

			this.logger.info(`\n📊 Processing system table: ${migrationsTableName}`);

			// Clear existing files for migrations
			await this.clearExistingEntityFiles(outputDir, 'migrations');

			// Export all migrations data to a single file (no pagination needed for small table)
			const formattedTableName = this.dataSource.driver.escape(migrationsTableName);
			const allMigrations = await this.dataSource.query(`SELECT * FROM ${formattedTableName}`);

			const fileName = 'migrations.jsonl';
			const filePath = safeJoinPath(outputDir, fileName);

			const migrationsJsonl: string = allMigrations
				.map((migration: unknown) => JSON.stringify(migration))
				.join('\n');
			await appendFile(filePath, this.cipher.encrypt(migrationsJsonl ?? '' + '\n'), 'utf8');

			this.logger.info(
				`   ✅ Completed export for ${migrationsTableName}: ${allMigrations.length} entities in 1 file`,
			);

			systemTablesExported = 1; // Successfully exported migrations table
		} catch (error) {
			this.logger.info(
				`   ⚠️  Migrations table ${migrationsTableName} not found or not accessible, skipping...`,
				{ error },
			);
		}

		return systemTablesExported;
	}

	async exportEntities(outputDir: string, excludedTables: Set<string> = new Set()) {
		this.logger.info('\n⚠️⚠️ This feature is currently under development. ⚠️⚠️');

		validateDbTypeForExportEntities(this.dataSource.options.type);

		this.logger.info('\n🚀 Starting entity export...');
		this.logger.info(`📁 Output directory: ${outputDir}`);

		await rm(outputDir, { recursive: true }).catch(() => {});
		// Ensure output directory exists
		await mkdir(outputDir, { recursive: true });

		// Get DataSource from Container and fetch all repositories
		const entityMetadatas = this.dataSource.entityMetadatas;

		this.logger.info('\n📋 Exporting entities from all tables:');
		this.logger.info('====================================');

		let totalTablesProcessed = 0;
		let totalEntitiesExported = 0;
		const pageSize = 500;
		const entitiesPerFile = 500;

		await this.exportMigrationsTable(outputDir);

		for (const metadata of entityMetadatas) {
			// Get table name and entity name
			const tableName = metadata.tableName;

			if (excludedTables.has(tableName)) {
				this.logger.info(
					`   💭 Skipping table: ${tableName} (${metadata.name}) as it exists as an exclusion`,
				);
				continue;
			}

			const entityName = metadata.name.toLowerCase();

			this.logger.info(`\n📊 Processing table: ${tableName} (${entityName})`);

			// Clear existing files for this entity
			await this.clearExistingEntityFiles(outputDir, entityName);

			// Get column information for this table
			const columnNames = metadata.columns.map((col) => col.databaseName);
			const columns = columnNames.map(this.dataSource.driver.escape).join(', ');
			this.logger.info(`   💭 Columns: ${columnNames.join(', ')}`);

			let offset = 0;
			let totalEntityCount = 0;
			let hasNextPage = true;
			let fileIndex = 1;
			let currentFileEntityCount = 0;

			do {
				/*
				 * use raw SQL query to avoid typeorm limitations,
				 * typeorm repositories do not return joining table entries
				 */
				const formattedTableName = this.dataSource.driver.escape(tableName);
				const pageEntities = await this.dataSource.query(
					`SELECT ${columns} FROM ${formattedTableName} LIMIT ${pageSize} OFFSET ${offset}`,
				);

				// If no entities returned, we've reached the end
				if (pageEntities.length === 0) {
					this.logger.info(`      No more entities available at offset ${offset}`);
					hasNextPage = false;
					break;
				}

				// Determine which file to write to based on current entity count
				const targetFileIndex = Math.floor(totalEntityCount / entitiesPerFile) + 1;
				const fileName =
					targetFileIndex === 1 ? `${entityName}.jsonl` : `${entityName}.${targetFileIndex}.jsonl`;
				const filePath = safeJoinPath(outputDir, fileName);

				// If we've moved to a new file, log the completion of the previous file
				if (targetFileIndex > fileIndex) {
					this.logger.info(`   ✅ Completed file ${fileIndex}: ${currentFileEntityCount} entities`);
					fileIndex = targetFileIndex;
					currentFileEntityCount = 0;
				}

				// Append all entities in this page as JSONL (one JSON object per line)
				const entitiesJsonl: string = pageEntities
					.map((entity: unknown) => JSON.stringify(entity))
					.join('\n');
				await appendFile(filePath, this.cipher.encrypt(entitiesJsonl) + '\n', 'utf8');

				totalEntityCount += pageEntities.length;
				currentFileEntityCount += pageEntities.length;
				offset += pageEntities.length;

				this.logger.info(
					`      Fetched page containing ${pageEntities.length} entities (page size: ${pageSize}, offset: ${offset - pageEntities.length}, total processed: ${totalEntityCount})`,
				);

				// If we got fewer entities than requested, we've reached the end
				if (pageEntities.length < pageSize) {
					this.logger.info(
						`      Reached end of dataset (got ${pageEntities.length} < ${pageSize} requested)`,
					);
					hasNextPage = false;
				}
			} while (hasNextPage);

			// Log completion of the final file
			if (currentFileEntityCount > 0) {
				this.logger.info(`   ✅ Completed file ${fileIndex}: ${currentFileEntityCount} entities`);
			}

			this.logger.info(
				`   ✅ Completed export for ${tableName}: ${totalEntityCount} entities in ${fileIndex} file(s)`,
			);
			totalTablesProcessed++;
			totalEntitiesExported += totalEntityCount;
		}

		// Compress the output directory to entities.zip
		const zipPath = safeJoinPath(outputDir, 'entities.zip');
		this.logger.info(`\n🗜️  Compressing export to ${zipPath}...`);

		await compressFolder(outputDir, zipPath, {
			level: 6,
			exclude: ['*.log'],
			includeHidden: false,
		});

		// Clean up individual JSONL files, keeping only the ZIP
		this.logger.info('🗑️  Cleaning up individual entity files...');
		const files = await readdir(outputDir);
		for (const file of files) {
			if (file.endsWith('.jsonl') && file !== 'entities.zip') {
				await rm(safeJoinPath(outputDir, file));
			}
		}

		this.logger.info('\n📊 Export Summary:');
		this.logger.info(`   Tables processed: ${totalTablesProcessed}`);
		this.logger.info(`   Total entities exported: ${totalEntitiesExported}`);
		this.logger.info(`   Output directory: ${outputDir}`);
		this.logger.info(`   Compressed archive: ${zipPath}`);
		this.logger.info('✅ Task completed successfully! \n');
	}
}
