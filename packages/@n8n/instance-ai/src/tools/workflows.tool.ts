/**
 * Consolidated workflows tool — list, get, get-as-code, delete/archive,
 * unarchive, setup, publish, unpublish, list-versions, get-version,
 * restore-version, update-version.
 */
import { createTool } from '@mastra/core/tools';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { formatTimestamp } from '../utils/format-timestamp';
import {
	setupSuspendSchema,
	setupResumeSchema,
	type SetupRequest,
} from './workflows/setup-workflow.schema';
import {
	analyzeWorkflow,
	applyNodeChanges,
	buildCompletedReport,
} from './workflows/setup-workflow.service';
import { getReferencedWorkflowIds } from './workflows/workflow-json-utils';

// ── Action schemas ──────────────────────────────────────────────────────────

const listAction = z.object({
	action: z.literal('list').describe('List workflows accessible to the current user'),
	query: z.string().optional().describe('Filter workflows by name'),
	limit: z.number().int().positive().max(100).optional().describe('Max results to return'),
	status: z
		.enum(['active', 'archived', 'all'])
		.optional()
		.describe(
			'Which workflows to list. Defaults to active; use archived to find workflows that can be restored.',
		),
});

const getAction = z.object({
	action: z.literal('get').describe('Get full details of a specific workflow'),
	workflowId: z.string().describe('ID of the workflow'),
});

const getAsCodeAction = z.object({
	action: z.literal('get-as-code').describe('Convert an existing workflow to TypeScript SDK code'),
	workflowId: z.string().describe('ID of the workflow'),
});

const deleteAction = z.object({
	action: z
		.literal('delete')
		.describe('Archive a workflow by ID. This is reversible with the unarchive action.'),
	workflowId: z.string().describe('ID of the workflow'),
});

const unarchiveAction = z.object({
	action: z
		.literal('unarchive')
		.describe('Restore an archived workflow by ID without publishing it'),
	workflowId: z.string().describe('ID of the workflow'),
});

const setupAction = z.object({
	action: z
		.literal('setup')
		.describe('Open the workflow setup UI for credential and parameter configuration'),
	workflowId: z.string().describe('ID of the workflow'),
	projectId: z.string().optional().describe('Project ID to scope credential creation to'),
});

const publishBaseAction = z.object({
	action: z
		.literal('publish')
		.describe('Publish a workflow version to production (omit versionId for latest draft)'),
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().optional().describe('Version ID'),
});

const publishExtendedAction = publishBaseAction.extend({
	name: z.string().optional().describe('Name for the version'),
	description: z.string().optional().describe('Description for the version'),
});

const unpublishAction = z.object({
	action: z.literal('unpublish').describe('Unpublish a workflow — stop it from running'),
	workflowId: z.string().describe('ID of the workflow'),
});

const listVersionsAction = z.object({
	action: z.literal('list-versions').describe('List version history for a workflow'),
	workflowId: z.string().describe('ID of the workflow'),
	limit: z.number().int().positive().max(100).optional().describe('Max results to return'),
	skip: z.number().int().min(0).optional().describe('Number of results to skip (default 0)'),
});

const getVersionAction = z.object({
	action: z.literal('get-version').describe('Get full details of a specific workflow version'),
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().describe('Version ID'),
});

const restoreVersionAction = z.object({
	action: z.literal('restore-version').describe('Restore a workflow to a previous version'),
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().describe('Version ID'),
});

const updateVersionAction = z.object({
	action: z
		.literal('update-version')
		.describe('Update the name or description of a workflow version (null to clear a field)'),
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().describe('Version ID'),
	name: z.string().nullable().optional().describe('Name for the version'),
	description: z.string().nullable().optional().describe('Description for the version'),
});

// ── Suspend / resume schemas ────────────────────────────────────────────────

const confirmationSuspendSchema = setupSuspendSchema.pick({
	requestId: true,
	message: true,
	severity: true,
});

const suspendSchema = z.union([setupSuspendSchema, confirmationSuspendSchema]);

// Resume: union of standard confirmation (approved) and setup-specific fields.
const resumeSchema = setupResumeSchema;

// ── Input type ──────────────────────────────────────────────────────────────

// Explicit union of all possible action inputs so handlers get proper types
// regardless of which dynamic subset the schema actually includes.
type Input =
	| z.infer<typeof listAction>
	| z.infer<typeof getAction>
	| z.infer<typeof getAsCodeAction>
	| z.infer<typeof deleteAction>
	| z.infer<typeof unarchiveAction>
	| z.infer<typeof setupAction>
	| z.infer<typeof publishExtendedAction>
	| z.infer<typeof unpublishAction>
	| z.infer<typeof listVersionsAction>
	| z.infer<typeof getVersionAction>
	| z.infer<typeof restoreVersionAction>
	| z.infer<typeof updateVersionAction>;

type PublishInput = z.infer<typeof publishExtendedAction>;
type PublishRollbackResult = {
	rolledBackWorkflowIds: string[];
	rollbackErrors: Array<{ workflowId: string; error: string }>;
};

export type WorkflowAction =
	| 'list'
	| 'get'
	| 'get-as-code'
	| 'delete'
	| 'unarchive'
	| 'setup'
	| 'publish'
	| 'unpublish'
	| 'list-versions'
	| 'get-version'
	| 'restore-version'
	| 'update-version';

type WorkflowActionSchema = z.ZodDiscriminatedUnionOption<'action'>;

export interface WorkflowsToolOptions {
	allowedActions?: readonly WorkflowAction[];
	descriptionPrefix?: string;
	descriptionSuffix?: string;
}

const WORKFLOW_ACTION_ORDER = [
	'list',
	'get',
	'get-as-code',
	'delete',
	'unarchive',
	'setup',
	'publish',
	'unpublish',
	'list-versions',
	'get-version',
	'restore-version',
	'update-version',
] as const satisfies readonly WorkflowAction[];

const WORKFLOW_ACTION_LABELS = {
	list: 'list',
	get: 'inspect',
	'get-as-code': 'convert existing workflows to TypeScript SDK code',
	delete: 'archive',
	unarchive: 'restore archived workflows',
	setup: 'set up credentials and parameters',
	publish: 'publish',
	unpublish: 'unpublish',
	'list-versions': 'list versions',
	'get-version': 'inspect versions',
	'restore-version': 'restore versions',
	'update-version': 'update version metadata',
} satisfies Record<WorkflowAction, string>;

function getSupportedWorkflowActionSchemas(
	context: InstanceAiContext,
): Partial<Record<WorkflowAction, WorkflowActionSchema>> {
	const hasNamedVersions = !!context.workflowService.updateVersion;
	const hasVersions = !!context.workflowService.listVersions;

	return {
		list: listAction,
		get: getAction,
		'get-as-code': getAsCodeAction,
		delete: deleteAction,
		unarchive: unarchiveAction,
		setup: setupAction,
		publish: hasNamedVersions ? publishExtendedAction : publishBaseAction,
		unpublish: unpublishAction,
		...(hasVersions
			? {
					'list-versions': listVersionsAction,
					'get-version': getVersionAction,
					'restore-version': restoreVersionAction,
				}
			: {}),
		...(hasNamedVersions ? { 'update-version': updateVersionAction } : {}),
	};
}

function getWorkflowActions(
	supportedSchemas: Partial<Record<WorkflowAction, WorkflowActionSchema>>,
	options: WorkflowsToolOptions,
): WorkflowAction[] {
	const allowedActions = new Set(options.allowedActions ?? WORKFLOW_ACTION_ORDER);
	return WORKFLOW_ACTION_ORDER.filter(
		(action) => supportedSchemas[action] !== undefined && allowedActions.has(action),
	);
}

function buildInputSchema(context: InstanceAiContext, options: WorkflowsToolOptions) {
	const supportedSchemas = getSupportedWorkflowActionSchemas(context);
	const actionSchemas: WorkflowActionSchema[] = [];
	for (const action of getWorkflowActions(supportedSchemas, options)) {
		const schema = supportedSchemas[action];
		if (schema) actionSchemas.push(schema);
	}

	if (actionSchemas.length === 0) {
		throw new Error('Workflows tool requires at least one allowed action');
	}

	if (actionSchemas.length === 1) {
		return sanitizeInputSchema(actionSchemas[0]);
	}

	return sanitizeInputSchema(
		z.discriminatedUnion(
			'action',
			actionSchemas as unknown as [
				WorkflowActionSchema,
				WorkflowActionSchema,
				...WorkflowActionSchema[],
			],
		),
	);
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function resolveWorkflowName(
	context: InstanceAiContext,
	workflowId: string,
): Promise<string> {
	return await context.workflowService
		.get(workflowId)
		.then((wf) => wf.name)
		.catch(() => workflowId);
}

async function handleList(context: InstanceAiContext, input: Extract<Input, { action: 'list' }>) {
	const workflows = await context.workflowService.list({
		limit: input.limit,
		query: input.query,
		...(input.status ? { status: input.status } : {}),
	});
	return { workflows };
}

async function handleGet(context: InstanceAiContext, input: Extract<Input, { action: 'get' }>) {
	return await context.workflowService.get(input.workflowId);
}

async function handleGetAsCode(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'get-as-code' }>,
) {
	const { generateWorkflowCode } = await import('@n8n/workflow-sdk');
	try {
		const json = await context.workflowService.getAsWorkflowJSON(input.workflowId);
		const code = generateWorkflowCode(json);
		return { workflowId: input.workflowId, name: json.name, code };
	} catch (error) {
		return {
			workflowId: input.workflowId,
			name: '',
			code: '',
			error: error instanceof Error ? error.message : 'Failed to convert workflow to code',
		};
	}
}

async function handleDelete(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'delete' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as z.infer<typeof resumeSchema> | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<unknown>) | undefined;

	if (context.permissions?.deleteWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.deleteWorkflow !== 'always_allow';

	// First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await resolveWorkflowName(context, input.workflowId);
		const suspension = await suspend?.({
			requestId: nanoid(),
			message: `Archive workflow "${workflowName}" (ID: ${input.workflowId})? This will deactivate it if needed and can be undone later.`,
			severity: 'warning' as const,
		});
		return suspension ?? { success: false, denied: true, reason: 'Awaiting confirmation' };
	}

	// Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	await context.workflowService.archive(input.workflowId);
	return { success: true };
}

async function handleUnarchive(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'unarchive' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as z.infer<typeof resumeSchema> | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<unknown>) | undefined;

	if (context.permissions?.deleteWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.deleteWorkflow !== 'always_allow';

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await resolveWorkflowName(context, input.workflowId);
		const suspension = await suspend?.({
			requestId: nanoid(),
			message: `Restore archived workflow "${workflowName}" (ID: ${input.workflowId})? This will make it visible again but will not publish it.`,
			severity: 'warning' as const,
		});
		return suspension ?? { success: false, denied: true, reason: 'Awaiting confirmation' };
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	await context.workflowService.unarchive(input.workflowId);
	return { success: true };
}

function isActionableSetupRequest(req: SetupRequest): boolean {
	return (
		req.needsAction === true &&
		(req.credentialType !== undefined || (req.editableParameters?.length ?? 0) > 0)
	);
}

async function handleSetup(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'setup' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
	state: { currentRequestId: string | null; preTestSnapshot: WorkflowJSON | null },
) {
	// `setup` mutates workflow nodes via applyNodeChanges (credentials and
	// parameters are workflow-record fields), so it's gated under
	// `updateWorkflow` like other workflow-mutating actions.
	if (context.permissions?.updateWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const resumeData = ctx?.agent?.resumeData as z.infer<typeof setupResumeSchema> | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<unknown>) | undefined;

	// State 1: Analyze workflow and suspend for user setup
	if (resumeData === undefined || resumeData === null) {
		const setupRequests = (await analyzeWorkflow(context, input.workflowId)).filter(
			isActionableSetupRequest,
		);

		if (setupRequests.length === 0) {
			return { success: true, reason: 'No nodes require setup.' };
		}

		state.currentRequestId = nanoid();

		await suspend?.({
			requestId: state.currentRequestId,
			message: 'Configure credentials for your workflow',
			severity: 'info' as const,
			setupRequests,
			workflowId: input.workflowId,
			...(input.projectId ? { projectId: input.projectId } : {}),
		});
		return { success: false };
	}

	// State 2: User declined — revert any trigger-test changes
	if (!resumeData.approved) {
		if (state.preTestSnapshot) {
			await context.workflowService.updateFromWorkflowJSON(input.workflowId, state.preTestSnapshot);
			state.preTestSnapshot = null;
		}
		return {
			success: true,
			deferred: true,
			reason: 'User skipped workflow setup for now.',
		};
	}

	// State 3: Test trigger — persist changes, run, re-suspend with result
	if (resumeData.action === 'test-trigger' && resumeData.testTriggerNode) {
		state.preTestSnapshot ??= await context.workflowService.getAsWorkflowJSON(input.workflowId);

		const preTestApply = await applyNodeChanges(
			context,
			input.workflowId,
			resumeData.credentials,
			resumeData.nodeParameters,
		);
		const applyFailures = preTestApply.failed;

		if (applyFailures.length > 0) {
			return {
				success: false,
				error: `Failed to apply setup before trigger test: ${applyFailures.map((f) => `${f.nodeName}: ${f.error}`).join('; ')}`,
				failedNodes: applyFailures,
			};
		}

		let triggerTestResult: {
			status: 'success' | 'error' | 'listening';
			error?: string;
		};
		try {
			const result = await context.executionService.run(input.workflowId, undefined, {
				timeout: 30_000,
				triggerNodeName: resumeData.testTriggerNode,
			});
			if (result.status === 'success') {
				triggerTestResult = { status: 'success' };
			} else if (result.status === 'waiting') {
				triggerTestResult = { status: 'listening' as const };
			} else {
				triggerTestResult = {
					status: 'error',
					error: result.error ?? 'Trigger test failed',
				};
			}
		} catch (error) {
			triggerTestResult = {
				status: 'error',
				error: error instanceof Error ? error.message : 'Trigger test failed',
			};
		}

		const refreshedRequests = await analyzeWorkflow(context, input.workflowId, {
			[resumeData.testTriggerNode]: triggerTestResult,
		});

		// Generate a new requestId so the frontend doesn't filter it
		// as already-resolved from the previous suspend cycle
		state.currentRequestId = nanoid();

		await suspend?.({
			requestId: state.currentRequestId,
			message: 'Configure credentials for your workflow',
			severity: 'info' as const,
			setupRequests: refreshedRequests,
			workflowId: input.workflowId,
			...(input.projectId ? { projectId: input.projectId } : {}),
		});
		return { success: false };
	}

	// State 4: Apply — save credentials and parameters atomically
	try {
		state.preTestSnapshot = null;

		const applyResult = await applyNodeChanges(
			context,
			input.workflowId,
			resumeData.credentials,
			resumeData.nodeParameters,
		);

		const failedNodes = applyResult.failed.length > 0 ? applyResult.failed : undefined;

		// Fetch updated workflow to include in response so the frontend can refresh the canvas
		const updatedWorkflow = await context.workflowService.getAsWorkflowJSON(input.workflowId);
		const updatedNodes = updatedWorkflow.nodes.map((node) => ({
			id: node.id,
			name: node.name,
			type: node.type,
			typeVersion: node.typeVersion,
			position: node.position,
			parameters: node.parameters as Record<string, unknown> | undefined,
			credentials: node.credentials,
			disabled: node.disabled,
		}));
		const updatedConnections = updatedWorkflow.connections as Record<string, unknown>;

		// Re-analyze to determine if any nodes still need setup.
		// Filter by needsAction to distinguish "render this card" from
		// "this still requires user intervention".
		const remainingRequests = await analyzeWorkflow(context, input.workflowId);
		const pendingRequests = remainingRequests.filter((r) => r.needsAction);
		const completedNodes = buildCompletedReport(resumeData.credentials, resumeData.nodeParameters);

		// Detect credentials that were applied but failed testing.
		// Move them from completedNodes to failedNodes so the LLM knows
		// the credential is invalid rather than seeing it in both lists.
		const credTestFailures: Array<{ nodeName: string; error: string }> = [];
		for (const req of remainingRequests) {
			if (
				req.credentialTestResult &&
				!req.credentialTestResult.success &&
				req.credentialType &&
				resumeData.credentials?.[req.node.name]?.[req.credentialType]
			) {
				credTestFailures.push({
					nodeName: req.node.name,
					error: `Credential test failed for ${req.credentialType}: ${req.credentialTestResult.message ?? 'Invalid credentials'}`,
				});
			}
		}

		const credFailedNodeNames = new Set(credTestFailures.map((f) => f.nodeName));
		const validCompletedNodes = completedNodes.filter((n) => !credFailedNodeNames.has(n.nodeName));
		const allFailedNodes = [...(failedNodes ?? []), ...credTestFailures];
		const mergedFailedNodes = allFailedNodes.length > 0 ? allFailedNodes : undefined;

		if (pendingRequests.length > 0) {
			const skippedNodes = pendingRequests.map((r) => ({
				nodeName: r.node.name,
				credentialType: r.credentialType,
			}));
			return {
				success: true,
				partial: true,
				reason: `Applied setup for ${String(validCompletedNodes.length)} node(s), ${String(pendingRequests.length)} node(s) still need configuration.`,
				completedNodes: validCompletedNodes,
				skippedNodes,
				failedNodes: mergedFailedNodes,
				updatedNodes,
				updatedConnections,
			};
		}

		return {
			success: true,
			completedNodes: validCompletedNodes,
			failedNodes: mergedFailedNodes,
			updatedNodes,
			updatedConnections,
		};
	} catch (error) {
		return {
			success: false,
			error: `Workflow apply failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

async function handlePublish(
	context: InstanceAiContext,
	input: PublishInput,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as { approved: boolean } | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<unknown>) | undefined;
	const hasNamedVersions = !!context.workflowService.updateVersion;

	if (context.permissions?.publishWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const supportingWorkflowIds = await resolveSupportingWorkflowIds(context, input.workflowId);
	const needsApproval = context.permissions?.publishWorkflow !== 'always_allow';

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await resolveWorkflowName(context, input.workflowId);
		const dependencyNote =
			supportingWorkflowIds.length > 0
				? ` and ${String(supportingWorkflowIds.length)} referenced supporting workflow(s)`
				: '';

		const suspension = await suspend?.({
			requestId: nanoid(),
			message: input.versionId
				? `Publish version "${input.versionId}" of workflow "${workflowName}" (ID: ${input.workflowId})${dependencyNote}?`
				: `Publish workflow "${workflowName}" (ID: ${input.workflowId})${dependencyNote}?`,
			severity: 'warning' as const,
		});
		return suspension ?? { success: false, denied: true, reason: 'Awaiting confirmation' };
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	try {
		const previousActiveVersionIds = await snapshotActiveVersionIds(context, [
			...supportingWorkflowIds,
			input.workflowId,
		]);
		const publishedSupportingWorkflowIds: string[] = [];
		const publishedWorkflowIds: string[] = [];

		try {
			for (const supportingWorkflowId of supportingWorkflowIds) {
				await context.workflowService.publish(supportingWorkflowId);
				publishedSupportingWorkflowIds.push(supportingWorkflowId);
				publishedWorkflowIds.push(supportingWorkflowId);
			}

			const result = await context.workflowService.publish(input.workflowId, {
				versionId: input.versionId,
				...(hasNamedVersions
					? {
							name: input.name,
							description: input.description,
						}
					: {}),
			});
			publishedWorkflowIds.push(input.workflowId);

			return {
				success: true,
				activeVersionId: result.activeVersionId,
				publishedWorkflowIds,
				...(publishedSupportingWorkflowIds.length > 0
					? { supportingWorkflowIds: publishedSupportingWorkflowIds }
					: {}),
			};
		} catch (error) {
			const rollback = await rollbackPublishedWorkflows(
				context,
				previousActiveVersionIds,
				publishedWorkflowIds,
			);
			return buildPublishFailure(error, rollback);
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Publish failed',
		};
	}
}

async function snapshotActiveVersionIds(
	context: InstanceAiContext,
	workflowIds: string[],
): Promise<Map<string, string | null>> {
	const activeVersionIds = new Map<string, string | null>();

	for (const workflowId of workflowIds) {
		const workflow = await context.workflowService.get(workflowId);
		activeVersionIds.set(workflowId, workflow.activeVersionId);
	}

	return activeVersionIds;
}

async function rollbackPublishedWorkflows(
	context: InstanceAiContext,
	previousActiveVersionIds: Map<string, string | null>,
	publishedWorkflowIds: string[],
): Promise<PublishRollbackResult> {
	const result: PublishRollbackResult = {
		rolledBackWorkflowIds: [],
		rollbackErrors: [],
	};

	for (const workflowId of publishedWorkflowIds.toReversed()) {
		try {
			const previousActiveVersionId = previousActiveVersionIds.get(workflowId);
			if (previousActiveVersionId) {
				await context.workflowService.publish(workflowId, { versionId: previousActiveVersionId });
			} else {
				await context.workflowService.unpublish(workflowId);
			}
			result.rolledBackWorkflowIds.push(workflowId);
		} catch (error) {
			result.rollbackErrors.push({
				workflowId,
				error: error instanceof Error ? error.message : 'Rollback failed',
			});
		}
	}

	return result;
}

function buildPublishFailure(error: unknown, rollback: PublishRollbackResult) {
	return {
		success: false,
		error: error instanceof Error ? error.message : 'Publish failed',
		...(rollback.rolledBackWorkflowIds.length > 0
			? { rolledBackWorkflowIds: rollback.rolledBackWorkflowIds }
			: {}),
		...(rollback.rollbackErrors.length > 0 ? { rollbackErrors: rollback.rollbackErrors } : {}),
	};
}

async function resolveSupportingWorkflowIds(
	context: InstanceAiContext,
	workflowId: string,
): Promise<string[]> {
	try {
		const workflowJson = await context.workflowService.getAsWorkflowJSON(workflowId);
		return getReferencedWorkflowIds(workflowJson).filter(
			(supportingWorkflowId) => supportingWorkflowId !== workflowId,
		);
	} catch {
		return [];
	}
}

async function handleUnpublish(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'unpublish' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as { approved: boolean } | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<unknown>) | undefined;

	if (context.permissions?.publishWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.publishWorkflow !== 'always_allow';

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await resolveWorkflowName(context, input.workflowId);
		const suspension = await suspend?.({
			requestId: nanoid(),
			message: `Unpublish workflow "${workflowName}" (ID: ${input.workflowId})?`,
			severity: 'warning' as const,
		});
		return suspension ?? { success: false, denied: true, reason: 'Awaiting confirmation' };
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	try {
		await context.workflowService.unpublish(input.workflowId);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unpublish failed',
		};
	}
}

async function handleListVersions(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'list-versions' }>,
) {
	const versions = await context.workflowService.listVersions!(input.workflowId, {
		limit: input.limit,
		skip: input.skip,
	});
	return { versions };
}

async function handleGetVersion(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'get-version' }>,
) {
	return await context.workflowService.getVersion!(input.workflowId, input.versionId);
}

async function handleRestoreVersion(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'restore-version' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as { approved: boolean } | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<unknown>) | undefined;

	if (context.permissions?.restoreWorkflowVersion === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.restoreWorkflowVersion !== 'always_allow';

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const version = await context.workflowService.getVersion!(
			input.workflowId,
			input.versionId,
		).catch(() => undefined);
		const timestamp = version?.createdAt ? formatTimestamp(version.createdAt) : undefined;
		const versionLabel = version?.name
			? `"${version.name}" (${timestamp})`
			: `"${input.versionId}" (${timestamp ?? 'unknown date'})`;

		const suspension = await suspend?.({
			requestId: nanoid(),
			message: `Restore workflow to version ${versionLabel}? This will overwrite the current draft.`,
			severity: 'warning' as const,
		});
		return suspension ?? { success: false, denied: true, reason: 'Awaiting confirmation' };
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	try {
		await context.workflowService.restoreVersion!(input.workflowId, input.versionId);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Restore failed',
		};
	}
}

async function handleUpdateVersion(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'update-version' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	// Gated under `updateWorkflow` — version metadata edits are workflow-record
	// mutations, treated the same as live-workflow updates.
	const resumeData = ctx?.agent?.resumeData as { approved: boolean } | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

	if (context.permissions?.updateWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.updateWorkflow !== 'always_allow';

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const fields: string[] = [];
		if (input.name !== undefined) fields.push(`name to ${formatFieldValue(input.name)}`);
		if (input.description !== undefined) {
			fields.push(`description to ${formatFieldValue(input.description)}`);
		}
		const summary = fields.length > 0 ? fields.join(', ') : 'metadata';

		await suspend?.({
			requestId: nanoid(),
			message: `Update workflow version "${input.versionId}" — set ${summary}?`,
			severity: 'info' as const,
		});
		return { success: false };
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	try {
		await context.workflowService.updateVersion!(input.workflowId, input.versionId, {
			name: input.name,
			description: input.description,
		});
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Update failed',
		};
	}
}

function formatFieldValue(value: string | null): string {
	if (value === null) return '(cleared)';
	return `"${value}"`;
}

function formatWorkflowActionList(actions: readonly WorkflowAction[]): string {
	const labels = actions.map((action) => WORKFLOW_ACTION_LABELS[action]);
	if (labels.length <= 2) return labels.join(' and ');

	const lastLabel = labels[labels.length - 1];
	return `${labels.slice(0, -1).join(', ')}, and ${lastLabel}`;
}

function getToolDescription(context: InstanceAiContext, options: WorkflowsToolOptions): string {
	const supportedSchemas = getSupportedWorkflowActionSchemas(context);
	const actionList = formatWorkflowActionList(getWorkflowActions(supportedSchemas, options));
	const description = `${options.descriptionPrefix ?? 'Manage workflows'} — ${actionList}.`;
	const suffix =
		options.descriptionSuffix ??
		(options.descriptionPrefix
			? undefined
			: 'Workflow results use activeVersionId: null for unpublished workflows.');

	return suffix ? `${description} ${suffix}` : description;
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createWorkflowsTool(
	context: InstanceAiContext,
	options: WorkflowsToolOptions = {},
) {
	// Closure state for the setup action's suspend/resume cycle
	const setupState: { currentRequestId: string | null; preTestSnapshot: WorkflowJSON | null } = {
		currentRequestId: null,
		preTestSnapshot: null,
	};

	const inputSchema = buildInputSchema(context, options);

	return createTool({
		id: 'workflows',
		description: getToolDescription(context, options),
		inputSchema,
		suspendSchema,
		resumeSchema,
		execute: async (input: Input, ctx) => {
			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'get':
					return await handleGet(context, input);
				case 'get-as-code':
					return await handleGetAsCode(context, input);
				case 'delete':
					return await handleDelete(context, input, ctx);
				case 'unarchive':
					return await handleUnarchive(context, input, ctx);
				case 'setup':
					return await handleSetup(context, input, ctx, setupState);
				case 'publish':
					return await handlePublish(context, input, ctx);
				case 'unpublish':
					return await handleUnpublish(context, input, ctx);
				case 'list-versions':
					return await handleListVersions(context, input);
				case 'get-version':
					return await handleGetVersion(context, input);
				case 'restore-version':
					return await handleRestoreVersion(context, input, ctx);
				case 'update-version':
					return await handleUpdateVersion(context, input, ctx);
				default:
					return { error: `Unknown action: ${(input as { action: string }).action}` };
			}
		},
	});
}
