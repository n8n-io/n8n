import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import type { ToolDefinition } from '../mcp.types';

import type { DataStoreService } from '@/modules/data-table/data-store.service';

const PROMPTS_TABLE_NAME = 'mcp_prompts';

const promptOperationSchema = z.enum(['create', 'update', 'delete', 'search']);

const inputSchema = {
	operation: promptOperationSchema.describe('Operation to perform on prompts'),
	projectId: z.string().optional().describe('Project ID (required for all operations)'),
	promptName: z.string().optional().describe('Prompt name (required for create, update, delete)'),
	content: z
		.string()
		.optional()
		.describe('Prompt content (required for create, optional for update)'),
	description: z.string().optional().describe('Prompt description'),
	category: z.string().optional().describe('Prompt category (e.g., coding, analysis, writing)'),
	tags: z.string().optional().describe('Comma-separated tags'),
	version: z.string().optional().describe('Semver version (e.g., 1.0.0)'),
	searchQuery: z.string().optional().describe('Search query for prompts (for search operation)'),
} satisfies z.ZodRawShape;

const outputSchema = {
	success: z.boolean(),
	message: z.string(),
	data: z.unknown().optional(),
} satisfies z.ZodRawShape;

/**
 * MCP Tool: Gestión completa de prompts (CRUD)
 */
export const createPromptTool = (
	user: User,
	dataStoreService: DataStoreService,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'manage_prompts',
		config: {
			description:
				'Create, update, delete, or search prompts in n8n. Prompts can be used as reusable templates for AI interactions.',
			inputSchema,
			outputSchema,
		},
		handler: async (params) => {
			const { operation, projectId } = params;

			if (!projectId) {
				throw new UserError('projectId is required for all prompt operations');
			}

			try {
				// Asegurar que existe la tabla de prompts
				await ensurePromptsTableExists(projectId, dataStoreService);

				switch (operation) {
					case 'create':
						return await createPrompt(projectId, params, dataStoreService);
					case 'update':
						return await updatePrompt(projectId, params, dataStoreService);
					case 'delete':
						return await deletePrompt(projectId, params, dataStoreService);
					case 'search':
						return await searchPrompts(projectId, params, dataStoreService);
					default:
						throw new UserError(`Unknown operation: ${operation}`);
				}
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								success: false,
								message: error instanceof Error ? error.message : 'Unknown error',
							}),
						},
					],
				};
			}
		},
	};
};

// ========== HELPER FUNCTIONS ==========

async function ensurePromptsTableExists(
	projectId: string,
	dataStoreService: DataStoreService,
): Promise<string> {
	const { data: tables } = await dataStoreService.getManyAndCount({
		filter: { name: PROMPTS_TABLE_NAME, projectId },
		take: 1,
	});

	if (tables.length > 0) {
		return tables[0].id;
	}

	// Crear tabla si no existe
	const PROMPT_COLUMNS = [
		{ name: 'name', type: 'string' as const, index: 0 },
		{ name: 'content', type: 'string' as const, index: 1 },
		{ name: 'description', type: 'string' as const, index: 2 },
		{ name: 'category', type: 'string' as const, index: 3 },
		{ name: 'tags', type: 'string' as const, index: 4 },
		{ name: 'version', type: 'string' as const, index: 5 },
		{ name: 'availableInMCP', type: 'boolean' as const, index: 6 },
		{ name: 'isPublic', type: 'boolean' as const, index: 7 },
	];

	const createdTable = await dataStoreService.createDataStore(projectId, {
		name: PROMPTS_TABLE_NAME,
		columns: PROMPT_COLUMNS,
	});

	return createdTable.id;
}

async function createPrompt(projectId: string, params: any, dataStoreService: DataStoreService) {
	const { promptName, content, description, category, tags, version } = params;

	if (!promptName || !content) {
		throw new UserError('promptName and content are required for create operation');
	}

	const tableId = await ensurePromptsTableExists(projectId, dataStoreService);

	// Verificar que no exista prompt con el mismo nombre
	const { data: existing } = await dataStoreService.getManyRowsAndCount(
		tableId,
		projectId,
		{
			filter: {
				type: 'and',
				filters: [{ columnName: 'name', condition: 'eq', value: promptName }],
			},
			take: 1,
		},
	);

	if (existing.length > 0) {
		throw new UserError(`Prompt "${promptName}" already exists in this project`);
	}

	// Crear prompt
	const result = await dataStoreService.insertRows(
		tableId,
		projectId,
		[
			{
				name: promptName,
				content,
				description: description || '',
				category: category || 'general',
				tags: tags || '',
				version: version || '1.0.0',
				availableInMCP: true,
				isPublic: false,
			},
		],
		true, // returnType
	);

	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					success: true,
					message: `Prompt "${promptName}" created successfully`,
					data: {
						id: result[0].id,
						uri: `prompts://${projectId}/${encodeURIComponent(promptName)}`,
						...result[0],
					},
				}),
			},
		],
	};
}

async function updatePrompt(projectId: string, params: any, dataStoreService: DataStoreService) {
	const { promptName, content, description, category, tags, version } = params;

	if (!promptName) {
		throw new UserError('promptName is required for update operation');
	}

	const tableId = await ensurePromptsTableExists(projectId, dataStoreService);

	const updateData: any = {};
	if (content !== undefined) updateData.content = content;
	if (description !== undefined) updateData.description = description;
	if (category !== undefined) updateData.category = category;
	if (tags !== undefined) updateData.tags = tags;
	if (version !== undefined) updateData.version = version;

	if (Object.keys(updateData).length === 0) {
		throw new UserError('At least one field must be provided for update');
	}

	const result = await dataStoreService.updateRows(
		tableId,
		projectId,
		{
			filter: {
				type: 'and',
				filters: [{ columnName: 'name', condition: 'eq', value: promptName }],
			},
			data: updateData,
		},
		true, // returnData
		false, // dryRun
	);

	if (!Array.isArray(result) || result.length === 0) {
		throw new UserError(`Prompt "${promptName}" not found`);
	}

	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					success: true,
					message: `Prompt "${promptName}" updated successfully`,
					data: {
						updatedRows: result.length,
						rows: result,
					},
				}),
			},
		],
	};
}

async function deletePrompt(projectId: string, params: any, dataStoreService: DataStoreService) {
	const { promptName } = params;

	if (!promptName) {
		throw new UserError('promptName is required for delete operation');
	}

	const tableId = await ensurePromptsTableExists(projectId, dataStoreService);

	const result = await dataStoreService.deleteRows(
		tableId,
		projectId,
		{
			filter: {
				type: 'and',
				filters: [{ columnName: 'name', condition: 'eq', value: promptName }],
			},
		},
		true, // returnData
	);

	if (!Array.isArray(result) || result.length === 0) {
		throw new UserError(`Prompt "${promptName}" not found`);
	}

	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					success: true,
					message: `Prompt "${promptName}" deleted successfully`,
					data: {
						deletedRows: result.length,
					},
				}),
			},
		],
	};
}

async function searchPrompts(projectId: string, params: any, dataStoreService: DataStoreService) {
	const { searchQuery } = params;

	const tableId = await ensurePromptsTableExists(projectId, dataStoreService);

	// Obtener todos los prompts disponibles en MCP
	const { data } = await dataStoreService.getManyRowsAndCount(tableId, projectId, {
		filter: {
			type: 'and',
			filters: [{ columnName: 'availableInMCP', condition: 'eq', value: true }],
		},
		take: 200,
	});

	let filteredRows = data;
	if (searchQuery) {
		const query = searchQuery.toLowerCase();
		filteredRows = data.filter(
			(row: any) =>
				row.name?.toLowerCase().includes(query) ||
				row.description?.toLowerCase().includes(query) ||
				row.tags?.toLowerCase().includes(query) ||
				row.category?.toLowerCase().includes(query) ||
				row.content?.toLowerCase().includes(query),
		);
	}

	const formattedPrompts = filteredRows.map((row: any) => ({
		id: row.id,
		uri: `prompts://${projectId}/${encodeURIComponent(row.name)}`,
		name: row.name,
		description: row.description,
		category: row.category,
		tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	}));

	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					success: true,
					message: `Found ${formattedPrompts.length} prompt(s)`,
					data: {
						prompts: formattedPrompts,
						count: formattedPrompts.length,
					},
				}),
			},
		],
	};
}
