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
});

@Command({
	name: 'import:entities',
	description: 'Import database entities from JSON files',
	examples: ['', '--inputDir=./exports', '--inputDir=/path/to/backup'],
	flagsSchema,
})
export class ImportEntitiesCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const inputDir = this.flags.inputDir;

		this.logger.info('\n⚠️⚠️ This feature is currently under development. ⚠️⚠️');
		this.logger.info('\n🚀 Starting entity import...');
		this.logger.info(`📁 Input directory: ${inputDir}`);

		// Import entities from the specified directory
		await Container.get(ImportService).importEntities(inputDir);

		this.logger.info('✅ Task completed successfully! \n');
	}

	catch(error: Error) {
		this.logger.error('❌ Error importing entities. See log messages for details. \n');
		this.logger.error('Error details:');
		this.logger.error('\n====================================\n');
		this.logger.error(`${error.message} \n`);
	}
}
