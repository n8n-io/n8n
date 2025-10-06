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
	includeExecutionHistoryDataTables: z
		.boolean()
		.describe(
			'Include execution history data tables, these are excluded by default as they can be very large',
		)
		.default(false),
});

@Command({
	name: 'export:entities',
	description: 'Export database entities to JSON files',
	examples: [
		'',
		'--outputDir=./exports',
		'--outputDir=/path/to/backup',
		'--includeExecutionHistoryDataTables=true',
	],
	flagsSchema,
})
export class ExportEntitiesCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const outputDir = this.flags.outputDir;

		const excludedDataTables = new Set<string>();

		if (!this.flags.includeExecutionHistoryDataTables) {
			excludedDataTables.add('execution_annotation_tags');
			excludedDataTables.add('execution_annotations');
			excludedDataTables.add('execution_data');
			excludedDataTables.add('execution_entity');
			excludedDataTables.add('execution_metadata');
		}

		await Container.get(ExportService).exportEntities(outputDir, excludedDataTables);
	}

	catch(error: Error) {
		this.logger.error('❌ Error exporting entities. See log messages for details. \n');
		this.logger.error('Error details:');
		this.logger.error('\n====================================\n');
		this.logger.error(`${error.message} \n`);
	}
}
