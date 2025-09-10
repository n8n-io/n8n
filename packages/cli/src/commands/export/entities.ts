import { Command } from '@n8n/decorators';
import { z } from 'zod';
import { writeFileSync } from 'fs-extra';
import { resolve } from 'path';
import path from 'path';

import { BaseCommand } from '../base-command';
import { Container } from '@n8n/di';
import { SettingsRepository, ApiKeyRepository } from '@n8n/db';

// Supported entities for export
const SUPPORTED_ENTITIES = ['Settings', 'ApiKey'] as const;

const flagsSchema = z.object({
	outputDir: z
		.string()
		.describe('Output directory path')
		.default(path.join(__dirname, './outputs')),
});

@Command({
	name: 'export:entities',
	description: 'Export supported entities to JSON files',
	examples: ['', '--outputDir=./exports', '--outputDir=/path/to/backup'],
	flagsSchema,
})
export class ExportEntitiesCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const outputDir = this.flags.outputDir;

		console.log('🚀 Starting entity export...');
		console.log(`📁 Output directory: ${outputDir}`);
		console.log(`📋 Supported entities: ${SUPPORTED_ENTITIES.join(', ')}`);

		try {
			// Ensure output directory exists
			const { ensureDir } = await import('fs-extra');
			await ensureDir(outputDir);

			// Export each supported entity
			for (const entityName of SUPPORTED_ENTITIES) {
				await this.exportEntity(entityName, outputDir);
			}

			console.log('✅ All entity exports completed successfully!');
		} catch (error) {
			this.logger.error('Error exporting entities:', error);
			throw error;
		}
	}

	/**
	 * Export a single entity
	 */
	private async exportEntity(entityName: string, outputDir: string): Promise<void> {
		const outputFile = `${entityName.toLowerCase()}.json`;
		const outputPath = resolve(outputDir, outputFile);

		console.log(`\n📄 Exporting ${entityName} to ${outputFile}...`);

		try {
			// Get entity data based on entity name
			const entityData = await this.getEntityData(entityName);
			const recordCount = entityData.length;

			console.log(`📊 Found ${recordCount} ${entityName.toLowerCase()} records`);

			// Create export data structure
			const exportData = {
				metadata: {
					version: '1.0.0',
					timestamp: new Date().toISOString(),
					entity: entityName,
					recordCount,
					checksum: this.generateChecksum(entityData),
				},
				[entityName.toLowerCase()]: entityData,
			};

			// Write to file
			writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');

			console.log(`✅ ${entityName} export completed!`);
			console.log(`📁 Output file: ${outputPath}`);
			console.log(`📊 Records exported: ${recordCount}`);
			console.log(`🔍 Checksum: ${exportData.metadata.checksum}`);
		} catch (error) {
			this.logger.error(`Error exporting ${entityName} entity:`, error);
			throw error;
		}
	}

	/**
	 * Get entity data based on entity name
	 */
	private async getEntityData(entityName: string): Promise<any[]> {
		switch (entityName) {
			case 'Settings':
				const settingsRepository = Container.get(SettingsRepository);
				const settings = await settingsRepository.find();
				return settings.map((setting) => ({
					key: setting.key,
					value: setting.value,
					loadOnStartup: setting.loadOnStartup,
				}));

			case 'ApiKey':
				const apiKeyRepository = Container.get(ApiKeyRepository);
				const apiKeys = await apiKeyRepository.find({
					relations: ['user'], // Include the user relationship
				});
				return apiKeys.map((apiKey) => ({
					id: apiKey.id,
					userId: apiKey.userId,
					label: apiKey.label,
					scopes: apiKey.scopes,
					apiKey: apiKey.apiKey,
					createdAt: apiKey.createdAt,
					updatedAt: apiKey.updatedAt,
					// Include user relationship data
					user: apiKey.user
						? {
								id: apiKey.user.id,
								email: apiKey.user.email,
								firstName: apiKey.user.firstName,
								lastName: apiKey.user.lastName,
							}
						: null,
				}));

			default:
				throw new Error(`Unsupported entity: ${entityName}`);
		}
	}

	async catch(error: Error) {
		this.logger.error('Error exporting entities. See log messages for details.');
		this.logger.error(error.message);
	}

	/**
	 * Generate a simple checksum for the settings data
	 */
	private generateChecksum(settings: any[]): string {
		// Simple checksum based on settings count and timestamp
		const dataString = `${settings.length}-${Date.now()}`;
		return Buffer.from(dataString).toString('base64').substring(0, 16);
	}
}
