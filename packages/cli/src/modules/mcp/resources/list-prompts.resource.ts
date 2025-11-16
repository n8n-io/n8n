import type { User } from '@n8n/db';
import type { ListCallback } from '@modelcontextprotocol/sdk/types.js';

import type { DataStoreService } from '@/modules/data-table/data-store.service';

const PROMPTS_TABLE_NAME = 'mcp_prompts';

export type ResourceDefinition = {
	uri: string;
	config: {
		name: string;
		description: string;
		mimeType?: string;
	};
	handler: ListCallback;
};

/**
 * MCP Resource: Lista todos los prompts disponibles
 * URI Template: prompts://list
 */
export const createListPromptsResource = (
	user: User,
	dataStoreService: DataStoreService,
): ResourceDefinition => {
	return {
		uri: 'prompts://list',
		config: {
			name: 'Available Prompts',
			description: 'List all prompts available in n8n',
			mimeType: 'application/json',
		},
		handler: async () => {
			try {
				// Buscar tabla de prompts en proyectos del usuario
				const { data: tables } = await dataStoreService.getManyAndCount({
					filter: { name: PROMPTS_TABLE_NAME },
					take: 100,
				});

				if (tables.length === 0) {
					return {
						contents: [
							{
								uri: 'prompts://list',
								mimeType: 'application/json',
								text: JSON.stringify({
									prompts: [],
									message: 'No prompts table found. Create prompts using the manage_prompts tool.',
								}),
							},
						],
					};
				}

				// Obtener prompts de todas las tablas encontradas
				const allPrompts: any[] = [];

				for (const table of tables) {
					try {
						const { rows } = await dataStoreService.getManyRowsAndCount(
							table.id,
							table.projectId,
							{
								filter: { availableInMCP: true },
								take: 200,
							},
						);

						const formattedPrompts = rows.map((row: any) => ({
							uri: `prompts://${table.projectId}/${row.name}`,
							name: row.name,
							description: row.description || '',
							category: row.category || 'general',
							tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
							version: row.version || '1.0.0',
							projectId: table.projectId,
							projectName: table.project?.name || 'Unknown',
						}));

						allPrompts.push(...formattedPrompts);
					} catch (err) {
						// Skip tables that can't be read (permission issues, etc.)
						continue;
					}
				}

				return {
					contents: [
						{
							uri: 'prompts://list',
							mimeType: 'application/json',
							text: JSON.stringify({
								prompts: allPrompts,
								count: allPrompts.length,
							}),
						},
					],
				};
			} catch (error) {
				return {
					contents: [
						{
							uri: 'prompts://list',
							mimeType: 'application/json',
							text: JSON.stringify({
								error: error instanceof Error ? error.message : 'Unknown error',
								prompts: [],
							}),
						},
					],
				};
			}
		},
	};
};
