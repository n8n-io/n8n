import { z } from 'zod';

import { SKILLS_USED_PARAM_DESCRIPTION } from './skills-used';
import { versionDescriptionInputSchema, versionNameInputSchema } from './version-metadata';
import {
	NON_FATAL_OPERATION_TYPES,
	partialUpdateOperationSchema,
	workflowSettingsObjectSchema,
	type PartialUpdateOperation,
} from './workflow-operations';

const MAX_OPERATIONS_PER_CALL = 100;

const baseOperationTypes = [
	'updateNodeParameters',
	'setNodeParameter',
	'addNode',
	'removeNode',
	'renameNode',
	'addConnection',
	'removeConnection',
	'setNodeCredential',
	'setNodePosition',
	'setNodeDisabled',
	'setNodeSettings',
	'setWorkflowMetadata',
	'setWorkflowSettings',
	'addTags',
	'removeTags',
	'setNodeGroups',
] as const;

// Granular group ops roll out behind the `102_mcp_canvas_groups` flag;
// `setNodeGroups` predates the flag and stays ungated.
const gatedGroupOperationTypes = ['addNodeGroup', 'removeNodeGroup', 'updateNodeGroup'] as const;

export const GATED_GROUP_OP_TYPES: ReadonlySet<string> = new Set(gatedGroupOperationTypes);

const buildOperationTypeSchema = (canvasGroupsEnabled: boolean) =>
	canvasGroupsEnabled
		? z.enum([...baseOperationTypes, ...gatedGroupOperationTypes])
		: z.enum(baseOperationTypes);

const positionInputSchema = z.array(z.number()).length(2).describe('Canvas [x, y].');

const credentialsInputSchema = z.record(
	z.string(),
	z.object({ id: z.string().optional(), name: z.string() }),
);

const nodeInputSchema = z.object({
	name: z.string().describe('Unique node name.'),
	type: z.string().describe('Node type, e.g. "n8n-nodes-base.set".'),
	typeVersion: z.number(),
	parameters: z.record(z.string(), z.unknown()).optional(),
	position: positionInputSchema.optional(),
	credentials: credentialsInputSchema.optional(),
	disabled: z.boolean().optional(),
	notes: z.string().optional(),
	id: z.string().optional(),
});

const nodeSettingsInputSchema = z.object({
	onError: z
		.enum(['stopWorkflow', 'continueRegularOutput', 'continueErrorOutput'])
		.optional()
		.describe('Error behavior.'),
	retryOnFail: z.boolean().optional(),
	maxTries: z.number().int().min(2).max(5).optional(),
	waitBetweenTries: z.number().int().min(0).max(5000).optional(),
	alwaysOutputData: z.boolean().optional(),
	executeOnce: z.boolean().optional(),
});

// Published (loose) shape for the `settings` field. It is the superset of the
// node-level keys (setNodeSettings) and workflow-level keys
// (setWorkflowSettings); there is no key overlap. The discriminated union in
// workflow-operations.ts enforces the correct subset per operation type — this
// only governs what the MCP client sees and which keys survive input parsing.
const combinedSettingsInputSchema = z
	.object({
		...nodeSettingsInputSchema.shape,
		...workflowSettingsObjectSchema.shape,
	})
	.describe(
		'Settings to write. For setNodeSettings use the node-level keys (onError, retryOnFail, maxTries, waitBetweenTries, alwaysOutputData, executeOnce). For setWorkflowSettings use the workflow-level keys (errorWorkflow, timezone, executionOrder, saveExecutionProgress, saveManualExecutions, saveDataErrorExecution, saveDataSuccessExecution, executionTimeout, timeSavedPerExecution, callerPolicy, callerIds). Provide only the keys for the operation you are running.',
	);

const buildOperationInputSchema = (canvasGroupsEnabled: boolean) =>
	z
		.object({
			type: buildOperationTypeSchema(canvasGroupsEnabled).describe('Operation type.'),
			nodeName: z.string().optional().describe('For node-targeted ops.'),
			node: nodeInputSchema.optional().describe('For addNode.'),
			parameters: z
				.record(z.string(), z.unknown())
				.optional()
				.describe('For updateNodeParameters.'),
			replace: z.boolean().optional().describe('For updateNodeParameters; default false.'),
			path: z.string().min(2).optional().describe('For setNodeParameter; JSON Pointer path.'),
			value: z.unknown().optional().describe('For setNodeParameter.'),
			oldName: z.string().optional().describe('For renameNode.'),
			newName: z
				.string()
				.optional()
				.describe(canvasGroupsEnabled ? 'For renameNode or updateNodeGroup.' : 'For renameNode.'),
			source: z.string().optional().describe('For connection ops.'),
			target: z.string().optional().describe('For connection ops.'),
			sourceIndex: z
				.number()
				.int()
				.nonnegative()
				.optional()
				.describe('For connection ops; default 0.'),
			targetIndex: z
				.number()
				.int()
				.nonnegative()
				.optional()
				.describe('For connection ops; default 0.'),
			connectionType: z.string().optional().describe('For connection ops; default "main".'),
			credentialKey: z.string().optional().describe('For setNodeCredential.'),
			credentialId: z.string().optional().describe('For setNodeCredential.'),
			credentialName: z.string().optional().describe('For setNodeCredential.'),
			position: positionInputSchema.optional().describe('For setNodePosition.'),
			disabled: z.boolean().optional().describe('For setNodeDisabled.'),
			settings: combinedSettingsInputSchema
				.optional()
				.describe('For setNodeSettings or setWorkflowSettings.'),
			name: z
				.string()
				.max(128)
				.optional()
				.describe(
					canvasGroupsEnabled
						? 'For setWorkflowMetadata (workflow name) or addNodeGroup (group name).'
						: 'Only used for setWorkflowMetadata.',
				),
			description: z
				.string()
				.max(255)
				.optional()
				.describe(
					canvasGroupsEnabled
						? 'For setWorkflowMetadata, addNodeGroup, or updateNodeGroup.'
						: 'Only used for setWorkflowMetadata.',
				),
			names: z.array(z.string()).optional().describe('For addTags / removeTags.'),
			nodeGroups: z
				.array(
					z.object({
						id: z.string().optional(),
						name: z.string(),
						nodeNames: z.array(z.string()),
						description: z.string().optional(),
					}),
				)
				.optional()
				.describe(
					'For setNodeGroups. Replaces all node groups; pass [] to clear. Group members are node names, not ids.',
				),
			...(canvasGroupsEnabled
				? {
						groupName: z.string().optional().describe('For removeNodeGroup / updateNodeGroup.'),
						nodeNames: z
							.array(z.string())
							.optional()
							.describe('For addNodeGroup / updateNodeGroup; group member node names.'),
						id: z.string().optional().describe('For addNodeGroup; group id, generated if omitted.'),
					}
				: {}),
		})
		.describe('Workflow update operation. Provide fields matching type.');

export type OperationInput = {
	type: (typeof baseOperationTypes)[number] | (typeof gatedGroupOperationTypes)[number];
	[key: string]: unknown;
};

const strictOperationsSchema = z.array(partialUpdateOperationSchema);

export function parseStrictOperations(operations: OperationInput[]): PartialUpdateOperation[] {
	const parsed = strictOperationsSchema.safeParse(operations);
	if (parsed.success) return parsed.data;

	const details = parsed.error.issues
		.map(({ path, message }) => {
			const [index, ...rest] = path;
			if (typeof index === 'number') {
				return `operation ${index}${rest.length ? `.${rest.join('.')}` : ''}: ${message}`;
			}
			return `${path.length ? path.join('.') : 'operations'}: ${message}`;
		})
		.join('; ');

	throw new Error(`Invalid operations: ${details}`);
}

const NON_FATAL_OPERATION_TYPES_LIST = [...NON_FATAL_OPERATION_TYPES].join(', ');

export const buildToolDescription = (canvasGroupsEnabled: boolean) => {
	const base =
		'Atomically update an existing workflow with operation objects. Edits nodes/connections and also workflow-level settings via setWorkflowSettings — including the error workflow that runs automatically on failure to send alerts (e.g. when a user asks to "add error handling" or "notify me if this breaks"). Pass skillsUsed if n8n skills were used.';
	return canvasGroupsEnabled
		? `${base} Node-group operations (${NON_FATAL_OPERATION_TYPES_LIST}) are the one exception to "atomically": an invalid one is skipped and reported in skippedOperations instead of aborting the whole update. Separately, if other edits in the batch make an existing group invalid, that group is removed and reported in removedGroups.`
		: base;
};

// The concrete return type (not a widened z.ZodRawShape) keeps the tool's
// generic coupled to the real schema shape, so the handler's argument
// annotation is compile-checked against it via ToolCallback's parameter types.
export const buildInputSchema = (canvasGroupsEnabled: boolean) =>
	({
		workflowId: z.string().describe('The ID of the workflow to update.'),
		skillsUsed: z.array(z.string()).optional().describe(SKILLS_USED_PARAM_DESCRIPTION),
		operations: z
			.array(buildOperationInputSchema(canvasGroupsEnabled))
			.min(1)
			.max(MAX_OPERATIONS_PER_CALL)
			.describe(
				canvasGroupsEnabled
					? `Ordered operations to apply atomically (max ${MAX_OPERATIONS_PER_CALL}). If any op fails, nothing is saved — except node-group operations (${NON_FATAL_OPERATION_TYPES_LIST}): an invalid one is skipped and reported in skippedOperations, while the rest of the batch still saves. An existing group that these ops leave invalid is removed and reported in removedGroups.`
					: `Ordered operations to apply atomically (max ${MAX_OPERATIONS_PER_CALL}). If any op fails, nothing is saved.`,
			),
		versionName: versionNameInputSchema.describe(
			'Short summary of what this update changes, shown in the workflow\'s version history (e.g. "Added Slack notification after HTTP request"). Always provide it.',
		),
		versionDescription: versionDescriptionInputSchema.describe(
			'Longer description of what changed and why, shown in the version history alongside the version name.',
		),
	}) satisfies z.ZodRawShape;

// The MCP SDK publishes this schema with `additionalProperties: false` and
// validates `structuredContent` against it on every response. Success returns
// the full payload below; the error path returns only `{ error }`. To keep
// both shapes valid under strict clients, the success fields are optional and
// `error` is a declared, optional property — otherwise a thrown handler error
// surfaces as an opaque `-32602` schema mismatch instead of the real message.
export const outputSchema = {
	workflowId: z.string().optional(),
	name: z.string().optional(),
	nodeCount: z.number().optional(),
	url: z.string().optional(),
	appliedOperations: z
		.number()
		.optional()
		.describe(
			'Number of submitted operations that were applied. See skippedOperations for any that were not.',
		),
	autoAssignedCredentials: z
		.array(
			z.object({
				nodeName: z.string(),
				credentialName: z.string(),
				credentialType: z.string(),
				source: z.enum(['user', 'aiGateway']).optional(),
			}),
		)
		.optional()
		.describe('Credentials auto-assigned to nodes that were added in this update.'),
	validationWarnings: z
		.array(
			z.object({
				code: z.string(),
				message: z.string(),
				nodeName: z.string().optional(),
				preExisting: z
					.boolean()
					.optional()
					.describe(
						'True when the same warning already existed before this update — it was not caused by these operations.',
					),
			}),
		)
		.optional()
		.describe(
			'Graph and JSON validation warnings on the resulting workflow. Warnings marked preExisting (also tagged [pre-existing] in the message) were already present before this update; only self-correct the rest on the next call.',
		),
	note: z.string().optional(),
	skippedOperations: z
		.array(
			z.object({
				opIndex: z.number(),
				type: z.string(),
				reason: z.string(),
			}),
		)
		.optional()
		.describe(
			'Submitted group operations that did not take effect: either invalid, or their group broke the group rules.',
		),
	removedGroups: z
		.array(
			z.object({
				groupName: z.string(),
				reason: z.string(),
			}),
		)
		.optional(),
	settings: z
		.record(z.string(), z.unknown())
		.optional()
		.describe(
			'Resulting workflow-level settings after the update. Present only when a setWorkflowSettings operation ran. Reflects server-side cleanup (e.g. "DEFAULT" values are removed).',
		),
	error: z
		.string()
		.optional()
		.describe('Error message explaining why the update failed. Present only on failure.'),
} satisfies z.ZodRawShape;
