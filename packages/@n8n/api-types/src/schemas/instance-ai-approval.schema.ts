import { z } from 'zod';

import type { DataTableWriteToolAction } from '../builder-tool-names';
import type { InstanceAiConfirmationSeverity } from './instance-ai.schema';

/** Severity of each data table change. A batch card takes the highest severity of its changes. */
export const DATA_TABLE_CHANGE_SEVERITY = {
	create: 'info',
	delete: 'destructive',
	'add-column': 'warning',
	'delete-column': 'destructive',
	'rename-column': 'warning',
	'insert-rows': 'warning',
	'update-rows': 'warning',
	'delete-rows': 'destructive',
} as const satisfies Record<DataTableWriteToolAction, InstanceAiConfirmationSeverity>;

/**
 * Whether approving a data table change for the session grants the action for
 * the rest of the thread. Destructive actions always ask again.
 */
export function isSessionGrantableDataTableAction(action: DataTableWriteToolAction): boolean {
	return DATA_TABLE_CHANGE_SEVERITY[action] !== 'destructive';
}

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

const columnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

/**
 * Something a published agent might really send or do once it is live. Names come from
 * the agent's config. Tools are counted, not listed, because a tool's name alone does not
 * say what it sends.
 */
export const agentPublishSendTargetSchema = z.discriminatedUnion('kind', [
	/** A chat channel the agent replies in, such as Slack. */
	z.object({ kind: z.literal('channel'), name: z.string() }),
	/** A scheduled task that starts running. */
	z.object({ kind: z.literal('task'), name: z.string() }),
	/** An MCP server whose tools the agent can call. */
	z.object({ kind: z.literal('mcp-server'), name: z.string() }),
	/** The agent's own tools. */
	z.object({ kind: z.literal('tools'), count: z.number().int().positive() }),
]);

export type AgentPublishSendTarget = z.infer<typeof agentPublishSendTargetSchema>;

/** The most send targets an approval lists. The rest show as a count. */
export const AGENT_PUBLISH_SEND_TARGETS_LIMIT = 20;

const deleteTableDetails = z.object({ action: z.literal('delete-table') });
const addColumnDetails = z.object({
	action: z.literal('add-column'),
	column: z.string(),
	columnType: columnTypeSchema,
});
const deleteColumnDetails = z.object({ action: z.literal('delete-column'), column: z.string() });
const renameColumnDetails = z.object({
	action: z.literal('rename-column'),
	column: z.string(),
	newName: z.string(),
});
const insertRowsDetails = z.object({
	action: z.literal('insert-rows'),
	count: z.number().int().nonnegative(),
	rows: z.array(rowPreviewSchema),
});
const updateRowsDetails = z.object({
	action: z.literal('update-rows'),
	changes: rowPreviewSchema,
	filter: filterPreviewSchema,
});
const deleteRowsDetails = z.object({
	action: z.literal('delete-rows'),
	filter: filterPreviewSchema,
});

/** Variants shared by single-action cards and batch items. Add a new one here only. */
const dataTableDetailsVariants = [
	deleteTableDetails,
	addColumnDetails,
	deleteColumnDetails,
	renameColumnDetails,
	insertRowsDetails,
	updateRowsDetails,
	deleteRowsDetails,
] as const;

/** One change in a `data-table-changes` batch. Only a batch shows table creation. */
const dataTableChangeDetailsSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('create-table'),
		columns: z.array(z.object({ name: z.string(), columnType: columnTypeSchema })),
	}),
	...dataTableDetailsVariants,
]);

export type InstanceAiDataTableChangeDetails = z.infer<typeof dataTableChangeDetailsSchema>;

export const instanceAiApprovalDetailsSchema = z.discriminatedUnion('action', [
	z.object({ action: z.literal('edit-workflow'), summary: z.string().optional() }),
	...dataTableDetailsVariants,
	z.object({
		action: z.literal('data-table-changes'),
		changes: z
			.array(
				z.object({
					tableName: z.string(),
					/** Groups the changes of one table. Two tables can share a name. */
					tableKey: z.string(),
					details: dataTableChangeDetailsSchema,
				}),
			)
			.min(1),
	}),
	z.object({ action: z.literal('archive-workflow'), name: z.string(), id: z.string() }),
	z.object({ action: z.literal('archive-agent'), name: z.string(), id: z.string() }),
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
		action: z.literal('publish-agent'),
		/**
		 * What going live changes: `unpublished` publishes for the first time, `changed`
		 * replaces the live version. A version that is already live needs no card.
		 */
		liveAvailability: z.enum(['unpublished', 'changed']),
		/** True when a history version goes live instead of the draft. */
		selectedVersion: z.boolean(),
		/** Empty when the agent can send nothing. The card then says that anything it sends is real. */
		sendTargets: z.array(agentPublishSendTargetSchema).max(AGENT_PUBLISH_SEND_TARGETS_LIMIT),
		/** Send targets left out of `sendTargets` by the limit. */
		moreSendTargets: z.number().int().nonnegative().optional(),
		/** True when the agent changed after an earlier card, so this card replaces it. */
		changedSinceAsked: z.boolean().optional(),
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

/**
 * Why Auto mode showed the approval card and did not run the action. The judge
 * writes `text` in the language of the user. Each other kind is a fixed cause,
 * and the editor has the text for it.
 */
export const instanceAiApprovalAskReasonSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('judge'), text: z.string() }),
	/** The action is one that a person always confirms. */
	z.object({ kind: z.literal('always-ask') }),
	/** The call is too long for the judge to read in full. */
	z.object({ kind: z.literal('too-long') }),
	/** The judge gave no answer. */
	z.object({ kind: z.literal('judge-failed') }),
]);
export type InstanceAiApprovalAskReason = z.infer<typeof instanceAiApprovalAskReasonSchema>;
