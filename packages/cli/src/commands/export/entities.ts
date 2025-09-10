import { Command } from '@n8n/decorators';
import z from 'zod';

import { BaseCommand } from '../base-command';
import { Container } from '@n8n/di';
import { UserRepository } from '@n8n/db';

const flagsSchema = z.object({
	all: z.boolean().describe('Export all entities').optional(),
});

@Command({
	name: 'export:entities',
	description: 'Export entities',
	examples: ['--all'],
	flagsSchema,
})
export class ExportEntitiesCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	// eslint-disable-next-line complexity
	async run() {
		console.log('Beginning export...');

		const users = await Container.get(UserRepository).find();
		console.log(users);
	}

	async catch(error: Error) {
		this.logger.error('Error exporting entities. See log messages for details.');
		this.logger.error(error.message);
	}
}
