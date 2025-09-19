import { Command } from '@n8n/decorators';
import { z } from 'zod';
import { Container } from '@n8n/di';

import { BaseCommand } from '../base-command';
import { ImportService } from '../../services/import.service';

const flagsSchema = z.object({
	inputDir: z
		.string()
		.describe('Input directory that holds output files for import')
		.default('./outputs'),
	truncateTables: z.boolean().describe('Truncate tables before import').default(false),
});

@Command({
	name: 'import:entities',
	description: 'Import database entities from JSON files',
	examples: [
		'',
		'--inputDir=./exports',
		'--inputDir=/path/to/backup',
		'--truncateTables',
		'--inputDir=./exports --truncateTables',
	],
	flagsSchema,
})
export class ImportEntitiesCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const inputDir = this.flags.inputDir;
		const truncateTables = this.flags.truncateTables;

		this.logger.info('\n⚠️⚠️ This feature is currently under development. ⚠️⚠️');
		this.logger.info('\n🚀 Starting entity import...');
		this.logger.info(`📁 Input directory: ${inputDir}`);
		this.logger.info(`🗑️  Truncate tables: ${truncateTables}`);

		const importService = Container.get(ImportService);

		await importService.disableForeignKeyConstraints();

		try {
			const tableNames = await importService.getTableNamesForImport(inputDir);

			if (truncateTables) {
				this.logger.info('\n🗑️  Truncating tables before import...');

				this.logger.info(`Found ${tableNames.length} tables to truncate: ${tableNames.join(', ')}`);

				for (const tableName of tableNames) {
					await importService.truncateEntityTable(tableName);
				}

				this.logger.info('✅ All tables truncated successfully');
			}

			if (!truncateTables) {
				if (!(await importService.areAllEntityTablesEmpty(tableNames))) {
					this.logger.info(
						'\n🗑️  Not all tables are empty, skipping import, you can use --truncateTables to truncate tables before import if needed',
					);
					return;
				}
			}

			// Import entities from the specified directory
			await importService.importEntitiesFromFiles(inputDir);
			this.logger.info('✅ Task completed successfully!');
		} finally {
			await importService.enableForeignKeyConstraints();
		}
	}

	catch(error: Error) {
		this.logger.error('❌ Error importing entities. See log messages for details. \n');
		this.logger.error('Error details:');
		this.logger.error('\n====================================\n');
		this.logger.error(`${error.message} \n`);
	}
}
