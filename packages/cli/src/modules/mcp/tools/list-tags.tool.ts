import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import z from 'zod';

import type { TagService } from '@/services/tag.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createLimitSchema } from './schemas';

const MAX_RESULTS = 500;

const inputSchema = {
	limit: createLimitSchema(MAX_RESULTS),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.array(
			z.object({
				id: z.string().describe('The unique identifier of the tag'),
				name: z.string().describe('The display name of the tag'),
				usageCount: z
					.number()
					.int()
					.min(0)
					.describe('Number of non-archived workflows using this tag'),
				createdAt: z.string().describe('The ISO timestamp when the tag was created'),
				updatedAt: z.string().describe('The ISO timestamp when the tag was last updated'),
			}),
		)
		.describe('Workflow tags available in the instance'),
	count: z.number().int().min(0).describe('Number of tags returned'),
	totalCount: z.number().int().min(0).describe('Total number of tags before applying the limit'),
} satisfies z.ZodRawShape;

export type ListTagsParams = {
	limit?: number;
};

export type ListTagsItem = {
	id: string;
	name: string;
	usageCount: number;
	createdAt: string;
	updatedAt: string;
};

export type ListTagsResult = {
	data: ListTagsItem[];
	count: number;
	totalCount: number;
};

/**
 * Creates mcp tool definition for listing all workflow tags in the instance.
 * Tags are global (not project-scoped) and can be used with search_workflows to filter results.
 */
export const createListTagsTool = (
	user: User,
	tagService: TagService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'list_tags',
	config: {
		description: 'List all workflow tags in the instance.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'List Tags',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ limit = MAX_RESULTS }: ListTagsParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'list_tags',
			parameters: { limit },
		};

		try {
			if (!hasGlobalScope(user, 'tag:list')) {
				throw new Error('User does not have permission to list tags');
			}

			const payload = await listTags(tagService, { limit });

			telemetryPayload.results = {
				success: true,
				data: { count: payload.count },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});

export async function listTags(
	tagService: TagService,
	{ limit = MAX_RESULTS }: ListTagsParams = {},
): Promise<ListTagsResult> {
	const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);
	const { data: tags, totalCount } = await tagService.listWithUsageCount({ limit: safeLimit });

	const data: ListTagsItem[] = tags.map((tag) => ({
		id: tag.id,
		name: tag.name,
		usageCount: tag.usageCount ?? 0,
		createdAt: tag.createdAt.toISOString(),
		updatedAt: tag.updatedAt.toISOString(),
	}));

	return { data, count: data.length, totalCount };
}
