import { Command } from '@n8n/decorators';
import { z } from 'zod';
import { Container } from '@n8n/di';

import { BaseCommand } from '../base-command';
import { ExportService } from '@/services/export.service';
import { safeJoinPath } from '@n8n/backend-common';

const flagsSchema = z.object({
	outputDir: z
		.string()
		.describe('Output directory path')
		.default(safeJoinPath(__dirname, './outputs')),
	includeLargeDataTables: z.boolean().describe('Include large data tables').default(false),
});

@Command({
	name: 'export:entities',
	description: 'Export database entities to JSON files',
	examples: [
		'',
		'--outputDir=./exports',
		'--outputDir=/path/to/backup',
		'--includeLargeDataTables=true',
	],
	flagsSchema,
})
export class ExportEntitiesCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const outputDir = this.flags.outputDir;

		const excludedLargeDataTables = new Set<string>();

		if (!this.flags.includeLargeDataTables) {
			excludedLargeDataTables.add('execution_annotation_tags');
			excludedLargeDataTables.add('execution_annotations');
			excludedLargeDataTables.add('execution_data');
			excludedLargeDataTables.add('execution_entity');
			excludedLargeDataTables.add('execution_metadata');
		}

		await Container.get(ExportService).exportEntities(outputDir, excludedLargeDataTables);
	}

	catch(error: Error) {
		this.logger.error('❌ Error exporting entities. See log messages for details. \n');
		this.logger.error('Error details:');
		this.logger.error('\n====================================\n');
		this.logger.error(`${error.message} \n`);
	}
}
