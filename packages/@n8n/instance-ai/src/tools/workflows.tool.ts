/**
 * Consolidated workflows tool — list, get, get-json, get-as-code, delete/archive,
 * unarchive, setup, publish, unpublish, list-versions, restore-version,
 * update-version.
 */
import { Tool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { formatTimestamp } from '../utils/format-timestamp';
import { setupSuspendSchema, setupResumeSchema } from './workflows/setup-workflow.schema';
import {
	analyzeWorkflow,
	applyNodeChanges,
	buildCompletedReport,
} from './workflows/setup-workflow.service';
import {
	isSmallPayload,
	STRUCTURE_ONLY_NOTE,
	summarizeWorkflowStructure,
} from './workflows/summarize-workflow';
import { validateWorkflowConfig } from './workflows/validate-workflow.service';
import { refreshWorkflowSourceFileBindingFromWorkflow } from './workflows/workflow-file-bindings';
import { getReferencedWorkflowIds } from './workflows/workflow-json-utils';

// ── Action schemas ──────────────────────────────────────────────────────────

const listAction = z.object({
	action: z
		.literal('list')
		.describe('List workflows accessible to the current user. Use for workflow inspection.'),
	query: z.string().optional().describe('Filter workflows by name'),
	limit: z.number().int().positive().max(100).optional().describe('Max results to return'),
	status: z
		.enum(['active', 'archived', 'all'])
		.optional()
		.describe(
			'Which workflows to list. Defaults to active; use archived to find workflows that can be restored.',
		),
	scope: z
		.enum(['project', 'instance'])
		.optional()
		.describe(
			"Which project(s) to search. Defaults to this conversation's project. Use 'instance' only when you have a clear reason to look across all projects you can access.",
		),
});

const getAction = z.object({
	action: z
		.literal('get')
		.describe(
			'Inspect a workflow: metadata plus its structure as SDK code. Large workflows omit node parameters unless full is set; small ones include them. Pass versionId to inspect a past version instead of the current draft.',
		),
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().optional().describe('Version ID'),
	full: z
		.boolean()
		.optional()
		.describe('Return complete node data including parameters (large). Default false.'),
});

const getJsonAction = z.object({
	action: z
		.literal('get-json')
		.describe(
			'Get full WorkflowJSON for workspace-file workflow edits. Write it to a .workflow.json file, edit the file, then save with build-workflow. Pass versionId for a past version instead of the current draft.',
		),
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().optional().describe('Version ID'),
});

const getAsCodeAction = z.object({
	action: z
		.literal('get-as-code')
		.describe(
			'Convert an existing workflow to TypeScript SDK code. Call before precise patches when you need the current code. Pass versionId for a past version instead of the current draft.',
		),
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().optional().describe('Version ID'),
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
		.describe(
			'Open the inline AI Assistant workflow setup card for credential and parameter configuration. Use for setup routing after a build.',
		),
	workflowId: z.string().describe('ID of the workflow'),
	projectId: z.string().optional().describe('Project ID to scope credential creation to'),
});

const validateAction = z.object({
	action: z
		.literal('validate')
		.describe(
			'Return the per-node configuration issues a human would see as red warning indicators on the canvas: missing credentials, parameter validation errors, etc. Static check (does not execute the workflow). Use this to confirm a workflow is configured correctly before suggesting the user run or publish it.',
		),
	workflowId: z.string().describe('ID of the workflow'),
	ignoreIssues: z
		.array(z.enum(['parameters', 'credentials', 'input', 'execution', 'typeUnknown']))
		.optional()
		.describe('Issue categories to suppress from the result'),
});

const updateAction = z.object({
	action: z
		.literal('update')
		.describe(
			'Internal/raw update escape hatch. Save a complete modified WorkflowJSON back to the workflow. Replaces the full workflow definition.',
		),
	workflowId: z.string().describe('ID of the workflow'),
	workflow: z
		.record(z.unknown())
		.describe(
			'Full WorkflowJSON object (same shape as returned by `get-json`). This completely replaces the current workflow definition — ensure name, nodes, and connections are all included.',
		),
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

interface WorkflowToolContext {
	resumeData: z.infer<typeof resumeSchema> | undefined;
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>;
}

// ── Input type ──────────────────────────────────────────────────────────────

// Explicit union of all possible action inputs so handlers get proper types
// regardless of which dynamic subset the schema actually includes.
type Input =
	| z.infer<typeof listAction>
	| z.infer<typeof getAction>
	| z.infer<typeof getJsonAction>
	| z.infer<typeof getAsCodeAction>
	| z.infer<typeof deleteAction>
	| z.infer<typeof unarchiveAction>
	| z.infer<typeof setupAction>
	| z.infer<typeof validateAction>
	| z.infer<typeof updateAction>
	| z.infer<typeof publishExtendedAction>
	| z.infer<typeof unpublishAction>
	| z.infer<typeof listVersionsAction>
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
	| 'get-json'
	| 'get-as-code'
	| 'delete'
	| 'unarchive'
	| 'setup'
	| 'validate'
	| 'update'
	| 'publish'
	| 'unpublish'
	| 'list-versions'
	| 'restore-version'
	| 'update-version';

type WorkflowActionSchema = z.ZodDiscriminatedUnionOption<'action'>;

export interface WorkflowsToolOptions {
	allowedActions?: readonly WorkflowAction[];
	descriptionPrefix?: string;
	descriptionSuffix?: string;
	surface?: 'full' | 'orchestrator';
}

type WorkflowsToolOptionsInput = WorkflowsToolOptions | 'full' | 'orchestrator';

const WORKFLOW_ACTION_ORDER = [
	'list',
	'get',
	'get-json',
	'get-as-code',
	'delete',
	'unarchive',
	'setup',
	'validate',
	'update',
	'publish',
	'unpublish',
	'list-versions',
	'restore-version',
	'update-version',
] as const satisfies readonly WorkflowAction[];

const WORKFLOW_ACTION_LABELS = {
	list: 'list',
	get: 'inspect',
	'get-json': 'inspect full WorkflowJSON',
	'get-as-code': 'convert existing workflows to TypeScript SDK code',
	delete: 'archive',
	unarchive: 'restore archived workflows',
	setup: 'set up credentials and parameters',
	validate: 'validate configuration',
	update: 'save a modified WorkflowJSON',
	publish: 'publish',
	unpublish: 'unpublish',
	'list-versions': 'list versions',
	'restore-version': 'restore versions',
	'update-version': 'update version metadata',
} satisfies Record<WorkflowAction, string>;

function normalizeOptions(options: WorkflowsToolOptionsInput = {}): WorkflowsToolOptions {
	return typeof options === 'string' ? { surface: options } : options;
}

function getSupportedWorkflowActionSchemas(
	context: InstanceAiContext,
	surface: 'full' | 'orchestrator' = 'full',
): Partial<Record<WorkflowAction, WorkflowActionSchema>> {
	const hasNamedVersions = !!context.workflowService.updateVersion;
	const hasVersions = !!context.workflowService.listVersions;

	return {
		list: listAction,
		get: getAction,
		'get-json': getJsonAction,
		'get-as-code': getAsCodeAction,
		delete: deleteAction,
		unarchive: unarchiveAction,
		setup: setupAction,
		validate: validateAction,
		...(surface !== 'orchestrator' ? { update: updateAction } : {}),
		publish: hasNamedVersions ? publishExtendedAction : publishBaseAction,
		unpublish: unpublishAction,
		...(hasVersions
			? {
					'list-versions': listVersionsAction,
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
	const supportedSchemas = getSupportedWorkflowActionSchemas(context, options.surface);
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
		...(input.scope ? { scope: input.scope } : {}),
	});
	return { workflows };
}

async function handleGet(context: InstanceAiContext, input: Extract<Input, { action: 'get' }>) {
	// Convert hallucinated-id errors into structured not-found responses so the agent stops guessing.
	try {
		if (input.versionId) {
			if (!context.workflowService.getVersion) {
				return {
					workflowId: input.workflowId,
					versionId: input.versionId,
					error: 'Workflow version history is not available on this instance',
				};
			}
			const version = await context.workflowService.getVersion(input.workflowId, input.versionId);
			if (input.full || isSmallPayload(version)) {
				return { workflowId: input.workflowId, ...version };
			}
			const { nodes, connections, ...meta } = version;
			return {
				workflowId: input.workflowId,
				...meta,
				nodeCount: nodes.length,
				structure: await summarizeWorkflowStructure(meta.name ?? '', nodes, connections),
				note: STRUCTURE_ONLY_NOTE,
			};
		}
		const detail = await context.workflowService.get(input.workflowId);
		if (input.full || isSmallPayload(detail)) return detail;
		const { nodes, connections, ...meta } = detail;
		return {
			...meta,
			nodeCount: nodes.length,
			structure: await summarizeWorkflowStructure(meta.name, nodes, connections),
			note: STRUCTURE_ONLY_NOTE,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to fetch workflow';
		const available = await context.workflowService
			.list({ limit: 25 })
			.then((items) => items.map((w) => ({ id: w.id, name: w.name })))
			.catch(() => [] as Array<{ id: string; name: string }>);
		return {
			workflowId: input.workflowId,
			found: false as const,
			error: message,
			availableWorkflows: available,
			hint:
				'No workflow exists with that id. Pick one from `availableWorkflows` or call `workflows(action="list")` for the current set. ' +
				'Do not retry with a guessed id — if the user did not provide one, you are building a new workflow.',
		};
	}
}

async function handleGetJson(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'get-json' }>,
) {
	try {
		return await context.workflowService.getAsWorkflowJSON(input.workflowId, input.versionId);
	} catch (error) {
		return {
			workflowId: input.workflowId,
			found: false as const,
			error: error instanceof Error ? error.message : 'Failed to fetch workflow JSON',
		};
	}
}

async function handleGetAsCode(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'get-as-code' }>,
) {
	const { generateWorkflowCode } = await import('@n8n/workflow-sdk');
	try {
		const json = await context.workflowService.getAsWorkflowJSON(input.workflowId, input.versionId);
		const code = generateWorkflowCode(json);
		// Historical reads must not advance the optimistic-concurrency lock.
		if (!input.versionId) {
			await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);
		}
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
	ctx: WorkflowToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.deleteWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.deleteWorkflow !== 'always_allow';

	// First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await resolveWorkflowName(context, input.workflowId);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Archive ${workflowName} (ID: ${input.workflowId})`,
			severity: 'warning' as const,
		});
	}

	// Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	await context.workflowService.archive(input.workflowId);
	await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);
	return { success: true };
}

async function handleUnarchive(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'unarchive' }>,
	ctx: WorkflowToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.deleteWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.deleteWorkflow !== 'always_allow';

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await resolveWorkflowName(context, input.workflowId);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Restore ${workflowName} (ID: ${input.workflowId})`,
			severity: 'warning' as const,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	await context.workflowService.unarchive(input.workflowId);
	await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);
	return { success: true };
}

type SetupState = { currentRequestId: string | null; preTestSnapshot: WorkflowJSON | null };
type SetupResumeData = NonNullable<WorkflowToolContext['resumeData']>;

/** Run a single trigger node and map the execution status to a setup trigger-test result. */
async function runTriggerTest(
	context: InstanceAiContext,
	workflowId: string,
	triggerNodeName: string,
): Promise<{ status: 'success' | 'error' | 'listening'; error?: string }> {
	try {
		const result = await context.executionService.run(workflowId, undefined, {
			timeout: 30_000,
			triggerNodeName,
		});
		if (result.status === 'success') return { status: 'success' };
		if (result.status === 'waiting') return { status: 'listening' };
		return { status: 'error', error: result.error ?? 'Trigger test failed' };
	} catch (error) {
		return {
			status: 'error',
			error: error instanceof Error ? error.message : 'Trigger test failed',
		};
	}
}

/** Collect nodes whose applied credential failed its test, so they move from completed to failed. */
function collectCredentialTestFailures(
	remainingRequests: Awaited<ReturnType<typeof analyzeWorkflow>>,
	credentials: Record<string, Record<string, string>> | undefined,
): Array<{ nodeName: string; error: string }> {
	const failures: Array<{ nodeName: string; error: string }> = [];
	for (const req of remainingRequests) {
		if (
			req.credentialTestResult &&
			!req.credentialTestResult.success &&
			req.credentialType &&
			credentials?.[req.node.name]?.[req.credentialType]
		) {
			failures.push({
				nodeName: req.node.name,
				error: `Credential test failed for ${req.credentialType}: ${req.credentialTestResult.message ?? 'Invalid credentials'}`,
			});
		}
	}
	return failures;
}

/** Setup state 3: persist setup, run the trigger, and re-suspend with the refreshed requests. */
async function handleSetupTestTrigger(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'setup' }>,
	ctx: WorkflowToolContext,
	state: SetupState,
	resumeData: SetupResumeData,
	testTriggerNode: string,
) {
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

	const triggerTestResult = await runTriggerTest(context, input.workflowId, testTriggerNode);

	const refreshedRequests = await analyzeWorkflow(context, input.workflowId, {
		[testTriggerNode]: triggerTestResult,
	});

	// Generate a new requestId so the frontend doesn't filter it
	// as already-resolved from the previous suspend cycle
	state.currentRequestId = nanoid();

	return await ctx.suspend({
		requestId: state.currentRequestId,
		message: 'Configure credentials for your workflow',
		severity: 'info' as const,
		setupRequests: refreshedRequests,
		workflowId: input.workflowId,
		...(input.projectId ? { projectId: input.projectId } : {}),
	});
}

/** Setup state 4: apply credentials and parameters atomically and report the outcome. */
async function handleSetupApply(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'setup' }>,
	state: SetupState,
	resumeData: SetupResumeData,
) {
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
		const completedNodes = buildCompletedReport(
			resumeData.credentials,
			resumeData.nodeParameters,
			applyResult.applied,
		);

		// Detect credentials that were applied but failed testing.
		const credTestFailures = collectCredentialTestFailures(
			remainingRequests,
			resumeData.credentials,
		);

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

async function handleSetup(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'setup' }>,
	ctx: WorkflowToolContext,
	state: SetupState,
) {
	// `setup` mutates workflow nodes via applyNodeChanges (credentials and
	// parameters are workflow-record fields), so it's gated under
	// `updateWorkflow` like other workflow-mutating actions.
	if (context.permissions?.updateWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const resumeData = ctx.resumeData;

	// State 1: Analyze workflow and suspend for user setup
	if (resumeData === undefined || resumeData === null) {
		const setupRequests = await analyzeWorkflow(context, input.workflowId);

		if (setupRequests.length === 0) {
			return { success: true, reason: 'No nodes require setup.' };
		}

		state.currentRequestId = nanoid();

		return await ctx.suspend({
			requestId: state.currentRequestId,
			message: 'Configure credentials for your workflow',
			severity: 'info' as const,
			setupRequests,
			workflowId: input.workflowId,
			...(input.projectId ? { projectId: input.projectId } : {}),
		});
	}

	// State 2: User declined — revert any trigger-test changes
	if (!resumeData.approved) {
		if (state.preTestSnapshot) {
			await context.workflowService.updateFromWorkflowJSON(input.workflowId, state.preTestSnapshot);
			await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);
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
		return await handleSetupTestTrigger(
			context,
			input,
			ctx,
			state,
			resumeData,
			resumeData.testTriggerNode,
		);
	}

	// State 4: Apply — save credentials and parameters atomically
	return await handleSetupApply(context, input, state, resumeData);
}

async function handleValidate(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'validate' }>,
) {
	try {
		return await validateWorkflowConfig(context, {
			workflowId: input.workflowId,
			ignoreIssues: input.ignoreIssues,
		});
	} catch (error) {
		return {
			workflowId: input.workflowId,
			issues: {} as Record<string, never>,
			summary: [] as string[],
			valid: false,
			error: error instanceof Error ? error.message : 'Failed to validate workflow',
		};
	}
}

function isWorkflowJson(value: unknown): value is WorkflowJSON {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		Array.isArray(value.nodes) &&
		isRecord(value.connections)
	);
}

async function handleUpdate(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'update' }>,
	ctx: WorkflowToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.updateWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.updateWorkflow !== 'always_allow';

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await resolveWorkflowName(context, input.workflowId);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Update workflow "${workflowName}" (ID: ${input.workflowId})?`,
			severity: 'warning' as const,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	if (!isWorkflowJson(input.workflow)) {
		return {
			success: false,
			error: 'Workflow JSON must include name, nodes, and connections.',
		};
	}

	try {
		await context.workflowService.updateFromWorkflowJSON(input.workflowId, input.workflow);
		await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);
		return { success: true, workflowId: input.workflowId };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

async function handlePublish(
	context: InstanceAiContext,
	input: PublishInput,
	ctx: WorkflowToolContext,
) {
	const resumeData = ctx.resumeData;
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

		return await ctx.suspend({
			requestId: nanoid(),
			message: input.versionId
				? `Publish version ${input.versionId} of ${workflowName} (ID: ${input.workflowId})${dependencyNote}`
				: `Publish ${workflowName} (ID: ${input.workflowId})${dependencyNote}`,
			severity: 'warning' as const,
		});
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
				await refreshWorkflowSourceFileBindingFromWorkflow(context, supportingWorkflowId);
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
			await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);

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
			await refreshWorkflowSourceFileBindingFromWorkflow(context, workflowId);
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
	ctx: WorkflowToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.publishWorkflow === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.publishWorkflow !== 'always_allow';

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await resolveWorkflowName(context, input.workflowId);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Unpublish ${workflowName} (ID: ${input.workflowId})`,
			severity: 'warning' as const,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	try {
		await context.workflowService.unpublish(input.workflowId);
		await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);
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

async function handleRestoreVersion(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'restore-version' }>,
	ctx: WorkflowToolContext,
) {
	const resumeData = ctx.resumeData;

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

		return await ctx.suspend({
			requestId: nanoid(),
			message: `Restore to version ${versionLabel}`,
			severity: 'warning' as const,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	try {
		await context.workflowService.restoreVersion!(input.workflowId, input.versionId);
		await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);
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
	ctx: WorkflowToolContext,
) {
	// Gated under `updateWorkflow` — version metadata edits are workflow-record
	// mutations, treated the same as live-workflow updates.
	const resumeData = ctx.resumeData;

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

		return await ctx.suspend({
			requestId: nanoid(),
			message: `Update version ${input.versionId} — set ${summary}`,
			severity: 'info' as const,
		});
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
	const supportedSchemas = getSupportedWorkflowActionSchemas(context, options.surface);
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
	optionsInput: WorkflowsToolOptionsInput = {},
) {
	const options = normalizeOptions(optionsInput);
	// Closure state for the setup action's suspend/resume cycle
	const setupState: { currentRequestId: string | null; preTestSnapshot: WorkflowJSON | null } = {
		currentRequestId: null,
		preTestSnapshot: null,
	};

	const inputSchema = buildInputSchema(context, options);

	return new Tool('workflows')
		.description(getToolDescription(context, options))
		.input(inputSchema)
		.suspend(suspendSchema)
		.resume(resumeSchema)
		.handler(async (input, ctx) => {
			const workflowInput = input as Input;
			switch (workflowInput.action) {
				case 'list':
					return await handleList(context, workflowInput);
				case 'get':
					return await handleGet(context, workflowInput);
				case 'get-json':
					return await handleGetJson(context, workflowInput);
				case 'get-as-code':
					return await handleGetAsCode(context, workflowInput);
				case 'delete':
					return await handleDelete(context, workflowInput, ctx);
				case 'unarchive':
					return await handleUnarchive(context, workflowInput, ctx);
				case 'setup':
					return await handleSetup(context, workflowInput, ctx, setupState);
				case 'validate':
					return await handleValidate(context, workflowInput);
				case 'update':
					return await handleUpdate(context, workflowInput, ctx);
				case 'publish':
					return await handlePublish(context, workflowInput, ctx);
				case 'unpublish':
					return await handleUnpublish(context, workflowInput, ctx);
				case 'list-versions':
					return await handleListVersions(context, workflowInput);
				case 'restore-version':
					return await handleRestoreVersion(context, workflowInput, ctx);
				case 'update-version':
					return await handleUpdateVersion(context, workflowInput, ctx);
				default:
					return { error: `Unknown action: ${(workflowInput as { action: string }).action}` };
			}
		})
		.build();
}
