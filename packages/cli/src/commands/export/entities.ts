import { Command } from '@n8n/decorators';
import { z } from 'zod';
import path from 'path';
import { ensureDir } from 'fs-extra';

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

		this.logger.info('\n⚠️⚠️ This feature is currently under development. ⚠️⚠️');
		this.logger.info('\n🚀 Starting entity export...');
		this.logger.info(`📁 Output directory: ${outputDir}`);

		await ensureDir(outputDir);

		// TODO: Export entities

		this.logger.info('✅ Task completed successfully! \n');
	}

	catch(error: Error) {
		this.logger.error('❌ Error exporting entities. See log messages for details. \n');
		this.logger.error('Error details:');
		this.logger.error('\n====================================\n');
		this.logger.error(`${error.message} \n`);
	}
}
