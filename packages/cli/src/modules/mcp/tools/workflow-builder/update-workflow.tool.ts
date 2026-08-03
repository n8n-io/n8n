import type { ValidationWarning } from '@n8n/ai-workflow-builder';
import type { GlobalConfig } from '@n8n/config';
import { type User, type SharedWorkflowRepository, WorkflowEntity } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { buildInvalidAiToolSourceErrorResponse } from './connection-structure-check';
import { MCP_UPDATE_WORKFLOW_TOOL } from './constants';
import { validateCredentialReferences } from './credential-validation';
import {
	autoPopulateNodeCredentials,
	trackAutoassignOutcomes,
	type CredentialAssignment,
	type SlotOutcome,
} from './credentials-auto-assign';
import { validateDataTableReferencesForUpdate } from './data-table-validation';
import {
	buildInputSchema,
	buildToolDescription,
	GATED_GROUP_OP_TYPES,
	outputSchema,
	parseStrictOperations,
	type OperationInput,
} from './partial-update-schemas';
import { sanitizeSkillsUsed } from './skills-used';
import { buildUpdateVersionMetadata, resolveVersionMetadata } from './version-metadata';
import {
	applyOperations,
	toWorkflowSlice,
	type ApplyOperationsSuccess,
	type PartialUpdateOperation,
	type SkippedOperation,
} from './workflow-operations';
import {
	assertPublishAllowedForSettingsChange,
	assertWorkflowSettingsValid,
} from './workflow-settings-guards';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { NodeTypes } from '@/node-types';
import type { TagService } from '@/services/tag.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import {
	dropInvalidNodeGroups,
	makeGetNodeTypeForGrouping,
	resolveNodeWebhookIds,
} from '@/workflow-helpers';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { getMcpWorkflow } from '../workflow-validation.utils';

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

/**
 * Rejects operations this instance cannot serve, before anything is loaded or
 * applied. Throw order is part of the contract: gated group ops first, then
 * tag ops.
 */
function assertOperationsSupported({
	strictOperations,
	canvasGroupsEnabled,
	tagsDisabled,
}: {
	strictOperations: PartialUpdateOperation[];
	canvasGroupsEnabled: boolean;
	tagsDisabled: boolean;
}): void {
	// Defense in depth: with the flag off, the published schema already
	// rejects these op types at the enum level; this guards against the
	// loose and strict schemas drifting apart.
	const hasGatedGroupOperations = strictOperations.some((op) => GATED_GROUP_OP_TYPES.has(op.type));

	if (hasGatedGroupOperations && !canvasGroupsEnabled) {
		throw new Error(
			'Node group operations (addNodeGroup, removeNodeGroup, updateNodeGroup) are not available on this instance.',
		);
	}

	if (strictOperations.some(isTagOperation) && tagsDisabled) {
		throw new Error('Tag operations are not supported on this instance because tags are disabled.');
	}
}

/**
 * Group rules depend on how the workflow looks after the whole batch, so they
 * are checked once here rather than per operation. A broken group is dropped
 * and reported; the update still goes through.
 *
 * NOT PURE: `dropInvalidNodeGroups` removes the offending groups from
 * `result.workflow.nodeGroups` **in place**, and that mutation is what
 * `buildWorkflowUpdateEntity` later persists. `result` must be passed by
 * reference — cloning it makes the dropped groups silently come back.
 */
function resolveNodeGroupViolations({
	result,
	nodeTypes,
	canvasGroupsEnabled,
}: {
	result: ApplyOperationsSuccess;
	nodeTypes: NodeTypes;
	canvasGroupsEnabled: boolean | undefined;
}): {
	skippedOperations: SkippedOperation[];
	removedGroups: Array<{ groupName: string; reason: string }>;
	nodeGroupsNeedPersisting: boolean;
} {
	const skippedOperations: SkippedOperation[] = [...result.skippedOperations];
	// Groups the batch never asked for, removed because these operations made
	// them invalid. Reported apart from skippedOperations: no submitted
	// operation failed here, an existing group was destroyed as a side effect.
	const removedGroups: Array<{ groupName: string; reason: string }> = [];

	if (!canvasGroupsEnabled) {
		return {
			skippedOperations,
			removedGroups,
			nodeGroupsNeedPersisting: result.nodeGroupsChanged,
		};
	}

	const getNodeType = makeGetNodeTypeForGrouping(nodeTypes);

	// Two passes, ordered by blame: an overlap between a new and an existing
	// group makes the validator flag both, so the batch's own groups go first
	// and the innocent existing one survives the re-check. `groupOperations`
	// records which groups this batch touched, not which one caused a given
	// violation — two group ops that collide take each other down.
	const ownGroups = dropInvalidNodeGroups(
		result.workflow,
		getNodeType,
		(violation) => result.groupOperations[violation.groupId] !== undefined,
	);

	const violations = [...ownGroups, ...dropInvalidNodeGroups(result.workflow, getNodeType)];

	if (violations.length === 0) {
		return {
			skippedOperations,
			removedGroups,
			nodeGroupsNeedPersisting: result.nodeGroupsChanged,
		};
	}

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
		nodeGroupsNeedPersisting: true,
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
async function autoAssignCredentialsForAddedNodes({
	workflowUpdateData,
	addedNodeNames,
	user,
	nodeTypes,
	credentialsService,
	projectId,
	aiGatewayService,
}: {
	workflowUpdateData: WorkflowEntity;
	addedNodeNames: string[];
	user: User;
	nodeTypes: NodeTypes;
	credentialsService: CredentialsService;
	projectId: string;
	aiGatewayService: AiGatewayService;
}): Promise<{
	assignments: CredentialAssignment[];
	skippedHttpNodes: string[];
	outcomes: SlotOutcome[];
}> {
	if (addedNodeNames.length === 0) {
		return { assignments: [], skippedHttpNodes: [], outcomes: [] };
	}

	const addedNodeSet = new Set(addedNodeNames);
	const addedNodes = workflowUpdateData.nodes.filter((n) => addedNodeSet.has(n.name));

	const autoAssign = await autoPopulateNodeCredentials(
		{ ...workflowUpdateData, nodes: addedNodes },
		user,
		nodeTypes,
		credentialsService,
		projectId,
		aiGatewayService,
	);

	return {
		assignments: autoAssign.assignments,
		skippedHttpNodes: autoAssign.skippedHttpNodes,
		outcomes: autoAssign.outcomes,
	};
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
 * try/catch. A pre-update state too broken to validate (which this batch may be
 * fixing) must not fail the update, while a failure validating the *result* has
 * to surface to the caller.
 */
async function collectValidationWarnings({
	nodeTypes,
	updated,
	existing,
}: {
	nodeTypes: NodeTypes;
	updated: Pick<WorkflowEntity, 'name' | 'nodes' | 'connections'>;
	existing: Pick<WorkflowEntity, 'name' | 'nodes' | 'connections'>;
}): Promise<Array<ValidationWarning & { preExisting?: boolean }>> {
	const { ParseValidateHandler, getWarningKey } = await import('@n8n/ai-workflow-builder');
	const validator = new ParseValidateHandler({
		generatePinData: false,
		nodeTypesProvider: nodeTypes,
	});
	const postUpdateWarnings = validator.validateJSON({
		name: updated.name,
		nodes: updated.nodes,
		connections: updated.connections,
	} as unknown as WorkflowJSON);

	if (postUpdateWarnings.length === 0) {
		return postUpdateWarnings;
	}

	let preUpdateWarnings: ValidationWarning[] = [];

	try {
		preUpdateWarnings = validator.validateJSON({
			name: existing.name,
			nodes: existing.nodes,
			connections: existing.connections,
		} as unknown as WorkflowJSON);
	} catch {}

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
async function resolveTagIds({
	tagNames,
	user,
	tagService,
}: {
	tagNames: string[] | undefined;
	user: User;
	tagService: TagService;
}): Promise<string[] | undefined> {
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

/** Builds the tool's success payload. `structuredContent` reuses this object. */
function buildUpdateOutput({
	updatedWorkflow,
	workflowUrl,
	operationCount,
	skippedOperations,
	groupOperations,
	removedGroups,
	credentialAssignments,
	validationWarnings,
	skippedHttpNodes,
	hasSettingsOperations,
}: {
	updatedWorkflow: Pick<WorkflowEntity, 'id' | 'name' | 'nodes' | 'settings'>;
	workflowUrl: string;
	operationCount: number;
	skippedOperations: SkippedOperation[];
	groupOperations: ApplyOperationsSuccess['groupOperations'];
	removedGroups: Array<{ groupName: string; reason: string }>;
	credentialAssignments: CredentialAssignment[];
	validationWarnings: Array<ValidationWarning & { preExisting?: boolean }>;
	skippedHttpNodes: string[];
	hasSettingsOperations: boolean;
}) {
	const notAppliedCount = countOperationsWithNoEffect(skippedOperations, groupOperations);

	return {
		workflowId: updatedWorkflow.id,
		name: updatedWorkflow.name,
		nodeCount: updatedWorkflow.nodes.length,
		url: workflowUrl,
		appliedOperations: operationCount - notAppliedCount,
		autoAssignedCredentials: credentialAssignments,
		validationWarnings,
		note: skippedHttpNodes.length
			? `HTTP Request nodes (${skippedHttpNodes.join(', ')}) were skipped during credential auto-assignment. Their credentials must be configured manually.`
			: undefined,
		skippedOperations: skippedOperations.length > 0 ? skippedOperations : undefined,
		removedGroups: removedGroups.length > 0 ? removedGroups : undefined,
		settings: hasSettingsOperations ? (updatedWorkflow.settings ?? {}) : undefined,
	};
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
): ToolDefinition<ReturnType<typeof buildInputSchema>> => ({
	name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
	config: {
		description: buildToolDescription(options.canvasGroupsEnabled === true),
		inputSchema: buildInputSchema(options.canvasGroupsEnabled === true),
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

		try {
			const strictOperations = parseStrictOperations(operations);
			const hasTagOperations = strictOperations.some(isTagOperation);
			const hasNonTagOperations = strictOperations.some((op) => !isTagOperation(op));
			const hasSettingsOperations = strictOperations.some(
				(op) => op.type === 'setWorkflowSettings',
			);

			assertOperationsSupported({
				strictOperations,
				canvasGroupsEnabled: options.canvasGroupsEnabled === true,
				tagsDisabled: globalConfig.tags.disabled,
			});

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
				{ canvasGroupsEnabled: options.canvasGroupsEnabled },
			);

			if (!result.success) {
				throw new Error(result.error);
			}

			const { skippedOperations, removedGroups, nodeGroupsNeedPersisting } =
				resolveNodeGroupViolations({
					result,
					nodeTypes,
					canvasGroupsEnabled: options.canvasGroupsEnabled,
				});

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

			await assertWorkflowSettingsValid({
				strictOperations,
				settings: result.workflow.settings,
				parentWorkflowId: workflowId,
				user,
				workflowFinderService,
				workflowPublishedDataService,
				subworkflowPolicyChecker,
				nodeTypes,
				useWorkflowPublicationService: globalConfig.workflows.useWorkflowPublicationService,
				errorTriggerType: globalConfig.nodes.errorTriggerType,
				maxExecutionTimeout: globalConfig.executions.maxTimeout,
			});

			await assertPublishAllowedForSettingsChange({
				hasSettingsOperations,
				activeVersionId: existingWorkflow.activeVersionId,
				workflowId,
				user,
				workflowFinderService,
			});

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
			} = await autoAssignCredentialsForAddedNodes({
				workflowUpdateData,
				addedNodeNames: result.addedNodeNames,
				user,
				nodeTypes,
				credentialsService,
				projectId: workflowProjectId,
				aiGatewayService,
			});

			// After auto-assign, so the nodes being validated carry their credentials.
			const validationWarnings = await collectValidationWarnings({
				nodeTypes,
				updated: workflowUpdateData,
				existing: existingWorkflow,
			});

			const tagIds = await resolveTagIds({ tagNames: result.tagNames, user, tagService });

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

			const output = buildUpdateOutput({
				updatedWorkflow,
				workflowUrl,
				operationCount: strictOperations.length,
				skippedOperations,
				groupOperations: result.groupOperations,
				removedGroups,
				credentialAssignments,
				validationWarnings,
				skippedHttpNodes,
				hasSettingsOperations,
			});

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
