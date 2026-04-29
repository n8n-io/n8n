import { UserRepository, GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import fs from 'fs';
import { jsonParse, UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BaseCommand } from '../base-command';
import {
	NodeGovernanceService,
	type NodeGovernanceExport,
} from '@/services/node-governance.service';

const flagsSchema = z.object({
	input: z.string().alias('i').describe('Input JSON file path'),
	userId: z
		.string()
		.describe('The ID of the user to attribute the import to (defaults to instance owner)')
		.optional(),
});

@Command({
	name: 'import:node-governance',
	description: 'Import node governance categories and node assignments',
	examples: [
		'--input=governance.json',
		'--input=governance.json --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
	],
	flagsSchema,
})
export class ImportNodeGovernanceCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run(): Promise<void> {
		const { flags } = this;

		if (!flags.input) {
			this.logger.info('An input file with --input must be provided');
			return;
		}

		if (!fs.existsSync(flags.input)) {
			throw new UserError(`File not found: ${flags.input}`);
		}

		// Read and parse the input file
		const fileContents = fs.readFileSync(flags.input, { encoding: 'utf8' });
		const importData = jsonParse<NodeGovernanceExport>(fileContents);

		// Validate the import data structure
		if (!importData.version || !Array.isArray(importData.categories)) {
			throw new UserError('Invalid file format. Expected JSON with version and categories array.');
		}

		// Get the user to attribute the import to
		const userRepository = Container.get(UserRepository);
		let user;

		if (flags.userId) {
			user = await userRepository.findOne({ where: { id: flags.userId } });
			if (!user) {
				throw new UserError(`User with ID ${flags.userId} not found`);
			}
		} else {
			// Default to the instance owner
			user = await userRepository.findOne({ where: { role: GLOBAL_OWNER_ROLE } });
			if (!user) {
				throw new UserError('No instance owner found. Please specify --userId.');
			}
		}

		// Perform the import
		const nodeGovernanceService = Container.get(NodeGovernanceService);
		const result = await nodeGovernanceService.importCategories(importData, user);

		this.logger.info(`Successfully imported node governance from ${flags.input}`);
		this.logger.info(`  - Created: ${result.created} categories`);
		this.logger.info(`  - Updated: ${result.updated} categories`);
		this.logger.info(`  - Unchanged: ${result.unchanged} categories`);

		if (result.categories.length > 0) {
			this.logger.info('');
			this.logger.info('Details:');
			for (const cat of result.categories) {
				this.logger.info(`  - ${cat.slug}: ${cat.action} (${cat.nodeCount} nodes)`);
			}
		}
	}

	async catch(error: Error) {
		this.logger.error('Error importing node governance. See log messages for details.');
		this.logger.error(error.message);
	}
}
