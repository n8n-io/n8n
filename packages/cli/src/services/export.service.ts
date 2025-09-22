import { Logger } from '@n8n/backend-common';
import { mkdir, rm, readdir, appendFile } from 'fs/promises';
import path from 'path';

import { Service } from '@n8n/di';
import { type DataSource } from '@n8n/db';

@Service()
export class ExportService {
	constructor(
		private readonly logger: Logger,
		private readonly dataSource: DataSource,
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
				await rm(path.join(outputDir, file));
				this.logger.info(`      Deleted: ${file}`);
			}
		}
	}

	async exportEntities(outputDir: string) {
		this.logger.info('\n⚠️⚠️ This feature is currently under development. ⚠️⚠️');
		this.logger.info('\n🚀 Starting entity export...');
		this.logger.info(`📁 Output directory: ${outputDir}`);

		// Ensure output directory exists
		await mkdir(outputDir, { recursive: true });

		// Get DataSource from Container and fetch all repositories
		const entityMetadatas = this.dataSource.entityMetadatas;

		this.logger.info('\n📋 Exporting entities from all tables:');
		this.logger.info('====================================');

		let totalTablesProcessed = 0;
		let totalEntitiesExported = 0;
		const pageSize = 500;
		const entitiesPerFile = 10000;

		for (const metadata of entityMetadatas) {
			// Get table name and entity name
			const tableName = metadata.tableName;
			const entityName = metadata.name.toLowerCase();

			this.logger.info(`\n📊 Processing table: ${tableName} (${entityName})`);

			// Clear existing files for this entity
			await this.clearExistingEntityFiles(outputDir, entityName);

			// Get column information for this table
			const columns = metadata.columns.map((col) => col.databaseName).join(', ');
			this.logger.info(`   💭 Columns: ${columns}`);

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
				const pageEntities = await this.dataSource.query(
					`SELECT ${columns} FROM ${tableName} LIMIT ${pageSize} OFFSET ${offset}`,
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
				const filePath = path.join(outputDir, fileName);

				// If we've moved to a new file, log the completion of the previous file
				if (targetFileIndex > fileIndex) {
					this.logger.info(`   ✅ Completed file ${fileIndex}: ${currentFileEntityCount} entities`);
					fileIndex = targetFileIndex;
					currentFileEntityCount = 0;
				}

				// Append all entities in this page as JSONL (one JSON object per line)
				const entitiesJsonl = pageEntities
					.map((entity: unknown) => JSON.stringify(entity))
					.join('\n');
				await appendFile(filePath, entitiesJsonl + '\n', 'utf8');

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

		this.logger.info('\n📊 Export Summary:');
		this.logger.info(`   Tables processed: ${totalTablesProcessed}`);
		this.logger.info(`   Total entities exported: ${totalEntitiesExported}`);
		this.logger.info(`   Output directory: ${outputDir}`);
		this.logger.info('✅ Task completed successfully! \n');
	}
}
