import type { ValidationWarning } from '@n8n/ai-workflow-builder';
import { WorkflowEntity, type User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { TagService } from '@/services/tag.service';
import { dropInvalidNodeGroups, makeGetNodeTypeForGrouping } from '@/workflow-helpers';

import { MCP_UPDATE_WORKFLOW_TOOL } from './constants';
import {
	autoPopulateNodeCredentials,
	type AutoAssignResult,
	type CredentialAssignment,
} from './credentials-auto-assign';
import {
	GATED_GROUP_OP_TYPES,
	type OperationInput,
	type UpdateWorkflowOutput,
} from './partial-update-schemas';
import type {
	ApplyOperationsSuccess,
	PartialUpdateOperation,
	SkippedOperation,
} from './workflow-operations';
import type { UserCalledMCPToolEventPayload } from '../../mcp.types';

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
export function collectTouchedNodes(operations: PartialUpdateOperation[]): Map<string, number> {
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

export const isTagOperation = (op: PartialUpdateOperation) =>
	op.type === 'addTags' || op.type === 'removeTags';

export const isSettingsOperation = (op: PartialUpdateOperation) =>
	op.type === 'setWorkflowSettings';

/**
 * Rejects operations this instance cannot serve, before anything is loaded or
 * applied. Throw order is part of the contract: gated group ops first, then
 * tag ops.
 */
export function assertOperationsSupported({
	strictOperations,
	hasTagOperations,
	canvasGroupsEnabled,
	tagsDisabled,
}: {
	strictOperations: PartialUpdateOperation[];
	hasTagOperations: boolean;
	canvasGroupsEnabled: boolean;
	tagsDisabled: boolean;
}): void {
	// Defense in depth: with the flag off, the published schema already
	// rejects these op types at the enum level; this guards against the
	// loose and strict schemas drifting apart. Flag first so the scan only
	// runs on instances where it can actually reject something.
	if (!canvasGroupsEnabled && strictOperations.some((op) => GATED_GROUP_OP_TYPES.has(op.type))) {
		throw new Error(
			'Node group operations (addNodeGroup, removeNodeGroup, updateNodeGroup) are not available on this instance.',
		);
	}

	if (tagsDisabled && hasTagOperations) {
		throw new Error('Tag operations are not supported on this instance because tags are disabled.');
	}
}

/**
 * Two passes, ordered by blame: an overlap between a new and an existing group
 * makes the validator flag both, so the batch's own groups go first and the
 * innocent existing one survives the re-check. `groupOperations` records which
 * groups this batch touched, not which one caused a given violation — two group
 * ops that collide take each other down.
 */
function collectNodeGroupViolations(result: ApplyOperationsSuccess, nodeTypes: NodeTypes) {
	const getNodeType = makeGetNodeTypeForGrouping(nodeTypes);

	const ownGroups = dropInvalidNodeGroups(
		result.workflow,
		getNodeType,
		(violation) => result.groupOperations[violation.groupId] !== undefined,
	);

	return [...ownGroups, ...dropInvalidNodeGroups(result.workflow, getNodeType)];
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
export function resolveNodeGroupViolations(
	{
		result,
		canvasGroupsEnabled,
	}: {
		result: ApplyOperationsSuccess;
		canvasGroupsEnabled: boolean;
	},
	{ nodeTypes }: { nodeTypes: NodeTypes },
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

	const violations = canvasGroupsEnabled ? collectNodeGroupViolations(result, nodeTypes) : [];

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
export function buildWorkflowUpdateEntity({
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
export function buildUpdateTelemetryPayload({
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
export async function autoAssignCredentialsForAddedNodes(
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
export async function collectValidationWarnings(
	{
		updated,
		existing,
	}: {
		updated: Pick<WorkflowEntity, 'name' | 'nodes' | 'connections'>;
		existing: Pick<WorkflowEntity, 'name' | 'nodes' | 'connections'>;
	},
	{ nodeTypes }: { nodeTypes: NodeTypes },
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
export async function resolveTagIds(
	{ tagNames }: { tagNames: string[] | undefined },
	{ user, tagService }: { user: User; tagService: TagService },
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

/** Builds the tool's success payload. `structuredContent` reuses this object. */
export function buildUpdateOutput({
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
}): UpdateWorkflowOutput {
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
		// `IWorkflowSettings` is a closed interface while the published schema is an
		// open record — server-side cleanup decides which keys survive, so the tool
		// reports whatever came back rather than a fixed set.
		settings: hasSettingsOperations
			? ((updatedWorkflow.settings ?? {}) as Record<string, unknown>)
			: undefined,
	};
}
