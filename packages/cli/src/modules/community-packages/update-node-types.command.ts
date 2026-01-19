import { Command } from '@n8n/decorators';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { BaseCommand } from '@/commands/base-command';

import { getCommunityNodeTypes } from './community-node-types-utils';

@Command({
	name: 'update-node-types-data',
	description:
		'Update community node types data files in the source code (staging-node-types.json and production-node-types.json) by fetching latest data from APIs',
	examples: [''],
})
export class UpdateNodeTypes extends BaseCommand {
	async run() {
		this.logger.info('Starting to update community node types...');

		await this.fetchAndWriteNodeTypes('staging');
		await this.fetchAndWriteNodeTypes('production');

		this.logger.info('Successfully updated all community node types files');
	}

	async catch(error: Error) {
		this.logger.error('Error updating node types:');
		this.logger.error(error.message);
	}

	private async fetchAndWriteNodeTypes(environment: 'staging' | 'production') {
		this.logger.info(`Fetching all node types from ${environment}...`);

		try {
			const nodeTypes = await getCommunityNodeTypes(environment, {}, { throwOnError: true });

			this.logger.info(`Fetched ${nodeTypes.length} node types from ${environment}`);

			const filePath = join(
				process.cwd(),
				'packages',
				'cli',
				'src',
				'modules',
				'community-packages',
				'data',
				`${environment}-node-types.json`,
			);
			const jsonContent = JSON.stringify(nodeTypes, null, 2);

			writeFileSync(filePath, jsonContent, 'utf-8');

			this.logger.info(`Successfully wrote ${environment} node types to ${filePath}`);
		} catch (error) {
			this.logger.error(`Failed to update ${environment} node types: ${(error as Error).message}`);
			throw error;
		}
	}
}
