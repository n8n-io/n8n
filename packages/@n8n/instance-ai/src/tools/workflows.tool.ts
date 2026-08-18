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
import { WorkflowSaveConflictError } from '../errors/workflow-save-conflict.error';
import type { InstanceAiContext } from '../types';
import {
	findSetupHintProblems,
	INVALID_SETUP_HINT_MESSAGE,
	setupHintField,
	TEMPLATABLE_PLAIN_AUTH_TYPES,
} from './credentials.tool';
import { formatTimestamp } from '../utils/format-timestamp';
import {
	getObservedWorkflowChecksum,
	rememberCurrentWorkflowChecksum,
	rememberObservedWorkflowChecksum,
} from './workflows/observed-workflow-checksums';
import {
	completedSetupSubjects,
	describeSkippedSetup,
	forgetSkippedSetup,
	getSkippedSetupSubjects,
	partitionSkippedSetupRequests,
	rememberSkippedSetup,
	resolveReopenTargets,
	setupSkipSubject,
	SKIPPED_SETUP_GUIDANCE,
} from './workflows/setup-skip-state';
import { setupSuspendSchema, setupResumeSchema } from './workflows/setup-workflow.schema';
import type { SetupRequest } from './workflows/setup-workflow.schema';
import {
	analyzeWorkflow,
	applyCredentialHints,
	applyNodeChanges,
	buildCompletedReport,
} from './workflows/setup-workflow.service';
import {
	isSmallPayload,
	STRUCTURE_ONLY_NOTE,
	summarizeWorkflowStructure,
} from './workflows/summarize-workflow';
import { validateWorkflowConfig } from './workflows/validate-workflow.service';
import {
	grantSessionWorkflowUpdate,
	canSkipWorkflowUpdateHitl,
} from './workflows/workflow-build-context';
import { refreshWorkflowSourceFileBindingFromWorkflow } from './workflows/workflow-file-bindings';
import { getReferencedWorkflowIds } from './workflows/workflow-json-utils';

// ── Action schemas ──────────────────────────────────────────────────────────

// `list` and `setup` share this field, and the schema sanitizer requires one
// description per shared field, so it has to cover both uses.
const PROJECT_ID_FIELD_DESCRIPTION =
	'Project ID, obtainable from `workspace(action="list-projects")`. For `list`: read that one project instead of the default scope — use it for "what is in project X" rather than listing the whole instance and guessing which results belong to X. Read-only, so it narrows what you can already see rather than widening it, and it does not move where you can write. For `setup`: scope credential creation to that project.';

const listAction = z.object({
	action: z
		.literal('list')
		.describe(
			'List workflows accessible to the current user. Use for workflow inspection. Call it without `query` to get the complete inventory in scope — the result reports how many workflows a filter or the limit left out.',
		),
	query: z
		.string()
		.optional()
		.describe(
			'Substring filter on the workflow NAME only — it does not match node types, descriptions, or what a workflow does. Omit it whenever you need the actual inventory (what exists here, project status, what to do next): a name-filtered list is not the set of workflows in scope. Use it only when the user named a workflow, or to locate one you already know exists.',
		),
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
	projectId: z.string().optional().describe(PROJECT_ID_FIELD_DESCRIPTION),
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
	projectId: z.string().optional().describe(PROJECT_ID_FIELD_DESCRIPTION),
	credentialHints: z
		.array(
			setupHintField.extend({
				nodeName: z
					.string()
					.optional()
					.describe(
						'Restrict the recipe to one node — needed when several nodes use Simplified Custom Auth for different services.',
					),
			}),
		)
		.optional()
		.describe(
			'Recipes for the Simplified Custom Auth credentials the user will create during setup: the card pre-fills the template and asks only for the placeholder values. Provide one per templated credential. REQUIRED before composing: load the `credential-recipe-research` skill and execute its lookup procedure — the template and testUrl must come from provider pages fetched there, never from memory.',
		),
	allowPlainGenericAuth: z
		.boolean()
		.optional()
		.describe(
			'Set ONLY when the user explicitly chose a plain generic auth type (Bearer/Header/Query/Custom Auth) for a new credential, or the workflow pre-existed with it. Otherwise setup rejects new plain generic credentials on HTTP Request nodes in favor of Simplified Custom Auth.',
		),
	reopenSkipped: z
		.array(z.string())
		.optional()
		.describe(
			'Credential types (or node names) the user has just explicitly asked to configure after skipping them earlier — e.g. ["slackApi"] for "connect Slack now". Use the `reopenWith` value setup reported for that card. Anything the user skipped and did not ask about stays out of the card; without this, setup reports skipped credentials instead of re-opening them. An entry matching nothing in the workflow comes back as `unknown_reopen_target` with the list to choose from.',
		),
	includeAllNodes: z
		.boolean()
		.optional()
		.describe(
			'By default, setup after a build covers only the nodes that build changed. Set to true to cover every node in the workflow — ONLY when the user explicitly asked to set up the whole workflow or a node the last build did not touch. Cards the user skipped stay out unless named in `reopenSkipped`.',
		),
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

const confirmationSuspendSchema = setupSuspendSchema
	.pick({
		requestId: true,
		message: true,
		severity: true,
		workflowId: true,
	})
	.partial({ workflowId: true });

const suspendSchema = z.union([setupSuspendSchema, confirmationSuspendSchema]);

// Resume: setup-specific fields plus optional session scope for generic approvals
// (e.g. update "always allow" → persist `workflows:update:<id>`).
const resumeSchema = setupResumeSchema.extend({
	scope: z.enum(['once', 'session']).optional(),
});

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
	const { workflows, total, totalInScope } = await context.workflowService.list({
		limit: input.limit,
		query: input.query,
		...(input.status ? { status: input.status } : {}),
		...(input.scope ? { scope: input.scope } : {}),
		...(input.projectId ? { projectId: input.projectId } : {}),
	});

	// A partial list must never read as the complete inventory: guessed name
	// filters used to silently hide the rest of a project's workflows.
	const notes: string[] = [];
	if (input.query !== undefined && totalInScope > total) {
		notes.push(
			`Name filter "${input.query}" matched ${total} of ${totalInScope} workflows in scope — ${totalInScope - total} are hidden. This is NOT the full set: re-run without \`query\` before answering anything about what exists here.`,
		);
	}
	if (total > workflows.length) {
		notes.push(
			`Showing ${workflows.length} of ${total} matching workflows — raise \`limit\` to see the rest.`,
		);
	}
	// Attribution is attached whenever the query was not narrowed to one project, so
	// count the projects actually present rather than trusting the field's presence —
	// an instance-wide list can still return a single project's workflows, and saying
	// it spans projects would be a claim the rows do not support. Only a genuine
	// multi-project result invites the mistake this warns about: reading membership
	// off count differences works for two projects and silently fails for three.
	const projectCount = new Set(workflows.flatMap((workflow) => workflow.project?.id ?? [])).size;
	if (projectCount > 1) {
		notes.push(
			`Results span ${projectCount} projects — each workflow carries its owning \`project\`. Read membership from that field; never infer it by subtracting one scope's count from another. To list a single project, pass its \`projectId\`.`,
		);
	}

	return {
		workflows,
		total,
		totalInScope,
		...(notes.length > 0 ? { note: notes.join(' ') } : {}),
	};
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
		await rememberObservedWorkflowChecksum(context, input.workflowId, detail.checksum);
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
			.then(({ workflows }) => workflows.map((w) => ({ id: w.id, name: w.name })))
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
		const json = await context.workflowService.getAsWorkflowJSON(input.workflowId, input.versionId);
		// This is the graph the agent edits before `update`, so pin the state it
		// saw. Historical reads must not advance the optimistic-concurrency lock.
		if (!input.versionId) {
			await rememberCurrentWorkflowChecksum(context, input.workflowId);
		}
		return json;
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
		// Emit node ids: this code is edited and built back into the same saved workflow,
		// and carrying the ids through is what keeps node identity stable.
		const code = generateWorkflowCode({ workflow: json, includeNodeIds: true });
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
	// Re-derived from scratch, so it has to be partitioned again: this is the second path that
	// builds the panel, and without it a trigger test mid-session puts back the cards state 1
	// left out.
	const { pending: refreshedPending } = partitionSkippedSetupRequests(
		refreshedRequests,
		input.workflowId,
		getSkippedSetupSubjects(context),
	);
	applyCredentialHints(refreshedPending, input.credentialHints);

	// Generate a new requestId so the frontend doesn't filter it
	// as already-resolved from the previous suspend cycle
	state.currentRequestId = nanoid();

	// The thread-bound project is authoritative for credential scoping; without
	// it the frontend falls back to the user's personal project and offers
	// credentials from outside the conversation's project.
	const projectId = context.projectId ?? input.projectId;

	return await ctx.suspend({
		requestId: state.currentRequestId,
		message: 'Configure credentials for your workflow',
		severity: 'info' as const,
		setupRequests: refreshedPending,
		workflowId: input.workflowId,
		...(projectId ? { projectId } : {}),
	});
}

/**
 * Fold the panel's skip decisions into the thread's skip memory and return the requests
 * that are now suppressed. Anything just configured wins over a skip of the same subject:
 * two nodes can share a credential type, and a configured credential isn't a declined one.
 */
async function reconcileSetupSkips(
	context: InstanceAiContext,
	args: {
		workflowId: string;
		requests: readonly SetupRequest[];
		skippedNodeNames: readonly string[];
		/** The applied report — `credentialType` is set only where a credential was applied. */
		completed: ReadonlyArray<{ nodeName: string; credentialType?: string }>;
	},
): Promise<SetupRequest[]> {
	const byNodeName = new Map(args.requests.map((request) => [request.node.name, request]));

	const completedSubjects = new Set(completedSetupSubjects(args.completed, args.workflowId));
	await forgetSkippedSetup(context, completedSubjects);

	const newlySkipped = args.skippedNodeNames
		.map((name) => byNodeName.get(name))
		.filter((request): request is SetupRequest => request !== undefined)
		.filter(
			(request) =>
				request.needsAction && !completedSubjects.has(setupSkipSubject(request, args.workflowId)),
		);
	await rememberSkippedSetup(context, newlySkipped, args.workflowId);

	const skipped = getSkippedSetupSubjects(context);
	return args.requests.filter(
		(request) => request.needsAction && skipped.has(setupSkipSubject(request, args.workflowId)),
	);
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
		// "this still requires user intervention". Settled requests are kept so
		// a just-applied credential whose test failed stays reportable below —
		// a bound credential is settled for routing even when its test fails.
		const remainingRequests = await analyzeWorkflow(context, input.workflowId, undefined, {
			includeSettled: true,
		});
		const completedNodes = buildCompletedReport(
			resumeData.credentials,
			resumeData.nodeParameters,
			applyResult.applied,
		);

		// The user dismissing a card and a card merely being unconfigured look identical in
		// the re-analysis, so the panel tells us which ones were dismissed. Record those for
		// the rest of the thread, and drop the record for anything just configured — a
		// credential type that now has a working credential is no longer a declined decision.
		const skippedByUser = await reconcileSetupSkips(context, {
			workflowId: input.workflowId,
			requests: remainingRequests,
			skippedNodeNames: resumeData.skippedNodes ?? [],
			completed: completedNodes,
		});
		const skippedSubjects = new Set(
			skippedByUser.map((request) => setupSkipSubject(request, input.workflowId)),
		);
		const pendingRequests = remainingRequests.filter(
			(r) => r.needsAction && !skippedSubjects.has(setupSkipSubject(r, input.workflowId)),
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

		// Reported separately from the nodes that still need setup: these must not be
		// re-opened, so folding them into one list is what made the agent ask again.
		const skippedByUserReport =
			skippedByUser.length > 0
				? {
						skippedByUser: describeSkippedSetup(skippedByUser),
						skippedByUserGuidance: SKIPPED_SETUP_GUIDANCE,
					}
				: {};

		if (pendingRequests.length > 0) {
			// Carry the parameter issues, not just the node name: a value the connected
			// credential can't reach (e.g. a model outside the free-credits allowlist) is
			// only actionable if the caller learns which value was wrong, so it can replace
			// it and say what it changed.
			const nodesStillNeedingSetup = pendingRequests.map((r) => ({
				nodeName: r.node.name,
				credentialType: r.credentialType,
				...(r.parameterIssues && Object.keys(r.parameterIssues).length > 0
					? { parameterIssues: r.parameterIssues }
					: {}),
			}));
			return {
				success: true,
				partial: true,
				reason: `Applied setup for ${String(validCompletedNodes.length)} node(s), ${String(pendingRequests.length)} node(s) still need configuration.`,
				completedNodes: validCompletedNodes,
				nodesStillNeedingSetup,
				...skippedByUserReport,
				failedNodes: mergedFailedNodes,
				updatedNodes,
				updatedConnections,
			};
		}

		return {
			success: true,
			completedNodes: validCompletedNodes,
			...skippedByUserReport,
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

/**
 * Node names the latest build for this workflow changed, read from the stored
 * build outcome. Scoping only applies to the build-bound setup handoff — the
 * setup call made in the same run as the build. A setup call in any later run
 * is user-initiated (e.g. "set up my workflow"), so it covers the whole
 * workflow even when an unchanged node is the one the user wants configured.
 * Also undefined when there is no build outcome or it predates change tracking.
 */
async function resolveSetupScopeNodeNames(
	context: InstanceAiContext,
	workflowId: string,
): Promise<string[] | undefined> {
	const workflowTaskService = context.workflowBuildContext?.workflowTaskService;
	if (!workflowTaskService) return undefined;
	try {
		const outcome = await workflowTaskService.getLatestBuildOutcomeForWorkflow(workflowId);
		if (!outcome?.runId || outcome.runId !== context.runId) return undefined;
		return outcome.changedNodeNames;
	} catch (error) {
		// Fail open: an unscoped setup equals the long-standing behavior (shows
		// more, never less), while failing closed would block user-initiated
		// setup on a storage hiccup.
		context.logger.warn('Failed to resolve setup scope from the latest build outcome', {
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
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
		const allSetupRequests = await analyzeWorkflow(context, input.workflowId);

		// The user asked to come back to something they skipped, so that decision no longer
		// holds — drop it before partitioning so the card renders again. Scoped to what they
		// named: anything else they skipped stays skipped.
		//
		// Validated as a whole before anything is forgotten or opened, like the credential-hint
		// and plain-auth checks below. Honouring the entries that resolve and opening the card
		// anyway would drop the rest of what the user asked for with nothing to report it: the
		// card suspends, so this is the last point where the caller can still be told.
		if (input.reopenSkipped && input.reopenSkipped.length > 0) {
			// Matched against every analyzed node, not the build-scoped subset: the user named
			// this card, so a node the last build happened not to touch is still a valid target
			// and must not come back as "nothing matches".
			const { subjects, unmatched } = resolveReopenTargets(
				allSetupRequests,
				input.workflowId,
				input.reopenSkipped,
			);
			if (unmatched.length > 0) {
				const reopenable = describeSkippedSetup(
					partitionSkippedSetupRequests(
						allSetupRequests,
						input.workflowId,
						getSkippedSetupSubjects(context),
					).skippedByUser,
				);
				const named = unmatched.map((entry) => `"${entry}"`).join(', ');
				return {
					error: 'unknown_reopen_target',
					message:
						reopenable.length > 0
							? `Nothing in this workflow matches ${named}. Call setup again passing only \`reopenWith\` values from \`reopenable\`, and tell the user that what they named is not part of this workflow.`
							: `Nothing in this workflow matches ${named}, and nothing in it is currently skipped. Call setup again without \`reopenSkipped\`.`,
					unmatchedReopen: unmatched,
					reopenable,
				};
			}
			await forgetSkippedSetup(context, subjects);
		}

		// Setup after a build covers only the nodes that build changed —
		// pre-existing, unrelated nodes must not surface in the setup card.
		const scopeNodeNames = input.includeAllNodes
			? undefined
			: await resolveSetupScopeNodeNames(context, input.workflowId);
		const scopedRequests = scopeNodeNames
			? allSetupRequests.filter((request) => scopeNodeNames.includes(request.node.name))
			: allSetupRequests;

		// Two reasons a card stays out, applied in order: this build never touched the node, or
		// the user declined it. Partitioning the scoped list keeps them apart in the report —
		// an out-of-scope card is not something the user passed on.
		const { pending: setupRequests, skippedByUser } = partitionSkippedSetupRequests(
			scopedRequests,
			input.workflowId,
			getSkippedSetupSubjects(context),
		);

		// Validated against the workflow's node URLs so a recipe can't set one of
		// the workflow's own (action) endpoints as its probe testUrl. Checked against every
		// analyzed node, not just the pending ones — narrowing it to what the card shows would
		// let a skipped or out-of-scope node's endpoint through.
		const nodeUrls = allSetupRequests.map((request) => request.node.parameters?.url);
		const hintProblems = (input.credentialHints ?? []).flatMap((hint) =>
			findSetupHintProblems(hint, { nodeUrls }).map((problem) =>
				hint.nodeName ? `${hint.nodeName}: ${problem}` : problem,
			),
		);
		if (hintProblems.length > 0) {
			return {
				error: 'invalid_credential_hints',
				message: INVALID_SETUP_HINT_MESSAGE,
				problems: hintProblems,
			};
		}

		applyCredentialHints(setupRequests, input.credentialHints);

		// A provider documenting `Authorization: Bearer <token>` reliably lures the
		// model into httpBearerAuth despite the skill guidance, so new plain generic
		// credentials on HTTP Request nodes are rejected at the tool boundary.
		if (!input.allowPlainGenericAuth) {
			const plainAuthNodes = setupRequests.filter(
				(request) =>
					request.node.type === 'n8n-nodes-base.httpRequest' &&
					request.credentialType !== undefined &&
					TEMPLATABLE_PLAIN_AUTH_TYPES.has(request.credentialType) &&
					(request.existingCredentials ?? []).length === 0,
			);
			if (plainAuthNodes.length > 0) {
				return {
					error: 'plain_generic_auth',
					message:
						'These HTTP Request nodes use a plain generic auth type for a credential that does not exist yet. Change each node\'s genericAuthType to "httpTemplatedCustomAuth" and re-run setup with a credentialHints recipe — even when the provider documents `Authorization: Bearer <token>`, express it as a template ({"headers":{"Authorization":"Bearer {{api_key}}"}}). Only if the user explicitly asked for the plain type (or the workflow pre-existed with it), re-call setup with allowPlainGenericAuth: true.',
					nodes: plainAuthNodes.map((request) => ({
						nodeName: request.node.name,
						credentialType: request.credentialType,
					})),
				};
			}
		}

		if (setupRequests.length === 0) {
			// Two different silences, and the agent has to say different things about them: cards
			// the user declined, and pre-existing nodes this build never touched. Both can hold at
			// once, so neither branch may swallow the other. Named "out of scope" rather than
			// "skipped" because in this file a skip is specifically a user decision.
			const outOfScopeNodeNames = scopeNodeNames
				? allSetupRequests
						.map((request) => request.node.name)
						.filter((name) => !scopeNodeNames.includes(name))
				: [];
			const outOfScopeReason =
				outOfScopeNodeNames.length > 0
					? `Pre-existing node(s) ${outOfScopeNodeNames
							.map((name) => `"${name}"`)
							.join(', ')} have pending setup, but this change did not touch them — ` +
						'do not route the user to set them up now. Only if the user explicitly asks to set them up, call setup again with includeAllNodes: true.'
					: undefined;

			if (skippedByUser.length > 0) {
				return {
					success: true,
					reason:
						'The only nodes that need setup are ones the user already skipped.' +
						(outOfScopeReason ? ` ${outOfScopeReason}` : ''),
					skippedByUser: describeSkippedSetup(skippedByUser),
					skippedByUserGuidance: SKIPPED_SETUP_GUIDANCE,
				};
			}
			if (outOfScopeReason) {
				return {
					success: true,
					reason: `No nodes changed by the latest build require setup. ${outOfScopeReason}`,
				};
			}
			return { success: true, reason: 'No nodes require setup.' };
		}

		state.currentRequestId = nanoid();

		// The thread-bound project is authoritative for credential scoping; without
		// it the frontend falls back to the user's personal project and offers
		// credentials from outside the conversation's project.
		const projectId = context.projectId ?? input.projectId;

		return await ctx.suspend({
			requestId: state.currentRequestId,
			message: 'Configure credentials for your workflow',
			severity: 'info' as const,
			setupRequests,
			workflowId: input.workflowId,
			...(projectId ? { projectId } : {}),
		});
	}

	// State 2: User declined — revert any trigger-test changes
	if (!resumeData.approved) {
		if (state.preTestSnapshot) {
			await context.workflowService.updateFromWorkflowJSON(input.workflowId, state.preTestSnapshot);
			await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);
			state.preTestSnapshot = null;
		}
		// Re-analyze rather than remembering what was suspended: the closure state doesn't
		// survive a resume in another process, and a skip that silently fails to persist is
		// the whole bug. Everything still needing setup is what the user just dismissed.
		const dismissed = (await analyzeWorkflow(context, input.workflowId)).filter(
			(request) => request.needsAction,
		);
		await rememberSkippedSetup(context, dismissed, input.workflowId);
		return {
			success: true,
			deferred: true,
			reason: 'User skipped workflow setup for now.',
			...(dismissed.length > 0
				? {
						skippedByUser: describeSkippedSetup(dismissed),
						skippedByUserGuidance: SKIPPED_SETUP_GUIDANCE,
					}
				: {}),
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

	// Skip HITL for session-created or always-allowed workflows; others still need approval.
	const needsApproval =
		context.permissions?.updateWorkflow !== 'always_allow' &&
		!canSkipWorkflowUpdateHitl(context, input.workflowId);

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await resolveWorkflowName(context, input.workflowId);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Update workflow "${workflowName}" (ID: ${input.workflowId})?`,
			severity: 'warning' as const,
			// Carried on the confirmation so the UI can scope "always allow" per workflow
			// even if tool-call args are incomplete on resume.
			workflowId: input.workflowId,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	// "Always allow" — persist so later edits of this workflow skip HITL.
	if (resumeData?.approved && resumeData.scope === 'session') {
		await grantSessionWorkflowUpdate(context, input.workflowId);
	}

	if (!isWorkflowJson(input.workflow)) {
		return {
			success: false,
			error: 'Workflow JSON must include name, nodes, and connections.',
		};
	}

	// Guard against overwriting a save this conversation never saw (canvas
	// autosave, another user, another thread). Absent when the agent never read
	// the workflow here — then there is nothing to pin the save to.
	const expectedChecksum = await getObservedWorkflowChecksum(context, input.workflowId);

	try {
		const saved = expectedChecksum
			? await context.workflowService.updateFromWorkflowJSON(input.workflowId, input.workflow, {
					expectedChecksum,
				})
			: await context.workflowService.updateFromWorkflowJSON(input.workflowId, input.workflow);
		await refreshWorkflowSourceFileBindingFromWorkflow(context, input.workflowId);
		// Pin to what this save wrote, not to the re-read above: if another writer
		// landed in between, the next update should conflict rather than clobber.
		if (saved.checksum) {
			await rememberObservedWorkflowChecksum(context, input.workflowId, saved.checksum);
		}
		return { success: true, workflowId: input.workflowId };
	} catch (error) {
		if (error instanceof WorkflowSaveConflictError) {
			return {
				success: false,
				error: `${error.message} Call workflows(action="get", workflowId="${input.workflowId}") to read the current state, re-apply your change, then update again.`,
			};
		}

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
