import type { GlobalConfig } from '@n8n/config';
import { type User, type SharedWorkflowRepository, WorkflowEntity } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { buildInvalidAiToolSourceErrorResponse } from './connection-structure-check';
import { MCP_UPDATE_WORKFLOW_TOOL } from './constants';
import { validateCredentialReferences } from './credential-validation';
import { autoPopulateNodeCredentials } from './credentials-auto-assign';
import { validateDataTableReferencesForUpdate } from './data-table-validation';
import { sanitizeSkillsUsed } from './skills-used';
import {
	applyOperations,
	partialUpdateOperationSchema,
	toWorkflowSlice,
	type PartialUpdateOperation,
} from './workflow-operations';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { NodeTypes } from '@/node-types';
import type { TagService } from '@/services/tag.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import { resolveNodeWebhookIds } from '@/workflow-helpers';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { getMcpWorkflow } from '../workflow-validation.utils';

const MAX_OPERATIONS_PER_CALL = 100;

const operationTypeSchema = z.enum([
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
	'addTags',
	'removeTags',
	'setNodeGroups',
]);

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

const operationInputSchema = z
	.object({
		type: operationTypeSchema.describe('Operation type.'),
		nodeName: z.string().optional().describe('For node-targeted ops.'),
		node: nodeInputSchema.optional().describe('For addNode.'),
		parameters: z.record(z.string(), z.unknown()).optional().describe('For updateNodeParameters.'),
		replace: z.boolean().optional().describe('For updateNodeParameters; default false.'),
		path: z.string().min(2).optional().describe('For setNodeParameter; JSON Pointer path.'),
		value: z.unknown().optional().describe('For setNodeParameter.'),
		oldName: z.string().optional().describe('For renameNode.'),
		newName: z.string().optional().describe('For renameNode.'),
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
		settings: nodeSettingsInputSchema.optional().describe('For setNodeSettings.'),
		name: z.string().max(128).optional().describe('Only used for setWorkflowMetadata.'),
		description: z.string().max(255).optional().describe('Only used for setWorkflowMetadata.'),
		names: z.array(z.string()).optional().describe('For addTags / removeTags.'),
		nodeGroups: z
			.array(
				z.object({
					id: z.string().optional(),
					name: z.string(),
					nodeIds: z.array(z.string()),
				}),
			)
			.optional()
			.describe('For setNodeGroups. Replaces all node groups; pass [] to clear.'),
	})
	.describe('Workflow update operation. Provide fields matching type.');

type OperationInput = { type: z.infer<typeof operationTypeSchema>; [key: string]: unknown };

const strictOperationsSchema = z.array(partialUpdateOperationSchema);

function parseStrictOperations(operations: OperationInput[]): PartialUpdateOperation[] {
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

// Renames are followed so the key matches the node's name in the post-apply
// workflow.
function collectTouchedNodes(operations: PartialUpdateOperation[]): Map<string, number> {
	const touched = new Map<string, number>();
	const recordTouch = (name: string, opIndex: number) => {
		if (!touched.has(name)) touched.set(name, opIndex);
	};

	for (let i = 0; i < operations.length; i++) {
		const op = operations[i];
		if (op.type === 'addNode') {
			recordTouch(op.node.name, i);
		} else if (op.type === 'updateNodeParameters' || op.type === 'setNodeParameter') {
			recordTouch(op.nodeName, i);
		} else if (op.type === 'renameNode') {
			const idx = touched.get(op.oldName);
			if (idx !== undefined) {
				touched.delete(op.oldName);
				touched.set(op.newName, idx);
			}
		} else if (op.type === 'removeNode') {
			touched.delete(op.nodeName);
		}
	}

	return touched;
}

const inputSchema: z.ZodRawShape = {
	workflowId: z.string().describe('The ID of the workflow to update.'),
	skillsUsed: z
		.array(z.string())
		.optional()
		.describe('n8n skill IDs used for this update; normalized server-side.'),
	operations: z
		.array(operationInputSchema)
		.min(1)
		.max(MAX_OPERATIONS_PER_CALL)
		.describe(
			`Ordered operations to apply atomically (max ${MAX_OPERATIONS_PER_CALL}). If any op fails, nothing is saved.`,
		),
};

// The MCP SDK publishes this schema with `additionalProperties: false` and
// validates `structuredContent` against it on every response. Success returns
// the full payload below; the error path returns only `{ error }`. To keep
// both shapes valid under strict clients, the success fields are optional and
// `error` is a declared, optional property — otherwise a thrown handler error
// surfaces as an opaque `-32602` schema mismatch instead of the real message.
const outputSchema = {
	workflowId: z.string().optional(),
	name: z.string().optional(),
	nodeCount: z.number().optional(),
	url: z.string().optional(),
	appliedOperations: z.number().optional().describe('Number of operations applied.'),
	autoAssignedCredentials: z
		.array(
			z.object({
				nodeName: z.string(),
				credentialName: z.string(),
				credentialType: z.string(),
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
			}),
		)
		.optional()
		.describe(
			'Graph and JSON validation warnings on the resulting workflow. Use these to self-correct on the next call.',
		),
	note: z.string().optional(),
	error: z
		.string()
		.optional()
		.describe('Error message explaining why the update failed. Present only on failure.'),
} satisfies z.ZodRawShape;

/**
 * MCP tool that updates a workflow by applying a small list of named operations
 * (addNode, removeNode, updateNodeParameters, addConnection, …) directly to the
 * stored JSON. The agent emits a tiny diff per call instead of re-sending the
 * full SDK code, which keeps output-token cost roughly constant per edit.
 *
 * Graph + JSON validation runs on the resulting workflow before save, so the
 * end-state safety net matches the create-from-code path; only the
 * TS-code → JSON parse step is skipped.
 */
export const createUpdateWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowService: WorkflowService,
	urlService: UrlService,
	telemetry: Telemetry,
	nodeTypes: NodeTypes,
	credentialsService: CredentialsService,
	sharedWorkflowRepository: SharedWorkflowRepository,
	collaborationService: CollaborationService,
	dataTableOps: DataTableUserOperations,
	tagService: TagService,
	globalConfig: GlobalConfig,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
	config: {
		description:
			'Atomically update an existing workflow with operation objects. Pass skillsUsed if n8n skills were used.',
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_UPDATE_WORKFLOW_TOOL.displayTitle,
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		workflowId,
		skillsUsed,
		operations,
	}: {
		workflowId: string;
		skillsUsed?: string[];
		operations: OperationInput[];
	}) => {
		const sanitizedSkillsUsed = sanitizeSkillsUsed(skillsUsed);
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
			parameters: {
				workflowId,
				...(sanitizedSkillsUsed !== undefined ? { skillsUsed: sanitizedSkillsUsed } : {}),
				opCount: operations.length,
				opTypes: operations.map((op) => op.type),
			},
		};

		try {
			const strictOperations = parseStrictOperations(operations);

			const hasTagOperations = strictOperations.some(
				(op) => op.type === 'addTags' || op.type === 'removeTags',
			);

			if (hasTagOperations && globalConfig.tags.disabled) {
				throw new Error(
					'Tag operations are not supported on this instance because tags are disabled.',
				);
			}

			const existingWorkflow = await getMcpWorkflow(
				workflowId,
				user,
				['workflow:update'],
				workflowFinderService,
				{ includeTags: hasTagOperations },
			);

			await collaborationService.ensureWorkflowEditable(existingWorkflow.id);

			const result = applyOperations(
				toWorkflowSlice(existingWorkflow, { includeTags: hasTagOperations }),
				strictOperations,
			);

			if (!result.success) {
				throw new Error(result.error);
			}

			const credentialCheck = await validateCredentialReferences(
				strictOperations,
				existingWorkflow,
				user,
				credentialsService,
				nodeTypes,
				{ workflowId: existingWorkflow.id },
			);
			if (!credentialCheck.ok) {
				throw new Error(credentialCheck.error);
			}

			const invalidToolSourceResponse = buildInvalidAiToolSourceErrorResponse(
				{ nodes: result.workflow.nodes, connections: result.workflow.connections },
				nodeTypes,
				(errorMessage) => ({ error: errorMessage }),
				telemetryPayload,
				telemetry,
			);
			if (invalidToolSourceResponse) return invalidToolSourceResponse;

			const { projectId: workflowProjectId } = await sharedWorkflowRepository.findOneOrFail({
				where: { workflowId, role: 'workflow:owner' },
				select: ['projectId'],
			});

			const dataTableCheck = await validateDataTableReferencesForUpdate(
				result.workflow.nodes,
				collectTouchedNodes(strictOperations),
				workflowProjectId,
				dataTableOps,
			);
			if (!dataTableCheck.ok) {
				throw new Error(dataTableCheck.error);
			}

			const hasNonTagOperations = strictOperations.some(
				(op) => op.type !== 'addTags' && op.type !== 'removeTags',
			);

			// Only persist nodeGroups when a setNodeGroups op ran; otherwise omit the key so
			// WorkflowService preserves the existing groups (preserve-on-omit).
			const hasNodeGroupOperation = strictOperations.some((op) => op.type === 'setNodeGroups');

			const workflowUpdateData = new WorkflowEntity();
			Object.assign(workflowUpdateData, {
				name: result.workflow.name,
				...(result.workflow.description !== undefined
					? { description: result.workflow.description }
					: {}),
				nodes: result.workflow.nodes,
				connections: result.workflow.connections,
				...(hasNodeGroupOperation ? { nodeGroups: result.workflow.nodeGroups } : {}),
				meta: hasNonTagOperations
					? {
							...(existingWorkflow.meta ?? {}),
							aiBuilderAssisted: true,
							builderVariant: 'mcp',
						}
					: (existingWorkflow.meta ?? {}),
			});

			resolveNodeWebhookIds(workflowUpdateData, nodeTypes);

			let credentialAssignments: Array<{
				nodeName: string;
				credentialName: string;
				credentialType: string;
			}> = [];
			let skippedHttpNodes: string[] = [];

			if (result.addedNodeNames.length > 0) {
				const addedNodeSet = new Set(result.addedNodeNames);
				const addedNodes = workflowUpdateData.nodes.filter((n) => addedNodeSet.has(n.name));

				const autoAssign = await autoPopulateNodeCredentials(
					{ ...workflowUpdateData, nodes: addedNodes },
					user,
					nodeTypes,
					credentialsService,
					workflowProjectId,
				);
				credentialAssignments = autoAssign.assignments;
				skippedHttpNodes = autoAssign.skippedHttpNodes;
			}

			const { ParseValidateHandler } = await import('@n8n/ai-workflow-builder');
			const validator = new ParseValidateHandler({ generatePinData: false });
			const validationWarnings = validator.validateJSON({
				name: workflowUpdateData.name,
				nodes: workflowUpdateData.nodes,
				connections: workflowUpdateData.connections,
			} as unknown as WorkflowJSON);

			let tagIds: string[] | undefined;
			if (result.tagNames !== undefined) {
				if (hasGlobalScope(user, 'tag:create')) {
					const resolvedTags = await tagService.findOrCreateByNames(result.tagNames);
					tagIds = resolvedTags.map((t) => t.id);
				} else {
					const resolvedTags = await tagService.findByNames(result.tagNames);
					const resolvedNames = new Set(resolvedTags.map((t) => t.name));
					const missing = result.tagNames
						.map((n) => n.trim())
						.filter((name) => name.length > 0 && !resolvedNames.has(name));
					if (missing.length > 0) {
						throw new Error(
							`Cannot apply the following tags because they don't exist and your account does not have permission to create them: ${missing.join(', ')}`,
						);
					}
					tagIds = resolvedTags.map((t) => t.id);
				}
			}

			const updatedWorkflow = await workflowService.update(user, workflowUpdateData, workflowId, {
				aiBuilderAssisted: hasNonTagOperations,
				source: 'n8n-mcp',
				...(tagIds !== undefined ? { tagIds } : {}),
			});

			void collaborationService.broadcastWorkflowUpdate(workflowId, user.id).catch(() => {});

			const baseUrl = urlService.getInstanceBaseUrl();
			const workflowUrl = `${baseUrl}/workflow/${updatedWorkflow.id}`;

			telemetryPayload.results = {
				success: true,
				data: {
					workflowId: updatedWorkflow.id,
					nodeCount: updatedWorkflow.nodes.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = {
				workflowId: updatedWorkflow.id,
				name: updatedWorkflow.name,
				nodeCount: updatedWorkflow.nodes.length,
				url: workflowUrl,
				appliedOperations: strictOperations.length,
				autoAssignedCredentials: credentialAssignments,
				validationWarnings,
				note: skippedHttpNodes.length
					? `HTTP Request nodes (${skippedHttpNodes.join(', ')}) were skipped during credential auto-assignment. Their credentials must be configured manually.`
					: undefined,
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { error: errorMessage };

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
