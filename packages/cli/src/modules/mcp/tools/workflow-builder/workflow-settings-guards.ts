import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import { Workflow, type INode, type IWorkflowSettings } from 'n8n-workflow';

import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import type { NodeTypes } from '@/node-types';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

import type { PartialUpdateOperation } from './workflow-operations';

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
 * Runs the workflow-level settings validations that only apply when this batch
 * actually touched the setting in question — so a partial edit isn't rejected
 * for pre-existing state, and a value set in one operation can be satisfied by
 * another operation of the same batch (or by what is already on the workflow).
 *
 * Takes the effective (post-apply) settings, and throws on the first violation.
 * Check order is part of the contract: error workflow, then caller policy, then
 * execution timeout.
 */
export async function assertWorkflowSettingsValid({
	strictOperations,
	settings,
	parentWorkflowId,
	user,
	workflowFinderService,
	workflowPublishedDataService,
	subworkflowPolicyChecker,
	nodeTypes,
	useWorkflowPublicationService,
	errorTriggerType,
	maxExecutionTimeout,
}: {
	strictOperations: PartialUpdateOperation[];
	settings: IWorkflowSettings | undefined;
	parentWorkflowId: string;
	user: User;
	workflowFinderService: WorkflowFinderService;
	workflowPublishedDataService: WorkflowPublishedDataService;
	subworkflowPolicyChecker: SubworkflowPolicyChecker;
	nodeTypes: NodeTypes;
	useWorkflowPublicationService: boolean;
	errorTriggerType: string;
	maxExecutionTimeout: number;
}): Promise<void> {
	// Validate a freshly-set error workflow so the agent can self-correct in
	// context: the target must exist, be accessible, and contain an Error
	// Trigger node — otherwise it would silently never run on failure.
	const setsErrorWorkflow = strictOperations.some(
		(op) => op.type === 'setWorkflowSettings' && op.settings.errorWorkflow !== undefined,
	);

	if (setsErrorWorkflow) {
		await assertErrorWorkflowIsUsable({
			errorWorkflowId: settings?.errorWorkflow,
			parentWorkflowId,
			user,
			workflowFinderService,
			workflowPublishedDataService,
			useWorkflowPublicationService,
			nodeTypes,
			subworkflowPolicyChecker,
			errorTriggerType,
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
		assertExecutionTimeoutWithinMax(settings?.executionTimeout, maxExecutionTimeout);
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
export async function assertPublishAllowedForSettingsChange({
	hasSettingsOperations,
	activeVersionId,
	workflowId,
	user,
	workflowFinderService,
}: {
	hasSettingsOperations: boolean;
	activeVersionId: string | null | undefined;
	workflowId: string;
	user: User;
	workflowFinderService: WorkflowFinderService;
}): Promise<void> {
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
