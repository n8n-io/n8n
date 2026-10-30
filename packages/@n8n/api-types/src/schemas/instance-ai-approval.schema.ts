import { z } from 'zod';

const valuePreviewSchema = z.object({ column: z.string(), value: z.string().nullable() });
const rowPreviewSchema = z.object({
	values: z.array(valuePreviewSchema),
	remainingColumns: z.number().int().nonnegative(),
});
const filterPreviewSchema = z.object({
	type: z.enum(['and', 'or']),
	filters: z.array(
		z.object({
			columnName: z.string(),
			condition: z.enum(['eq', 'neq', 'like', 'ilike', 'gt', 'gte', 'lt', 'lte']),
			value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
		}),
	),
});

export const instanceAiApprovalDetailsSchema = z.discriminatedUnion('action', [
	z.object({ action: z.literal('edit-workflow'), summary: z.string().optional() }),
	z.object({ action: z.literal('delete-table') }),
	z.object({
		action: z.literal('add-column'),
		column: z.string(),
		columnType: z.enum(['string', 'number', 'boolean', 'date']),
	}),
	z.object({ action: z.literal('delete-column'), column: z.string() }),
	z.object({ action: z.literal('rename-column'), column: z.string(), newName: z.string() }),
	z.object({
		action: z.literal('insert-rows'),
		count: z.number().int().nonnegative(),
		rows: z.array(rowPreviewSchema),
	}),
	z.object({
		action: z.literal('update-rows'),
		changes: rowPreviewSchema,
		filter: filterPreviewSchema,
	}),
	z.object({ action: z.literal('delete-rows'), filter: filterPreviewSchema }),
	z.object({ action: z.literal('archive-workflow'), name: z.string(), id: z.string() }),
	z.object({ action: z.literal('restore-workflow'), name: z.string(), id: z.string() }),
	z.object({ action: z.literal('unpublish-workflow'), name: z.string(), id: z.string() }),
	z.object({
		action: z.literal('restore-version'),
		version: z.string(),
		createdAt: z.string().optional(),
	}),
	z.object({
		action: z.literal('update-version'),
		version: z.string(),
		name: z.string().nullable().optional(),
		description: z.string().nullable().optional(),
	}),
	z.object({
		action: z.literal('run-workflow'),
		summary: z.string().optional(),
		trigger: z.string().optional(),
	}),
	z.object({
		action: z.literal('publish-workflow'),
		summary: z.string().optional(),
		selectedVersion: z.boolean(),
		supportingCount: z.number().int().nonnegative(),
		verification: z
			.object({
				level: z.enum(['unproven', 'partial', 'failed', 'no-verdict']),
				cause: z.string().optional(),
				unprovenTargets: z.array(z.string()),
				pendingTriggers: z.array(z.string()),
				nodesNotReached: z.array(z.string()),
				plannedNodeCount: z.number(),
				simulatedNodes: z.array(z.string()),
				pinnedNodes: z.array(z.string()),
			})
			.optional(),
	}),
]);

export type InstanceAiApprovalDetails = z.infer<typeof instanceAiApprovalDetailsSchema>;

/**
 * How the Assistant treats an action set to Ask first. `manual` shows the
 * approval card. `auto` lets a judge model run the action or show the card.
 */
export const instanceAiApprovalModeSchema = z.enum(['manual', 'auto']);
export type InstanceAiApprovalMode = z.infer<typeof instanceAiApprovalModeSchema>;

/** A user's approval mode, as `GET` and `PUT /assistant/preferences` return it. */
export const instanceAiApprovalPreferencesSchema = z.object({
	/** The mode that applies to this user's next run. Always `manual` when approval modes are off. */
	approvalMode: instanceAiApprovalModeSchema,
	/** Whether the user can choose an approval mode. */
	approvalModesAvailable: z.boolean(),
});
export type InstanceAiApprovalPreferences = z.infer<typeof instanceAiApprovalPreferencesSchema>;

/** What ran an action without a card in Auto mode: the judge model, or the rule for low-risk actions. */
export const instanceAiAutoApprovalDeciderSchema = z.enum(['judge', 'rule']);
export type InstanceAiAutoApprovalDecider = z.infer<typeof instanceAiAutoApprovalDeciderSchema>;

/** An Ask first action that Auto mode ran without a card. The thread shows it as a collapsed line. */
export const autoApprovalPayloadSchema = z.object({
	toolCallId: z.string(),
	/** What the action does, in the words the card would have used. */
	message: z.string(),
	/** Why the action needed no card. */
	reason: z.string(),
	decidedBy: instanceAiAutoApprovalDeciderSchema,
});
export type InstanceAiAutoApprovalPayload = z.infer<typeof autoApprovalPayloadSchema>;
