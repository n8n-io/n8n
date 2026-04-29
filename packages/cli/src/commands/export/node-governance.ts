import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import fs from 'fs';
import z from 'zod';

import { BaseCommand } from '../base-command';
import { NodeGovernanceService } from '@/services/node-governance.service';

const flagsSchema = z.object({
	output: z.string().alias('o').describe('Output file path for the exported JSON').optional(),
	pretty: z.boolean().describe('Format the output in an easier to read fashion').optional(),
});

@Command({
	name: 'export:node-governance',
	description: 'Export node governance categories and node assignments',
	examples: ['--output=governance.json', '--output=governance.json --pretty'],
	flagsSchema,
})
export class ExportNodeGovernanceCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const { flags } = this;

		const nodeGovernanceService = Container.get(NodeGovernanceService);
		const exportData = await nodeGovernanceService.exportCategories();

		const fileContents = JSON.stringify(exportData, null, flags.pretty ? 2 : undefined);

		if (flags.output) {
			fs.writeFileSync(flags.output, fileContents);
			this.logger.info(`Successfully exported node governance to ${flags.output}`);
			this.logger.info(`  - Categories: ${exportData.categories.length}`);
			this.logger.info(
				`  - Total node assignments: ${exportData.categories.reduce((sum, c) => sum + c.nodes.length, 0)}`,
			);
		} else {
			this.logger.info(fileContents);
		}
	}

	async catch(error: Error) {
		this.logger.error('Error exporting node governance. See log messages for details.');
		this.logger.error(error.message);
	}
}
