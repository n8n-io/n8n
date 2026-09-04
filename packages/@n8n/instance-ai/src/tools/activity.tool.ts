/**
 * activity — reads the instance activity log the agent is handed a window of at the start of a
 * turn. The window is a window: this is how the agent looks further back, filters to one kind of
 * entry, or opens a single one.
 *
 * It never fetches the live resource. `workflows`, `executions` and `credentials` already do that,
 * and every entry carries the id to call them with.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

/** Enough to see a working session without turning a lookup into a transcript. */
const defaultListLimit = 30;
const maxListLimit = 100;

const activityInputSchema = z.discriminatedUnion('action', [
	z.object({
		action: z
			.literal('list')
			.describe('Read the log — further back than the list you were given, or filtered.'),
		category: z
			.enum(['workflow', 'credential'])
			.optional()
			.describe('Restrict to one kind of entry.'),
		resourceId: z
			.string()
			.optional()
			.describe('Restrict to one resource, e.g. a single workflow id.'),
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
			.describe(`How many entries to return (default ${defaultListLimit}).`),
	}),
	z.object({
		action: z.literal('expand').describe('Open one entry by its id.'),
		id: z
			.number()
			.int()
			.describe('The bracketed id of the entry, as shown in the list you were given.'),
	}),
]);

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
			'Read the instance activity log — what has recently been created, changed, published, ' +
				'or deleted here, and who did it. You are given a window of it at the start of a turn; ' +
				'use this to look further back, to filter to one kind of entry or one resource, or to ' +
				'open a single entry with `expand`. Expanding an entry also returns everything else the ' +
				"log knows about the same resource, which is how you see a workflow's recent history at " +
				'a glance. Read-only, and it returns log entries rather than live records — use ' +
				'`workflows`, `executions` or `credentials` with the ids it gives you for those. An ' +
				'entry may name a resource that has since been deleted.',
		)
		.input(activityInputSchema)
		.output(activityOutputSchema)
		.handler(async (input) => {
			const service = context.activityService;
			if (!service) {
				throw new Error('The instance activity log is not enabled on this instance.');
			}

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
				...(input.resourceId ? { resourceId: input.resourceId } : {}),
				...(input.beforeId !== undefined ? { beforeId: input.beforeId } : {}),
			});
			return { entries };
		})
		.build();
}
