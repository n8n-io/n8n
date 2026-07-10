import type { GlobalConfig } from '@n8n/config';
import { type User, type SharedWorkflowRepository, WorkflowEntity } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { Workflow, type INode, type IWorkflowSettings } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { buildInvalidAiToolSourceErrorResponse } from './connection-structure-check';
import { MCP_UPDATE_WORKFLOW_TOOL } from './constants';
import { validateCredentialReferences } from './credential-validation';
import { autoPopulateNodeCredentials } from './credentials-auto-assign';
import { validateDataTableReferencesForUpdate } from './data-table-validation';
import { sanitizeSkillsUsed, SKILLS_USED_PARAM_DESCRIPTION } from './skills-used';
import {
	buildUpdateVersionMetadata,
	resolveVersionMetadata,
	versionDescriptionInputSchema,
	versionNameInputSchema,
} from './version-metadata';
import {
	applyOperations,
	partialUpdateOperationSchema,
	toWorkflowSlice,
	workflowSettingsObjectSchema,
	type PartialUpdateOperation,
} from './workflow-operations';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
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
	'setWorkflowSettings',
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
		settings: combinedSettingsInputSchema
			.optional()
			.describe('For setNodeSettings or setWorkflowSettings.'),
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
	skillsUsed: z.array(z.string()).optional().describe(SKILLS_USED_PARAM_DESCRIPTION),
	operations: z
		.array(operationInputSchema)
		.min(1)
		.max(MAX_OPERATIONS_PER_CALL)
		.describe(
			`Ordered operations to apply atomically (max ${MAX_OPERATIONS_PER_CALL}). If any op fails, nothing is saved.`,
		),
	versionName: versionNameInputSchema.describe(
		'Short summary of what this update changes, shown in the workflow\'s version history (e.g. "Added Slack notification after HTTP request"). Always provide it.',
	),
	versionDescription: versionDescriptionInputSchema.describe(
		'Longer description of what changed and why, shown in the version history alongside the version name.',
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

/**
 * Validates a freshly-set `errorWorkflow` reference. Throws a teaching-oriented
 * error when the target does not exist / is inaccessible, has no active Error
 * Trigger node, or cannot be called by this workflow due to its sub-workflow
 * caller policy — each of which would otherwise silently prevent the error
 * workflow from running on failure. A 'DEFAULT' / cleared value skips the check.
 */
async function assertErrorWorkflowIsUsable({
	errorWorkflowId,
	parentWorkflowId,
	user,
	workflowFinderService,
	workflowPublishedDataService,
	useWorkflowPublicationService,
	nodeTypes,
	subworkflowPolicyChecker,
	errorTriggerType,
}: {
	errorWorkflowId: string | undefined;
	parentWorkflowId: string;
	user: User;
	workflowFinderService: WorkflowFinderService;
	workflowPublishedDataService: WorkflowPublishedDataService;
	useWorkflowPublicationService: boolean;
	nodeTypes: NodeTypes;
	subworkflowPolicyChecker: SubworkflowPolicyChecker;
	errorTriggerType: string;
}): Promise<void> {
	if (!errorWorkflowId || errorWorkflowId === 'DEFAULT') return;

	// Read access is required intentionally, mirroring the editor UI (the error
	// workflow picker only lists workflows the user can read). Resolving the
	// target without an access check would let callers probe arbitrary workflow
	// IDs and learn their name / published / trigger / policy state from the
	// validation errors below. Runtime not requiring read access is separate: it
	// runs the error workflow under the owner project's context, gated by caller
	// policy, which is about execution — not about who may configure the link.
	const errorWorkflow = await workflowFinderService.findWorkflowForUser(
		errorWorkflowId,
		user,
		['workflow:read'],
		// activeVersion is only the published source of truth when the publication
		// service is off; otherwise we read it from the service below.
		{ includeActiveVersion: !useWorkflowPublicationService },
	);
	if (!errorWorkflow) {
		throw new Error(
			`Error workflow '${errorWorkflowId}' was not found or you do not have access to it. Find a valid workflow ID with search_workflows, or create an error-handler workflow first.`,
		);
	}

	// Runtime runs the PUBLISHED version of the error workflow, not its draft, and
	// resolves it differently depending on the publication service flag — mirror
	// WorkflowExecutionService.loadErrorWorkflowData exactly so we neither reject a
	// workflow runtime would run nor accept a version runtime will not use.
	let publishedNodes: INode[] | undefined;
	if (useWorkflowPublicationService) {
		const published = await workflowPublishedDataService.getPublishedWorkflowData(errorWorkflowId);
		publishedNodes = published?.publishedVersion.nodes;
	} else if (errorWorkflow.activeVersionId && errorWorkflow.activeVersion) {
		publishedNodes = errorWorkflow.activeVersion.nodes ?? [];
	}

	if (!publishedNodes) {
		throw new Error(
			`Error workflow '${errorWorkflow.name}' (${errorWorkflowId}) has no published version, so n8n cannot run it when this workflow fails. Publish that workflow first (publish_workflow), then set it as the error workflow.`,
		);
	}

	const hasErrorTrigger = publishedNodes.some(
		(node) => node.type === errorTriggerType && node.disabled !== true,
	);
	if (!hasErrorTrigger) {
		throw new Error(
			`The published version of workflow '${errorWorkflow.name}' (${errorWorkflowId}) has no active Error Trigger node, so it would never run when this workflow fails. Add an Error Trigger node (${errorTriggerType}) and publish it, pick a different error workflow, or create a new error-handler workflow.`,
		);
	}

	// Runtime blocks the error workflow if this workflow may not call it as a
	// sub-workflow (see WorkflowExecutionService.executeErrorWorkflow). The
	// policy checker only reads the target's id + settings, so an empty-node
	// Workflow instance is sufficient.
	const errorWorkflowInstance = new Workflow({
		id: errorWorkflow.id,
		name: errorWorkflow.name,
		nodeTypes,
		nodes: [],
		connections: {},
		active: false,
		settings: errorWorkflow.settings ?? {},
	});
	try {
		await subworkflowPolicyChecker.check(
			errorWorkflowInstance,
			parentWorkflowId,
			undefined,
			user.id,
		);
	} catch (error) {
		if (error instanceof SubworkflowPolicyDenialError) {
			throw new Error(
				`Error workflow '${errorWorkflow.name}' (${errorWorkflowId}) cannot be called by this workflow because of its caller policy, so n8n would block it at runtime. Update that workflow's settings ("This workflow can be called by …") to allow this one — set it to any workflow, or add this workflow to its allowlist — or pick a different error workflow.`,
			);
		}
		throw error;
	}
}

/**
 * When callerPolicy is 'workflowsFromAList', callerIds must list at least one
 * workflow ID — otherwise no workflow can call this one as a sub-workflow.
 * Operates on the effective (merged) settings, so a partial update that sets
 * only one of the two fields is validated against the final state.
 */
function assertCallerPolicyConsistent(settings: IWorkflowSettings | undefined): void {
	if (settings?.callerPolicy !== 'workflowsFromAList') return;

	const callerIds = (settings.callerIds ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id.length > 0);

	if (callerIds.length === 0) {
		throw new Error(
			'callerPolicy "workflowsFromAList" requires callerIds — a comma-separated list of workflow IDs allowed to call this workflow. Without it, no workflow can call this one. Provide callerIds, or choose a different callerPolicy.',
		);
	}
}

/**
 * Reject an executionTimeout that exceeds the instance maximum. The schema
 * already enforces a positive integer; this adds the instance-specific upper
 * bound, which isn't knowable statically. A non-positive `maxTimeout` means the
 * instance sets no cap, so nothing is enforced.
 */
function assertExecutionTimeoutWithinMax(
	executionTimeout: number | undefined,
	maxTimeout: number,
): void {
	// `executionTimeout <= 0` is the "unlimited" sentinel (-1) and is never capped.
	if (executionTimeout === undefined || executionTimeout <= 0 || maxTimeout <= 0) return;

	if (executionTimeout > maxTimeout) {
		throw new Error(
			`executionTimeout (${executionTimeout}s) exceeds this instance's maximum of ${maxTimeout}s. Set executionTimeout to ${maxTimeout} or less.`,
		);
	}
}

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
	subworkflowPolicyChecker: SubworkflowPolicyChecker,
	workflowPublishedDataService: WorkflowPublishedDataService,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
	config: {
		description:
			'Atomically update an existing workflow with operation objects. Edits nodes/connections and also workflow-level settings via setWorkflowSettings — including the error workflow that runs automatically on failure to send alerts (e.g. when a user asks to "add error handling" or "notify me if this breaks"). Pass skillsUsed if n8n skills were used.',
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
		versionName,
		versionDescription,
	}: {
		workflowId: string;
		skillsUsed?: string[];
		operations: OperationInput[];
		versionName?: string;
		versionDescription?: string;
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
				hasVersionName: !!versionName,
				hasVersionDescription: !!versionDescription,
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

			// Validate a freshly-set error workflow so the agent can self-correct in
			// context: the target must exist, be accessible, and contain an Error
			// Trigger node — otherwise it would silently never run on failure.
			const setsErrorWorkflow = strictOperations.some(
				(op) => op.type === 'setWorkflowSettings' && op.settings.errorWorkflow !== undefined,
			);
			if (setsErrorWorkflow) {
				await assertErrorWorkflowIsUsable({
					errorWorkflowId: result.workflow.settings?.errorWorkflow,
					parentWorkflowId: workflowId,
					user,
					workflowFinderService,
					workflowPublishedDataService,
					useWorkflowPublicationService: globalConfig.workflows.useWorkflowPublicationService,
					nodeTypes,
					subworkflowPolicyChecker,
					errorTriggerType: globalConfig.nodes.errorTriggerType,
				});
			}

			// Validate the effective (merged) caller policy, but only when this batch
			// touched it — so a partial edit isn't rejected for pre-existing state, and
			// `callerPolicy` set in one op can be satisfied by `callerIds` already on
			// the workflow (or set in another op of the same batch).
			const setsCallerConfig = strictOperations.some(
				(op) =>
					op.type === 'setWorkflowSettings' &&
					(op.settings.callerPolicy !== undefined || op.settings.callerIds !== undefined),
			);
			if (setsCallerConfig) {
				assertCallerPolicyConsistent(result.workflow.settings);
			}

			const setsExecutionTimeout = strictOperations.some(
				(op) => op.type === 'setWorkflowSettings' && op.settings.executionTimeout !== undefined,
			);
			if (setsExecutionTimeout) {
				assertExecutionTimeoutWithinMax(
					result.workflow.settings?.executionTimeout,
					globalConfig.executions.maxTimeout,
				);
			}

			const hasNonTagOperations = strictOperations.some(
				(op) => op.type !== 'addTags' && op.type !== 'removeTags',
			);

			const hasSettingsOperations = strictOperations.some(
				(op) => op.type === 'setWorkflowSettings',
			);

			// A settings change on a published workflow makes WorkflowService.update
			// reactivate it *after* persisting (activateWorkflow → requires
			// workflow:publish). Without this preflight, a user with edit-but-not-
			// publish access would persist the settings and only then fail activation,
			// breaking this tool's atomicity and leaving the running version stale.
			// A global publish scope already guarantees access, so skip the DB lookup
			// for instance owners/admins (the common MCP case) and only probe when the
			// permission could come from a project/resource role.
			if (
				hasSettingsOperations &&
				existingWorkflow.activeVersionId &&
				!hasGlobalScope(user, 'workflow:publish')
			) {
				const canPublish = await workflowFinderService.findWorkflowHeadForUser(workflowId, user, [
					'workflow:publish',
				]);
				if (!canPublish) {
					throw new Error(
						'Changing settings on a published workflow reactivates it, which requires publish permission. Your account can edit but not publish this workflow. Ask the owner for publish access, or unpublish the workflow first.',
					);
				}
			}

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
				// Only attach settings when a settings op ran, so node-only edits
				// don't re-save (and re-clean) the existing settings object.
				...(hasSettingsOperations ? { settings: result.workflow.settings } : {}),
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
			const validator = new ParseValidateHandler({
				generatePinData: false,
				nodeTypesProvider: nodeTypes,
			});
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

			// Fallback is diff-based; it only ends up persisted when the update
			// actually produces a new history version (node/connection/group changes).
			const versionMetadata = resolveVersionMetadata(
				{ versionName, versionDescription },
				buildUpdateVersionMetadata(
					{ nodes: existingWorkflow.nodes, connections: existingWorkflow.connections },
					{ nodes: workflowUpdateData.nodes, connections: workflowUpdateData.connections },
				),
			);

			const updatedWorkflow = await workflowService.update(user, workflowUpdateData, workflowId, {
				aiBuilderAssisted: hasNonTagOperations,
				source: 'n8n-mcp',
				versionName: versionMetadata.name,
				versionDescription: versionMetadata.description,
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
				settings: hasSettingsOperations ? (updatedWorkflow.settings ?? {}) : undefined,
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
