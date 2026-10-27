/**
 * activity — reads the instance activity log the agent is handed a window of at the start of a
 * turn. The window is a window: this is how the agent looks further back, filters to one kind of
 * entry, or opens a single one.
 *
 * It never fetches the live resource. `workflow_builder_workflows`, `workflow_builder_executions` and `list_credentials` already do that,
 * and every entry carries the id to call them with.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

/** Enough to see a working session without turning a lookup into a transcript. */
const defaultListLimit = 30;
const maxListLimit = 100;

const activityRuntimeInputSchema = z.discriminatedUnion('action', [
	z.object({
		action: z
			.literal('list')
			.describe('Read log — further back than list you were given, or filtered.'),
		category: z
			.enum(['workflow', 'credential'])
			.optional()
			.describe('Restrict to one kind of entry.'),
		resourceId: z
			.string()
			.min(1)
			.optional()
			.describe('Restrict to one resource, e.g. single workflow id.'),
		beforeId: z
			.number()
			.int()
			.optional()
			.describe('Page backwards — only entries older than this id.'),
		limit: z
			.number()
			.int()
			.min(1)
			.max(maxListLimit)
			.optional()
			.describe(`Entries to return (default ${defaultListLimit}).`),
	}),
	z.object({
		action: z.literal('expand').describe('Open one entry by id.'),
		id: z.number().int().describe('Bracketed id of entry, as shown in list you were given.'),
	}),
]);

/**
 * What the model is shown. A discriminated union serialises to `anyOf` with no top-level `type`,
 * which Anthropic rejects outright — so it is flattened to one object here, and the union above
 * still does the real validation in the handler.
 */
const activityInputSchema = sanitizeInputSchema(activityRuntimeInputSchema);

const activityEntrySchema = z.object({
	id: z.number(),
	at: z.string(),
	category: z.string(),
	action: z.string(),
	resourceType: z.string().optional(),
	resourceId: z.string().optional(),
	resourceName: z.string().optional(),
	byCurrentUser: z.boolean(),
	detail: z.record(z.unknown()).optional(),
});

const activityOutputSchema = z.object({
	entries: z.array(activityEntrySchema).optional(),
	entry: activityEntrySchema.optional(),
	resourceHistory: z.array(activityEntrySchema).optional(),
	liveRecordHint: z.string().optional(),
	/** Set when an id no longer resolves, which pruning makes an ordinary outcome. */
	notFound: z.boolean().optional(),
});

export function createActivityTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.ACTIVITY)
		.description(
			'Read instance activity log — what was recently created, changed, published, ' +
				'or deleted here, and who did it. You get a window of it at start of turn; ' +
				'use this to look further back, filter to one kind of entry or one resource, or ' +
				'open single entry with `expand`. Expanding entry also returns everything else ' +
				"log knows about same resource — shows workflow's recent history at " +
				'a glance. Read-only; returns log entries, not live records — for those use ' +
				'`workflow_builder_workflows`, `workflow_builder_executions` or `list_credentials` with ids it gives you. ' +
				'Entry may name resource since deleted.',
		)
		.input(activityInputSchema)
		.output(activityOutputSchema)
		.handler(async (rawInput) => {
			const service = context.activityService;
			if (!service) {
				throw new Error('The instance activity log is not enabled on this instance.');
			}

			// The schema the model sees is flattened, so branch-required fields are optional there.
			// Re-parsing against the union is what makes `expand` without an `id` impossible.
			const input = activityRuntimeInputSchema.parse(rawInput);

			if (input.action === 'expand') {
				const expansion = await service.expand(input.id);
				// Entries are pruned, so a stale id is expected rather than exceptional — and an id
				// outside this conversation's scope answers the same way, so the tool cannot be used
				// to find out what it cannot see. Either way the agent should carry on.
				if (!expansion) return { notFound: true };

				return {
					entry: expansion.entry,
					resourceHistory: expansion.resourceHistory,
					...(expansion.liveRecordHint ? { liveRecordHint: expansion.liveRecordHint } : {}),
				};
			}

			const entries = await service.list({
				limit: input.limit ?? defaultListLimit,
				...(input.category ? { category: input.category } : {}),
				...(input.resourceId !== undefined ? { resourceId: input.resourceId } : {}),
				...(input.beforeId !== undefined ? { beforeId: input.beforeId } : {}),
			});
			return { entries };
		})
		.build();
}
