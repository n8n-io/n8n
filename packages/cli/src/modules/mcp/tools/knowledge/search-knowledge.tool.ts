import type { User } from '@n8n/db';
import z from 'zod';

import type { KnowledgeSearchService } from '@/modules/knowledge/knowledge-search.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

const SEARCH_MAX_RESULTS = 25;

/** Chunks are ~1500 characters; this keeps a full page of results readable in a context window. */
const MAX_TEXT_LENGTH = 1200;

const searchInputSchema = {
	query: z.string().describe('What to look for; matched semantically, not by keyword'),
	sourceIds: z
		.array(z.string())
		.optional()
		.describe('Restrict the search to these knowledge source IDs'),
	topK: z
		.number()
		.int()
		.positive()
		.max(SEARCH_MAX_RESULTS)
		.optional()
		.describe(`Number of results to return (max ${SEARCH_MAX_RESULTS})`),
} satisfies z.ZodRawShape;

const searchOutputSchema = {
	results: z
		.array(
			z.object({
				text: z.string(),
				title: z.string(),
				url: z.string().nullable(),
				sourceName: z.string(),
				externalId: z.string(),
				score: z.number(),
			}),
		)
		.describe('Matching passages, most relevant first'),
	total: z.number().int().min(0).describe('Number of passages returned'),
} satisfies z.ZodRawShape;

const truncate = (text: string) =>
	text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;

/**
 * `getSearchService` is a lazy accessor rather than the service itself: the
 * knowledge module is optional, so its container entry is only resolved once
 * the tool is actually called.
 */
export const createSearchKnowledgeTool = (
	user: User,
	getSearchService: () => KnowledgeSearchService,
	telemetry: Telemetry,
): ToolDefinition<typeof searchInputSchema> => ({
	name: 'search_knowledge',
	config: {
		description:
			"Search the knowledge indexed on this n8n instance (connected sources such as GitHub repositories and the instance's own workflows, data tables and credentials). Use this to answer questions about what exists on the instance or what a connected source documents.",
		inputSchema: searchInputSchema,
		outputSchema: searchOutputSchema,
		annotations: {
			title: 'Search Knowledge',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		query,
		sourceIds,
		topK,
	}: {
		query: string;
		sourceIds?: string[];
		topK?: number;
	}) => {
		// The query itself is left out of telemetry — it is free-form user text.
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'search_knowledge',
			parameters: { sourceIds, topK },
		};

		try {
			const safeTopK = Math.min(Math.max(1, topK ?? SEARCH_MAX_RESULTS), SEARCH_MAX_RESULTS);

			const hits = await getSearchService().search(query, { sourceIds, topK: safeTopK });

			const results = hits.map((hit) => ({
				text: truncate(hit.text),
				title: hit.title,
				url: hit.url,
				sourceName: hit.sourceName,
				externalId: hit.externalId,
				score: hit.score,
			}));

			telemetryPayload.results = {
				success: true,
				data: { count: results.length },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { results, total: results.length };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { results: [], total: 0, error: errorMessage };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
