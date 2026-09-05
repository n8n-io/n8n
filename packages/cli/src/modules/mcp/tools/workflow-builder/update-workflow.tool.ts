import type { ValidationWarning } from '@n8n/ai-workflow-builder';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { type User, type SharedWorkflowRepository, WorkflowEntity } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import isEqual from 'lodash/isEqual';
import { Workflow, type INode, type IWorkflowSettings } from 'n8n-workflow';
import { z } from 'zod';

import { buildInvalidAiToolSourceErrorResponse } from './connection-structure-check';
import { MCP_UPDATE_WORKFLOW_TOOL } from './constants';
import { validateCredentialReferences } from './credential-validation';
import {
	autoPopulateNodeCredentials,
	trackAutoassignOutcomes,
	type AutoAssignResult,
} from './credentials-auto-assign';
import { validateDataTableReferencesForUpdate } from './data-table-validation';
import { getErrorCode } from './error-code.utils';
import { sanitizeSkillsUsed, SKILLS_USED_PARAM_DESCRIPTION } from './skills-used';
import {
	buildUpdateVersionMetadata,
	resolveVersionMetadata,
	versionDescriptionInputSchema,
	versionNameInputSchema,
} from './version-metadata';

import {
	applyOperations,
	NON_FATAL_OPERATION_TYPES,
	partialUpdateOperationSchema,
	toWorkflowSlice,
	workflowSettingsObjectSchema,
	type ApplyOperationsSuccess,
	type PartialUpdateOperation,
	type SkippedOperation,
} from './workflow-operations';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { getMcpWorkflow } from '../workflow-validation.utils';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { McpPostSaveMetricsService } from '@/modules/mcp/mcp-post-save-metrics.service';
import type { NodeTypes } from '@/node-types';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { TagService } from '@/services/tag.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import {
	dropInvalidWorkflowGroups,
	makeGetNodeTypeForGrouping,
	removeDefaultValues,
	resolveNodeWebhookIds,
} from '@/workflow-helpers';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import type { WorkflowService } from '@/workflows/workflow.service';

const MAX_OPERATIONS_PER_CALL = 100;
const normalize = (value: unknown) => JSON.parse(JSON.stringify(value ?? null));
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
] as const satisfies ReadonlyArray<PartialUpdateOperation['type']>;
// Granular group ops roll out behind the `102_mcp_canvas_groups` flag;
// `setNodeGroups` predates the flag and stays ungated.
const gatedGroupOperationTypes = [
	'addNodeGroup',
	'removeNodeGroup',
	'updateNodeGroup',
] as const satisfies ReadonlyArray<PartialUpdateOperation['type']>;
// The `satisfies` on both tuples above is what catches a renamed operation type
// in workflow-operations.ts at compile time, instead of silently leaving the gate
// unmatched or an implemented operation unreachable. The set element type is
// narrowed to match so `.has()` only accepts a real operation type.
const GATED_GROUP_OP_TYPES: ReadonlySet<PartialUpdateOperation['type']> = new Set(
	gatedGroupOperationTypes,
);
const GRAPH_OPERATION_TYPES: ReadonlySet<PartialUpdateOperation['type']> = new Set([
	'addNode',
	'removeNode',
	'renameNode',
	'updateNodeParameters',
	'setNodeParameter',
	'addConnection',
	'removeConnection',
	'setNodeCredential',
	'setNodePosition',
	'setNodeDisabled',
	'setNodeGroups',
	'addNodeGroup',
	'removeNodeGroup',
	'updateNodeGroup',
	'setNodeSettings',
]);
const buildOperationTypeSchema = (canvasGroupsEnabled: boolean) =>
	canvasGroupsEnabled
		? z.enum([...baseOperationTypes, ...gatedGroupOperationTypes])
		: z.enum(baseOperationTypes);
// A factory, not a shared instance: reusing one Zod instance across two
// properties makes the JSON Schema generator dedupe the second occurrence into
// a `$ref` to a `#/properties/...` path, which strict MCP clients cannot
// resolve. Mirrors `positionSchema` in workflow-operations.ts.
const positionInputSchema = () => z.array(z.number()).length(2).describe('Canvas [x, y].');
const credentialsInputSchema = z.record(
	z.string(),
	z.object({ id: z.string().optional(), name: z.string() }),
);
const nodeInputSchema = z.object({
	name: z.string().describe('Unique node name.'),
	type: z.string().describe('Node type, e.g. "n8n-nodes-base.set".'),
	typeVersion: z.number(),
	parameters: z.record(z.string(), z.unknown()).optional(),
	position: positionInputSchema().optional(),
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
			position: positionInputSchema().optional().describe('For setNodePosition.'),
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
type OperationInput = {
	type: (typeof baseOperationTypes)[number] | (typeof gatedGroupOperationTypes)[number];
	[key: string]: unknown;
};
const strictOperationsSchema = z.array(partialUpdateOperationSchema);
function parseStrictOperations(operations: OperationInput[]): PartialUpdateOperation[] {
	const parsed = strictOperationsSchema.safeParse(operations);
	if (parsed.success) {
		return parsed.data;
	}
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
const buildToolDescription = (canvasGroupsEnabled: boolean) => {
	const base =
		'Atomically update an existing workflow with operation objects. Edits nodes/connections and also workflow-level settings via setWorkflowSettings — including the error workflow that runs automatically on failure to send alerts (e.g. when a user asks to "add error handling" or "notify me if this breaks"). Pass skillsUsed if n8n skills were used.';
	return canvasGroupsEnabled
		? `${base} Node-group operations (${NON_FATAL_OPERATION_TYPES_LIST}) are the one exception to "atomically": an invalid one is skipped and reported in skippedOperations instead of aborting the whole update. Separately, if other edits in the batch make an existing group invalid, that group is removed and reported in removedGroups.`
		: base;
};
// The concrete return type (not a widened z.ZodRawShape) keeps the tool's
// generic coupled to the real schema shape, so the handler's argument
// annotation is compile-checked against it via ToolHandler's parameter types.
const buildInputSchema = (canvasGroupsEnabled: boolean) =>
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
const outputSchema = {
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
	errorCode: z.string().optional().describe('Machine-readable error code.'),
	note: z.string().optional(),
} satisfies z.ZodRawShape;
/**
 * The success payload, derived from `outputSchema` so the handler cannot build a
 * field the published schema does not declare. That matters because the MCP SDK
 * validates `structuredContent` against the schema on every response, so an
 * undeclared field turns a successful update into an opaque `-32602`.
 */
type UpdateWorkflowOutput = z.infer<z.ZodObject<typeof outputSchema>>;

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
	if (!errorWorkflowId || errorWorkflowId === 'DEFAULT') {
		return;
	}

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
	if (settings?.callerPolicy !== 'workflowsFromAList') {
		return;
	}

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
	if (executionTimeout === undefined || executionTimeout <= 0 || maxTimeout <= 0) {
		return;
	}

	if (executionTimeout > maxTimeout) {
		throw new Error(
			`executionTimeout (${executionTimeout}s) exceeds this instance's maximum of ${maxTimeout}s. Set executionTimeout to ${maxTimeout} or less.`,
		);
	}
}

/**
 * The dependencies these guards need. Separated from the per-call data so a call site
 * shows what is being validated, not the plumbing it takes to validate it. Note
 * the leaf guards above still take primitives rather than `globalConfig` — this
 * type is the boundary where that unpacking happens, not a licence to pass config
 * around.
 */
type WorkflowSettingsGuardDependencies = {
	user: User;
	nodeTypes: NodeTypes;
	globalConfig: GlobalConfig;
	workflowFinderService: WorkflowFinderService;
	workflowPublishedDataService: WorkflowPublishedDataService;
	subworkflowPolicyChecker: SubworkflowPolicyChecker;
};

/**
 * Runs the workflow-level settings validations that only apply when this batch
 * actually touched the setting in question — so a partial edit isn't rejected
 * for pre-existing state, and a value set in one operation can be satisfied by
 * another operation of the same batch (or by what is already on the workflow).
 *
 * Takes the effective (post-apply) settings, and throws on the first violation.
 * Check order is part of the contract: error workflow, then caller policy, then
 * execution timeout.
 */
async function assertWorkflowSettingsValid(
	{
		strictOperations,
		settings,
		workflowId,
	}: {
		strictOperations: PartialUpdateOperation[];
		settings: IWorkflowSettings | undefined;
		workflowId: string;
	},
	{
		user,
		nodeTypes,
		globalConfig,
		workflowFinderService,
		workflowPublishedDataService,
		subworkflowPolicyChecker,
	}: WorkflowSettingsGuardDependencies,
): Promise<void> {
	// Validate a freshly-set error workflow so the agent can self-correct in
	// context: the target must exist, be accessible, and contain an Error
	// Trigger node — otherwise it would silently never run on failure.
	const setsErrorWorkflow = strictOperations.some(
		(op) => op.type === 'setWorkflowSettings' && op.settings.errorWorkflow !== undefined,
	);

	if (setsErrorWorkflow) {
		await assertErrorWorkflowIsUsable({
			errorWorkflowId: settings?.errorWorkflow,
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
		assertCallerPolicyConsistent(settings);
	}

	const setsExecutionTimeout = strictOperations.some(
		(op) => op.type === 'setWorkflowSettings' && op.settings.executionTimeout !== undefined,
	);

	if (setsExecutionTimeout) {
		assertExecutionTimeoutWithinMax(settings?.executionTimeout, globalConfig.executions.maxTimeout);
	}
}

/**
 * A settings change on a published workflow makes WorkflowService.update
 * reactivate it *after* persisting (activateWorkflow → requires
 * workflow:publish). Without this preflight, a user with edit-but-not-publish
 * access would persist the settings and only then fail activation, breaking the
 * update tool's atomicity and leaving the running version stale.
 *
 * The guards below must stay ahead of the `await`: a global publish scope
 * already guarantees access, so instance owners/admins (the common MCP case)
 * and every node-only edit skip the DB lookup entirely, and we only probe when
 * the permission could come from a project/resource role.
 */
async function assertPublishAllowedForSettingsChange(
	{
		hasSettingsOperations,
		activeVersionId,
		workflowId,
	}: {
		hasSettingsOperations: boolean;
		activeVersionId: string | null | undefined;
		workflowId: string;
	},
	{
		user,
		workflowFinderService,
	}: Pick<WorkflowSettingsGuardDependencies, 'user' | 'workflowFinderService'>,
): Promise<void> {
	if (!hasSettingsOperations) {
		return;
	}

	if (!activeVersionId) {
		return;
	}

	if (hasGlobalScope(user, 'workflow:publish')) {
		return;
	}

	const canPublish = await workflowFinderService.findWorkflowHeadForUser(workflowId, user, [
		'workflow:publish',
	]);

	if (!canPublish) {
		throw new Error(
			'Changing settings on a published workflow reactivates it, which requires publish permission. Your account can edit but not publish this workflow. Ask the owner for publish access, or unpublish the workflow first.',
		);
	}
}

// LLM-supplied tag batches routinely repeat a name in different casings; collapse
// those (first-seen case wins) before hitting the tag API. Tag names are
// case-sensitively unique, so this is an MCP-only semantic — the service itself
// treats case-variant names as distinct tags.
function dedupeNamesPreservingCase(names: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const raw of names) {
		const trimmed = raw.trim();

		if (trimmed.length === 0) {
			continue;
		}
		const key = trimmed.toLowerCase();

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		result.push(trimmed);
	}

	return result;
}

function haveSameTagNames(
	actualTags: Array<{ name: string }> | undefined,
	expectedTagNames: string[] | undefined,
): boolean {
	if (!actualTags || !expectedTagNames) {
		return false;
	}

	// expectedTagNames still carries the raw LLM-supplied names (with possible
	// surrounding whitespace and case-duplicates). The tag service normalizes
	// them via `dedupeNamesPreservingCase` before persisting, so comparing the
	// raw input against canonical persisted names would always report a mismatch
	// after a successful save — false negative in the recovery check.
	return isEqual(
		actualTags.map((tag) => tag.name).sort(),
		dedupeNamesPreservingCase(expectedTagNames).sort(),
	);
}

// Renames are followed so the key matches the node's name in the post-apply
// workflow.
function collectTouchedNodes(operations: PartialUpdateOperation[]): Map<string, number> {
	const touched = new Map<string, number>();
	const recordTouch = (name: string, opIndex: number) => {
		if (!touched.has(name)) {
			touched.set(name, opIndex);
		}
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

/**
 * How many operations had no effect, so `appliedOperations` can discount them.
 *
 * An operation counts only if *all* the groups it produced were skipped or
 * dropped: one `setNodeGroups` can define several groups and still apply the
 * rest after losing one.
 *
 * Known imprecision: each group remembers only the last operation that touched
 * it, so in an `addNodeGroup` + `updateNodeGroup` batch on the same dropped
 * group only the second operation is discounted.
 */
const countOperationsWithNoEffect = (
	skippedOperations: Array<Pick<SkippedOperation, 'opIndex'>>,
	groupOperations: ApplyOperationsSuccess['groupOperations'],
): number => {
	const producedPerOp = new Map<number, number>();

	for (const { opIndex } of Object.values(groupOperations)) {
		producedPerOp.set(opIndex, (producedPerOp.get(opIndex) ?? 0) + 1);
	}

	const skippedPerOp = new Map<number, number>();

	for (const { opIndex } of skippedOperations) {
		skippedPerOp.set(opIndex, (skippedPerOp.get(opIndex) ?? 0) + 1);
	}

	let count = 0;

	for (const [opIndex, skipped] of skippedPerOp) {
		if (skipped >= (producedPerOp.get(opIndex) ?? 0)) {
			count++;
		}
	}

	return count;
};

const isTagOperation = (op: PartialUpdateOperation) =>
	op.type === 'addTags' || op.type === 'removeTags';

const isSettingsOperation = (op: PartialUpdateOperation) => op.type === 'setWorkflowSettings';

/**
 * Rejects operations this instance cannot serve, before anything is loaded or
 * applied. Throw order is part of the contract: gated group ops first, then
 * tag ops.
 */
function assertOperationsSupported(
	strictOperations: PartialUpdateOperation[],
	{ canvasGroupsEnabled, tagsDisabled }: { canvasGroupsEnabled: boolean; tagsDisabled: boolean },
): void {
	// Defense in depth: with the flag off, the published schema already
	// rejects these op types at the enum level; this guards against the
	// loose and strict schemas drifting apart. Flag first so the scan only
	// runs on instances where it can actually reject something.
	if (!canvasGroupsEnabled && strictOperations.some((op) => GATED_GROUP_OP_TYPES.has(op.type))) {
		throw new Error(
			'Node group operations (addNodeGroup, removeNodeGroup, updateNodeGroup) are not available on this instance.',
		);
	}

	if (tagsDisabled && strictOperations.some(isTagOperation)) {
		throw new Error('Tag operations are not supported on this instance because tags are disabled.');
	}
}

/**
 * Group rules depend on how the workflow looks after the whole batch, so they
 * are checked once here rather than per operation. A broken group is dropped
 * and reported; the update still goes through.
 *
 * NOT PURE: `dropInvalidWorkflowGroups` removes the offending groups from
 * `result.workflow.nodeGroups` **in place**, and that mutation is what
 * `buildWorkflowUpdateEntity` later persists. `result` must be passed by
 * reference — cloning it makes the dropped groups silently come back.
 */
function resolveNodeGroupViolations(
	result: ApplyOperationsSuccess,
	canvasGroupsEnabled: boolean,
	nodeTypes: NodeTypes,
): {
	skippedOperations: SkippedOperation[];
	removedGroups: Array<{ groupName: string; reason: string }>;
	nodeGroupsNeedPersisting: boolean;
} {
	const skippedOperations: SkippedOperation[] = [...result.skippedOperations];
	// Groups the batch never asked for, removed because these operations made
	// them invalid. Reported apart from skippedOperations: no submitted
	// operation failed here, an existing group was destroyed as a side effect.
	const removedGroups: Array<{ groupName: string; reason: string }> = [];

	// Two passes, ordered by blame: an overlap between a new and an existing group
	// makes the validator flag both, so the batch's own groups go first and the
	// innocent existing one survives the re-check. `groupOperations` records which
	// groups this batch touched, not which one caused a given violation — two group
	// ops that collide take each other down.
	const getNodeType = makeGetNodeTypeForGrouping(nodeTypes);
	const violations = canvasGroupsEnabled
		? [
				...dropInvalidWorkflowGroups(
					result.workflow,
					getNodeType,
					(violation) => result.groupOperations[violation.groupId] !== undefined,
				),
				...dropInvalidWorkflowGroups(result.workflow, getNodeType),
			]
		: [];

	for (const violation of violations) {
		const requestedBy = result.groupOperations[violation.groupId];

		if (requestedBy) {
			skippedOperations.push({ ...requestedBy, reason: violation.message });
		} else {
			removedGroups.push({
				groupName: violation.groupName,
				reason: violation.message,
			});
		}
	}

	return {
		skippedOperations,
		removedGroups,
		// A violation found here always changes what must be persisted, even if
		// no group op ran this batch — otherwise the omitted `nodeGroups` key
		// falls back to preserve-on-omit and the still-invalid stored groups get
		// re-validated (and rejected) by WorkflowService.update right after.
		nodeGroupsNeedPersisting: violations.length > 0 || result.nodeGroupsChanged,
	};
}

/**
 * Assembles the entity handed to `WorkflowService.update`. Every conditional
 * spread below is load-bearing: an omitted key means "leave what is stored
 * alone", while writing `undefined` would create an own property and change
 * what TypeORM sees.
 */
function buildWorkflowUpdateEntity({
	workflow,
	existingMeta,
	hasSettingsOperations,
	hasNonTagOperations,
	nodeGroupsNeedPersisting,
}: {
	workflow: ApplyOperationsSuccess['workflow'];
	existingMeta: WorkflowEntity['meta'];
	hasSettingsOperations: boolean;
	hasNonTagOperations: boolean;
	nodeGroupsNeedPersisting: boolean;
}): WorkflowEntity {
	const workflowUpdateData = new WorkflowEntity();
	Object.assign(workflowUpdateData, {
		name: workflow.name,
		...(workflow.description !== undefined ? { description: workflow.description } : {}),
		nodes: workflow.nodes,
		connections: workflow.connections,
		// Only attach settings when a settings op ran, so node-only edits
		// don't re-save (and re-clean) the existing settings object.
		...(hasSettingsOperations ? { settings: workflow.settings } : {}),
		// Only persist nodeGroups when they actually need to change (a group op
		// ran, removing a node pruned a group, or the structural check above
		// dropped a group some other op invalidated); otherwise omit the key so
		// WorkflowService preserves the existing groups (preserve-on-omit).
		...(nodeGroupsNeedPersisting ? { nodeGroups: workflow.nodeGroups } : {}),
		meta: hasNonTagOperations
			? {
					...(existingMeta ?? {}),
					aiBuilderAssisted: true,
					builderVariant: 'mcp',
				}
			: (existingMeta ?? {}),
	});

	return workflowUpdateData;
}

/**
 * Builds the telemetry payload. The caller keeps the returned object and mutates
 * `.results` on it later — from the success path, from the catch, and from
 * `buildInvalidAiToolSourceErrorResponse`, which tracks by reference — so it must
 * stay a plain mutable object held outside the handler's `try`.
 *
 * Reads the raw `operations`, not the parsed ones: the payload is built before
 * parsing so a parse failure is still reported.
 */
function buildUpdateTelemetryPayload({
	userId,
	workflowId,
	operations,
	sanitizedSkillsUsed,
	versionName,
	versionDescription,
}: {
	userId: string;
	workflowId: string;
	operations: OperationInput[];
	sanitizedSkillsUsed: string[] | undefined;
	versionName?: string;
	versionDescription?: string;
}): UserCalledMCPToolEventPayload {
	return {
		user_id: userId,
		tool_name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
		parameters: {
			workflowId,
			// Spread, not `skillsUsed: sanitizedSkillsUsed` — the key must be absent
			// when unset, not present-but-undefined.
			...(sanitizedSkillsUsed !== undefined ? { skillsUsed: sanitizedSkillsUsed } : {}),
			opCount: operations.length,
			opTypes: operations.map((op) => op.type),
			hasVersionName: !!versionName,
			hasVersionDescription: !!versionDescription,
		},
	};
}

/**
 * Auto-assigns credentials to the nodes this batch added.
 *
 * `autoPopulateNodeCredentials` mutates the node objects in place, and that is how
 * the assigned credentials reach the saved entity — so the nodes passed in must be
 * the very same references held by `workflowUpdateData.nodes`. Copying them makes
 * auto-assignment silently never persist while still reporting assignments.
 */
async function autoAssignCredentialsForAddedNodes(
	{
		workflowUpdateData,
		addedNodeNames,
		projectId,
	}: {
		workflowUpdateData: WorkflowEntity;
		addedNodeNames: string[];
		projectId: string;
	},
	{
		user,
		nodeTypes,
		credentialsService,
		aiGatewayService,
	}: {
		user: User;
		nodeTypes: NodeTypes;
		credentialsService: CredentialsService;
		aiGatewayService: AiGatewayService;
	},
): Promise<AutoAssignResult> {
	if (addedNodeNames.length === 0) {
		return { assignments: [], skippedHttpNodes: [], outcomes: [] };
	}

	const addedNodeSet = new Set(addedNodeNames);
	const addedNodes = workflowUpdateData.nodes.filter((n) => addedNodeSet.has(n.name));

	return await autoPopulateNodeCredentials(
		{ ...workflowUpdateData, nodes: addedNodes },
		user,
		nodeTypes,
		credentialsService,
		projectId,
		aiGatewayService,
	);
}

/**
 * Validates the resulting workflow and marks the warnings that were already
 * there before this update.
 *
 * Validation covers the whole workflow, so warnings on nodes this batch never
 * touched (e.g. discriminators the editor strips when they equal node defaults)
 * would otherwise read as caused by these operations. Diffing against the
 * pre-update state lets the agent self-correct only what its edit broke.
 * `getWarningKey` matches by location, not message, so reworded messages still
 * match; a renamed node intentionally misses — the rename touched it, so its
 * warnings count as new.
 *
 * Note the deliberate asymmetry: only the pre-update pass is wrapped in a
 * try/catch.
 */
async function collectValidationWarnings(
	updated: Pick<WorkflowEntity, 'name' | 'nodes' | 'connections'>,
	existing: Pick<WorkflowEntity, 'name' | 'nodes' | 'connections'>,
	nodeTypes: NodeTypes,
): Promise<Array<ValidationWarning & { preExisting?: boolean }>> {
	const { ParseValidateHandler, getWarningKey } = await import('@n8n/ai-workflow-builder');

	const validator = new ParseValidateHandler({
		generatePinData: false,
		nodeTypesProvider: nodeTypes,
	});
	const validate = (workflow: Pick<WorkflowEntity, 'name' | 'nodes' | 'connections'>) =>
		validator.validateJSON({
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
		} as unknown as WorkflowJSON);

	const postUpdateWarnings = validate(updated);

	if (postUpdateWarnings.length === 0) {
		return postUpdateWarnings;
	}

	let preUpdateWarnings: ValidationWarning[] = [];

	try {
		preUpdateWarnings = validate(existing);
	} catch {
		/*
		 * deliberate: A pre-update state too broken to validate (which this batch may be
		 * fixing) must not fail the update, while a failure validating the *result* has
		 * to surface to the caller.
		 */
	}

	const preUpdateKeys = new Set(preUpdateWarnings.map(getWarningKey));

	return postUpdateWarnings.map((warning) =>
		preUpdateKeys.has(getWarningKey(warning))
			? { ...warning, message: `[pre-existing] ${warning.message}`, preExisting: true }
			: warning,
	);
}

/**
 * Resolves tag names to ids, creating missing tags when the user may.
 *
 * Returns `undefined` when the batch had no tag operation, which the caller turns
 * into an omitted `tagIds` key meaning "leave the workflow's tags alone". It must
 * never return `[]` for that case: an empty array is a valid instruction to clear
 * every tag on the workflow.
 */
async function resolveTagIds(
	tagNames: string[] | undefined,
	user: User,
	tagService: TagService,
): Promise<string[] | undefined> {
	if (tagNames === undefined) {
		return undefined;
	}

	const uniqueTagNames = dedupeNamesPreservingCase(tagNames);

	if (hasGlobalScope(user, 'tag:create')) {
		const resolvedTags = await tagService.findOrCreateByNames(uniqueTagNames);

		return resolvedTags.map((t) => t.id);
	}

	const resolvedTags = await tagService.getByNames(uniqueTagNames);
	const resolvedNames = new Set(resolvedTags.map((t) => t.name));
	const missing = uniqueTagNames.filter((name) => !resolvedNames.has(name));

	if (missing.length > 0) {
		throw new Error(
			`Cannot apply the following tags because they don't exist and your account does not have permission to create them: ${missing.join(', ')}`,
		);
	}

	return resolvedTags.map((t) => t.id);
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
	aiGatewayService: AiGatewayService,
	options: {
		/**
		 * `102_mcp_canvas_groups` rollout flag: when true, the granular node-group
		 * operations (addNodeGroup, removeNodeGroup, updateNodeGroup) are published
		 * in the tool schema and accepted by the handler. `setNodeGroups` predates
		 * the flag and is always available.
		 */
		canvasGroupsEnabled?: boolean;
	} = {},
	logger: Logger,
	postSaveMetrics: McpPostSaveMetricsService,
): ToolDefinition<ReturnType<typeof buildInputSchema>> => {
	const canvasGroupsEnabled = options.canvasGroupsEnabled === true;

	// Bound once: these never vary per call, so the call sites below show only
	// what is being validated.
	const settingsGuardDependencies: WorkflowSettingsGuardDependencies = {
		user,
		nodeTypes,
		globalConfig,
		workflowFinderService,
		workflowPublishedDataService,
		subworkflowPolicyChecker,
	};

	return {
		name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
		config: {
			description: buildToolDescription(canvasGroupsEnabled),
			inputSchema: buildInputSchema(canvasGroupsEnabled),
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
			// Held outside the `try` so the catch below can report on it.
			const telemetryPayload = buildUpdateTelemetryPayload({
				userId: user.id,
				workflowId,
				operations,
				sanitizedSkillsUsed: sanitizeSkillsUsed(skillsUsed),
				versionName,
				versionDescription,
			});

			let updateAttempted = false;
			let hasGraphOps = false;
			let hasTagOperations = false;
			let expectedWorkflow: { nodes: unknown; connections: unknown; nodeGroups?: unknown } | null =
				null;
			let expectedSettings: IWorkflowSettings | undefined;
			let expectedTagNames: string[] | undefined;
			let existingWorkflow: Awaited<
				ReturnType<WorkflowFinderService['findWorkflowForUser']>
			> | null = null;

			try {
				const strictOperations = parseStrictOperations(operations);
				hasTagOperations = strictOperations.some(isTagOperation);
				const hasNonTagOperations = strictOperations.some((op) => !isTagOperation(op));
				const hasSettingsOperations = strictOperations.some(isSettingsOperation);
				hasGraphOps = strictOperations.some((op) => GRAPH_OPERATION_TYPES.has(op.type));

				assertOperationsSupported(strictOperations, {
					canvasGroupsEnabled,
					tagsDisabled: globalConfig.tags.disabled,
				});

				existingWorkflow = await getMcpWorkflow(
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
					{ canvasGroupsEnabled },
				);

				if (!result.success) {
					throw new Error(result.error);
				}

				const { skippedOperations, removedGroups, nodeGroupsNeedPersisting } =
					resolveNodeGroupViolations(result, canvasGroupsEnabled, nodeTypes);

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
					(errorMessage) => ({ error: errorMessage, errorCode: 'INVALID_AI_TOOL_SOURCE' }),
					telemetryPayload,
					telemetry,
				);

				if (invalidToolSourceResponse) {
					return invalidToolSourceResponse;
				}

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

				await assertWorkflowSettingsValid(
					{ strictOperations, settings: result.workflow.settings, workflowId },
					settingsGuardDependencies,
				);

				await assertPublishAllowedForSettingsChange(
					{
						hasSettingsOperations,
						activeVersionId: existingWorkflow.activeVersionId,
						workflowId,
					},
					settingsGuardDependencies,
				);

				const workflowUpdateData = buildWorkflowUpdateEntity({
					workflow: result.workflow,
					existingMeta: existingWorkflow.meta,
					hasSettingsOperations,
					hasNonTagOperations,
					nodeGroupsNeedPersisting,
				});

				resolveNodeWebhookIds(workflowUpdateData, nodeTypes);

				const {
					assignments: credentialAssignments,
					skippedHttpNodes,
					outcomes: autoAssignOutcomes,
				} = await autoAssignCredentialsForAddedNodes(
					{
						workflowUpdateData,
						addedNodeNames: result.addedNodeNames,
						projectId: workflowProjectId,
					},
					{ user, nodeTypes, credentialsService, aiGatewayService },
				);

				// After auto-assign, so the nodes being validated carry their credentials.
				const validationWarnings = await collectValidationWarnings(
					workflowUpdateData,
					existingWorkflow,
					nodeTypes,
				);

				const tagIds = await resolveTagIds(result.tagNames, user, tagService);

				// Fallback is diff-based; it only ends up persisted when the update
				// actually produces a new history version (node/connection/group changes).
				const versionMetadata = resolveVersionMetadata(
					{ versionName, versionDescription },
					buildUpdateVersionMetadata(
						{ nodes: existingWorkflow.nodes, connections: existingWorkflow.connections },
						{ nodes: workflowUpdateData.nodes, connections: workflowUpdateData.connections },
					),
				);

				expectedWorkflow = {
					nodes: workflowUpdateData.nodes,
					connections: workflowUpdateData.connections,
					...(workflowUpdateData.nodeGroups !== undefined
						? { nodeGroups: workflowUpdateData.nodeGroups }
						: {}),
				};
				expectedSettings =
					hasSettingsOperations && workflowUpdateData.settings
						? removeDefaultValues(
								{ ...(existingWorkflow.settings ?? {}), ...workflowUpdateData.settings },
								globalConfig.executions.timeout,
							)
						: undefined;
				expectedTagNames = result.tagNames;
				updateAttempted = true;
				const updatedWorkflow = await workflowService.update(user, workflowUpdateData, workflowId, {
					aiBuilderAssisted: hasNonTagOperations,
					source: 'n8n-mcp',
					versionName: versionMetadata.name,
					versionDescription: versionMetadata.description,
					...(tagIds !== undefined ? { tagIds } : {}),
				});

				const baseUrl = urlService.getInstanceBaseUrl();
				const workflowUrl = `${baseUrl}/workflow/${updatedWorkflow.id}`;

				const notAppliedCount = countOperationsWithNoEffect(
					skippedOperations,
					result.groupOperations,
				);

				const output: UpdateWorkflowOutput = {
					workflowId: updatedWorkflow.id,
					name: updatedWorkflow.name,
					nodeCount: updatedWorkflow.nodes.length,
					url: workflowUrl,
					appliedOperations: strictOperations.length - notAppliedCount,
					autoAssignedCredentials: credentialAssignments,
					validationWarnings,
					note: skippedHttpNodes.length
						? `HTTP Request nodes (${skippedHttpNodes.join(', ')}) were skipped during credential auto-assignment. Their credentials must be configured manually.`
						: undefined,
					skippedOperations: skippedOperations.length > 0 ? skippedOperations : undefined,
					removedGroups: removedGroups.length > 0 ? removedGroups : undefined,
					// `IWorkflowSettings` is a closed interface while the published schema is an
					// open record — server-side cleanup decides which keys survive, so the tool
					// reports whatever came back rather than a fixed set.
					settings: hasSettingsOperations
						? ((updatedWorkflow.settings ?? {}) as Record<string, unknown>)
						: undefined,
				};

				try {
					if (autoAssignOutcomes.length > 0) {
						const nodeTypesByName = new Map(updatedWorkflow.nodes.map((n) => [n.name, n.type]));
						trackAutoassignOutcomes(
							telemetry,
							user.id,
							'update_workflow',
							autoAssignOutcomes,
							nodeTypesByName,
							workflowId,
						);
					}

					void collaborationService.broadcastWorkflowUpdate(workflowId, user.id).catch(() => {});

					telemetryPayload.results = {
						success: true,
						data: {
							workflowId: updatedWorkflow.id,
							nodeCount: updatedWorkflow.nodes.length,
						},
					};
					telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				} catch (sideEffectError) {
					logger.error('Post-save side effect failed for update_workflow', {
						workflowId: updatedWorkflow.id,
						error: sideEffectError,
					});
					postSaveMetrics.incrementPostSaveFailure('update', sideEffectError);
				}

				return {
					content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
					structuredContent: output,
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				const errorCode = getErrorCode(error);

				if (updateAttempted && existingWorkflow) {
					let persisted: Awaited<ReturnType<WorkflowFinderService['findWorkflowForUser']>> | null =
						null;
					try {
						persisted = await workflowFinderService.findWorkflowForUser(
							workflowId,
							user,
							['workflow:read'],
							{ includeTags: hasTagOperations },
						);
					} catch (lookupError) {
						logger.warn('Post-update verification lookup failed', {
							workflowId,
							error: lookupError,
						});
					}

					const matchesExpected =
						persisted &&
						expectedWorkflow &&
						isEqual(normalize(persisted.nodes), normalize(expectedWorkflow.nodes)) &&
						isEqual(normalize(persisted.connections), normalize(expectedWorkflow.connections)) &&
						(expectedWorkflow.nodeGroups === undefined ||
							isEqual(normalize(persisted.nodeGroups), normalize(expectedWorkflow.nodeGroups)));
					const contentChanged =
						!isEqual(normalize(existingWorkflow.nodes), normalize(expectedWorkflow?.nodes)) ||
						!isEqual(
							normalize(existingWorkflow.connections),
							normalize(expectedWorkflow?.connections),
						) ||
						(expectedWorkflow?.nodeGroups !== undefined &&
							!isEqual(
								normalize(existingWorkflow.nodeGroups),
								normalize(expectedWorkflow.nodeGroups),
							));

					const existingUpdatedAt = existingWorkflow.updatedAt
						? new Date(existingWorkflow.updatedAt).getTime()
						: undefined;
					const persistedUpdatedAt = persisted?.updatedAt
						? new Date(persisted.updatedAt).getTime()
						: undefined;
					const hasNewerTimestamp =
						existingUpdatedAt !== undefined &&
						persistedUpdatedAt !== undefined &&
						persistedUpdatedAt > existingUpdatedAt;
					const hasPersistedExpectedSettings =
						expectedSettings !== undefined &&
						persisted &&
						isEqual(normalize(persisted.settings), normalize(expectedSettings)) &&
						!isEqual(normalize(existingWorkflow.settings), normalize(expectedSettings));
					const wasTouched = Boolean(hasNewerTimestamp || hasPersistedExpectedSettings);
					const tagsMatchExpected =
						!hasTagOperations || haveSameTagNames(persisted?.tags, expectedTagNames);

					const recovered =
						tagsMatchExpected &&
						(hasGraphOps
							? Boolean(matchesExpected) && (contentChanged || hasNewerTimestamp)
							: wasTouched);
					if (persisted && recovered) {
						const baseUrl = urlService.getInstanceBaseUrl();
						const workflowUrl = `${baseUrl}/workflow/${persisted.id}`;

						try {
							telemetryPayload.results = {
								success: true,
								data: {
									workflowId: persisted.id,
									nodeCount: persisted.nodes.length,
									postSaveError: errorMessage,
								},
							};
							telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
						} catch (telemetryError) {
							logger.error('Post-save telemetry failed for update_workflow (recovery path)', {
								workflowId: persisted.id,
								error: telemetryError,
							});
							postSaveMetrics.incrementPostSaveFailure('update', telemetryError);
						}

						const output: UpdateWorkflowOutput = {
							workflowId: persisted.id,
							name: persisted.name,
							nodeCount: persisted.nodes.length,
							url: workflowUrl,
							note: `Workflow was updated successfully, but a post-save operation failed: ${errorMessage}`,
						};

						postSaveMetrics.incrementPostSaveFailure('update', error);

						return {
							content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
							structuredContent: output,
						};
					}
				}

				try {
					telemetryPayload.results = {
						success: false,
						error: errorMessage,
					};
					telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				} catch (telemetryError) {
					logger.error('Telemetry failed for update_workflow (error path)', {
						error: telemetryError,
					});
				}

				const output: UpdateWorkflowOutput = {
					error: errorMessage,
					errorCode,
				};

				return {
					content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
					structuredContent: output,
					isError: true,
				};
			}
		},
	};
};
