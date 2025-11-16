import type { User } from '@n8n/db';
import type { ReadResourceCallback } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'n8n-workflow';

import type { DataStoreService } from '@/modules/data-table/data-store.service';

const PROMPTS_TABLE_NAME = 'mcp_prompts';

export type ResourceDefinition = {
	uriTemplate: string;
	config: {
		name: string;
		description: string;
		mimeType?: string;
	};
	handler: ReadResourceCallback;
};

/**
 * MCP Resource: Obtiene un prompt específico por nombre
 * URI Template: prompts://{projectId}/{promptName}
 */
export const createGetPromptResource = (
	user: User,
	dataStoreService: DataStoreService,
): ResourceDefinition => {
	return {
		uriTemplate: 'prompts://{projectId}/{promptName}',
		config: {
			name: 'Get Prompt Content',
			description: 'Get the full content of a specific prompt',
			mimeType: 'text/plain',
		},
		handler: async ({ uri }) => {
			try {
				// Parse URI: prompts://projectId/promptName
				const match = uri.match(/^prompts:\/\/([^/]+)\/(.+)$/);
				if (!match) {
					throw new UserError('Invalid prompt URI format. Expected: prompts://projectId/promptName');
				}

				const [, projectId, encodedPromptName] = match;
				const promptName = decodeURIComponent(encodedPromptName);

				// Buscar tabla de prompts en el proyecto
				const { data: tables } = await dataStoreService.getManyAndCount({
					filter: { name: PROMPTS_TABLE_NAME, projectId },
					take: 1,
				});

				if (tables.length === 0) {
					throw new UserError(
						`Prompts table not found in project ${projectId}. Create prompts using the manage_prompts tool.`,
					);
				}

				const table = tables[0];

				// Buscar prompt por nombre
				const { data } = await dataStoreService.getManyRowsAndCount(table.id, projectId, {
					filter: {
						type: 'and',
						filters: [
							{ columnName: 'name', condition: 'eq', value: promptName },
							{ columnName: 'availableInMCP', condition: 'eq', value: true },
						],
					},
					take: 1,
				});

				if (data.length === 0) {
					throw new UserError(`Prompt "${promptName}" not found or not available in MCP`);
				}

				const prompt = data[0];

				return {
					contents: [
						{
							uri: `prompts://${projectId}/${encodeURIComponent(promptName)}`,
							mimeType: 'text/plain',
							text: prompt.content,
						},
					],
					_meta: {
						name: prompt.name,
						description: prompt.description,
						category: prompt.category,
						tags: prompt.tags,
						version: prompt.version,
						createdAt: prompt.createdAt,
						updatedAt: prompt.updatedAt,
					},
				};
			} catch (error) {
				return {
					contents: [
						{
							uri,
							mimeType: 'application/json',
							text: JSON.stringify({
								error: error instanceof Error ? error.message : 'Unknown error',
							}),
						},
					],
				};
			}
		},
	};
};
