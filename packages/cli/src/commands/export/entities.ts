import { Command } from '@n8n/decorators';
import { z } from 'zod';
import path from 'path';
import { ensureDir } from 'fs-extra';
import { DataSource } from '@n8n/typeorm';
import { Container } from '@n8n/di';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	outputDir: z
		.string()
		.describe('Output directory path')
		.default(path.join(__dirname, './outputs')),
});

@Command({
	name: 'export:entities',
	description: 'Export database entities to JSON files',
	examples: ['', '--outputDir=./exports', '--outputDir=/path/to/backup'],
	flagsSchema,
})
export class ExportEntitiesCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const outputDir = this.flags.outputDir;

		this.logger.info('\n🚀 Starting entity export...');
		this.logger.info(`📁 Output directory: ${outputDir}`);

		await ensureDir(outputDir);

		// Get DataSource from Container and fetch all repositories
		const dataSource = Container.get(DataSource);
		const entityMetadatas = dataSource.entityMetadatas;

		this.logger.info('\n📋 Fetching sample entities from all tables:');
		this.logger.info('====================================');

		for (const metadata of entityMetadatas) {
			try {
				// Get repository for this entity
				const repository = dataSource.getRepository(metadata.target);

				// Get table name
				const tableName = metadata.tableName;

				// Try to get one entity from the table
				const sampleEntity = await repository.find({ take: 1 });

				if (sampleEntity) {
					this.logger.info(`\n📊 Table: ${tableName}`);
					this.logger.info(`Entity: ${metadata.name}`);
					this.logger.info('Sample data:');
					this.logger.info(JSON.stringify(sampleEntity, null, 2));
				} else {
					this.logger.info(`\n Table: ${tableName} (empty)`);
					this.logger.info(`Entity: ${metadata.name}`);
					this.logger.info('No data found in this table');
				}
			} catch (error) {
				this.logger.error(`\n❌ Error fetching from table: ${metadata.tableName}`);
				this.logger.error(`Entity: ${metadata.name}`);
				this.logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		this.logger.info(`\n📊 Total tables processed: ${entityMetadatas.length}`);
		this.logger.info('✅ Task completed successfully! \n');
	}

	catch(error: Error) {
		this.logger.error('❌ Error exporting entities. See log messages for details. \n');
		this.logger.error('Error details:');
		this.logger.error('\n====================================\n');
		this.logger.error(`${error.message} \n`);
	}
}
