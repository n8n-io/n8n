import { hasPlaceholderDeep } from '@n8n/utils';
import { generateWorkflowCode, type WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { buildCredentialMap, resolveCredentials } from './resolve-credentials';
import { stripStaleCredentialsFromWorkflow } from './setup-workflow.service';
import {
	getReferencedWorkflowIds,
	isMockableTriggerNodeType,
	isTriggerNodeType,
	needsWebhookId,
	normalizeWorkflowNodeParameters,
} from './workflow-json-utils';
import { WORKFLOW_BUILDER_SKILL_ID } from '../../skills/constants';
import type { InstanceAiContext } from '../../types';
import { parseAndValidate, partitionWarnings } from '../../workflow-builder';
import { extractWorkflowCode } from '../../workflow-builder/extract-code';
import { applyPatches } from '../../workflow-builder/patch-code';
import { createRemediation } from '../../workflow-loop/remediation';
import type {
	RemediationCategory,
	WorkflowBuildOutcome,
	WorkflowLoopAction,
	WorkflowSetupRequirement,
	WorkflowVerificationReadiness,
} from '../../workflow-loop/workflow-loop-state';

const patchSchema = z.object({
	old_str: z.string().describe('Exact string to find in the code'),
	new_str: z.string().describe('Replacement string'),
});

const PLANNED_TEMPORARY_CREATE_ERROR =
	'Do not set temporary: true for planned build tasks. Omit temporary for final planned workflow deliverables.';

const PLANNED_CREATE_UPDATE_ERROR =
	'This planned build task creates a new workflow. The workItemId is tracking metadata, not a workflow ID. Call workflows(action="create") without workflowId.';

function plannedUpdateCreateError(workflowId: string): string {
	return `This planned build task targets existing workflow ${workflowId}. Call workflows(action="update") with that workflowId instead of creating a new workflow.`;
}

function plannedUpdateWrongWorkflowError(
	expectedWorkflowId: string,
	receivedWorkflowId: string,
): string {
	return `This planned build task targets workflow ${expectedWorkflowId}, so it cannot update workflow ${receivedWorkflowId}. Use the planned workflowId from the build task.`;
}

// Coerce JSON-stringified arrays into arrays. The model sometimes sends `patches`
// as a JSON string because the payload contains escaped code. Leave non-strings
// untouched so Zod can validate them normally.
function coercePatches(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch {
		// Keep the original string so Zod reports the array-expected error at `patches`.
		return value;
	}
}

const workflowCodeActionBaseSchema = z.object({
	code: z
		.string()
		.optional()
		.describe('Full TypeScript workflow code using @n8n/workflow-sdk. Required for new workflows.'),
	patches: z
		.preprocess(coercePatches, z.array(patchSchema))
		.optional()
		.describe(
			'Array of {old_str, new_str} replacements to apply to existing workflow code. ' +
				'Requires workflowId. More efficient than resending full code for small fixes.',
		),
	workflowId: z.string().optional().describe('ID of the workflow'),
	projectId: z.string().optional().describe('Project ID'),
	name: z.string().optional().describe('Name'),
});

export const workflowCodeCreateActionSchema = workflowCodeActionBaseSchema
	.extend({
		action: z
			.literal('create')
			.describe(
				'Create a workflow from TypeScript SDK code. Use after loading the workflow-builder skill.',
			),
		workflowId: z.undefined().optional(),
		temporary: z
			.boolean()
			.optional()
			.describe(
				'Set true only for scratch/intermediate workflows that should be archived automatically. Omit for user-visible deliverables.',
			),
	})
	.strict();

export const workflowCodeUpdateActionSchema = workflowCodeActionBaseSchema
	.extend({
		action: z
			.literal('update')
			.describe(
				'Update an existing workflow from TypeScript SDK code or targeted patches. Use after loading the workflow-builder skill.',
			),
		workflowId: z.string().describe('ID of the workflow'),
	})
	.strict();

export const workflowCodeConfirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: z.enum(['info', 'warning', 'destructive']),
	workflowId: z.string().optional(),
});

const confirmationResumeSchema = z.object({
	approved: z.boolean(),
});

export type WorkflowCodeCreateInput = z.infer<typeof workflowCodeCreateActionSchema>;
export type WorkflowCodeUpdateInput = z.infer<typeof workflowCodeUpdateActionSchema>;
type WorkflowCodeActionInput = WorkflowCodeCreateInput | WorkflowCodeUpdateInput;
type ResumeData = z.infer<typeof confirmationResumeSchema>;
type WorkflowCodeDeniedResult = { success: false; denied: true; reason: string };
type WorkflowSaveMetadata = {
	triggerNodes: Array<{ nodeName: string; nodeType: string }>;
	mockedNodeNames?: string[];
	mockedCredentialTypes?: string[];
	mockedCredentialsByNode?: Record<string, string[]>;
	verificationPinData?: Record<string, Array<Record<string, unknown>>>;
	usesWorkflowPinDataForVerification?: boolean;
	referencedWorkflowIds?: string[];
	supportingWorkflowIds?: string[];
	hasUnresolvedPlaceholders?: boolean;
	verificationReadiness: WorkflowVerificationReadiness;
	setupRequirement: WorkflowSetupRequirement;
};
type WorkflowOutcomeBase = Omit<
	WorkflowBuildOutcome,
	'workItemId' | 'taskId' | 'summary' | 'verificationReadiness' | 'setupRequirement'
>;
type WorkflowOutcomeBaseInput = {
	workflowId: string;
	triggerNodes: Array<{ nodeName: string; nodeType: string }>;
	mockedNodeNames?: string[];
	mockedCredentialTypes?: string[];
	mockedCredentialsByNode?: Record<string, string[]>;
	verificationPinData?: Record<string, Array<Record<string, unknown>>>;
	usesWorkflowPinDataForVerification?: boolean;
	supportingWorkflowIds?: string[];
	hasUnresolvedPlaceholders?: boolean;
};
type WorkflowCodeFailureReport = {
	context: InstanceAiContext;
	errors: string[];
	failureSignature: string;
	category?: RemediationCategory;
	shouldEdit?: boolean;
	reason?: string;
	guidance?: string;
	needsUserInput?: boolean;
	blockingReason?: string;
};
type WorkflowCodeFailureResult = { success: false; errors: string[]; warnings?: string[] };
type WorkflowCodeSuccessResult = { success: true; workflowId: string; workflowName?: string } & {
	temporary?: true;
	warnings?: string[];
} & WorkflowSaveMetadata;
type WorkflowCodeSaveResult =
	| WorkflowCodeSuccessResult
	| WorkflowCodeFailureResult
	| WorkflowCodeDeniedResult;

export interface WorkflowCodeToolContext {
	resumeData?: ResumeData;
	suspend: (payload: z.infer<typeof workflowCodeConfirmationSuspendSchema>) => Promise<never>;
}

async function ensureWebhookIds(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
): Promise<void> {
	const existingWebhookIds = new Map<string, string>();
	if (workflowId) {
		try {
			const existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
			for (const node of existing.nodes ?? []) {
				if (node.webhookId && node.name) {
					existingWebhookIds.set(node.name, node.webhookId);
				}
			}
		} catch {
			// If the existing workflow cannot be fetched, generate fresh ids below.
		}
	}

	for (const node of json.nodes ?? []) {
		if (needsWebhookId(node.type) && !node.webhookId) {
			node.webhookId = (node.name && existingWebhookIds.get(node.name)) ?? randomUUID();
		}
	}
}

function getWorkflowId(input: WorkflowCodeActionInput): string | undefined {
	return input.action === 'update' ? input.workflowId : undefined;
}

function approvalLabel(input: WorkflowCodeActionInput): string {
	const name = input.name?.trim();
	const workflowId = getWorkflowId(input);
	if (workflowId) {
		return name ? `Update workflow ${name} (ID: ${workflowId})` : `Update workflow ${workflowId}`;
	}
	return name ? `Create workflow ${name}` : 'Create workflow';
}

function blockSaveIfNeeded(
	context: InstanceAiContext,
	input: WorkflowCodeActionInput,
): WorkflowCodeDeniedResult | undefined {
	const permKey = input.action === 'update' ? 'updateWorkflow' : 'createWorkflow';
	if (context.permissions?.[permKey] === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	return undefined;
}

function plannedBuildFailureRemediation({
	errors,
	failureSignature,
	category,
	shouldEdit,
	reason,
	guidance,
}: Pick<
	WorkflowCodeFailureReport,
	'errors' | 'failureSignature' | 'category' | 'shouldEdit' | 'reason' | 'guidance'
>) {
	if (category && shouldEdit !== undefined) {
		return createRemediation({
			category,
			shouldEdit,
			reason: reason ?? failureSignature,
			guidance: guidance ?? (errors.join('\n') || failureSignature),
		});
	}

	const normalized = `${failureSignature}\n${errors.join('\n')}`.toLowerCase();
	if (normalized.includes('user_denied') || normalized.includes('user denied')) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'user_denied',
			guidance:
				'The user denied saving the workflow. Stop editing and acknowledge the cancellation.',
		});
	}

	if (failureSignature.startsWith('save_failed:')) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'save_failed',
			guidance:
				'The workflow code validated, but the workflow could not be saved. Stop editing and explain the save blocker to the user.',
		});
	}

	if (
		normalized.includes('credential') &&
		(normalized.includes('missing') ||
			normalized.includes('not found') ||
			normalized.includes('setup') ||
			normalized.includes('unauthorized'))
	) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'missing_credential',
			guidance:
				'The workflow needs credential setup before it can be saved or verified. Stop code edits and route the user through setup.',
		});
	}

	return createRemediation({
		category: 'code_fixable',
		shouldEdit: true,
		reason: failureSignature,
		guidance:
			errors.length > 0
				? errors.join('\n')
				: 'Fix the workflow SDK code and call workflows(action="create"|"update") again.',
	});
}

function blockIfWorkflowBuilderSkillMissing(
	context: InstanceAiContext,
): { success: false; errors: string[] } | undefined {
	if (!context.loadedSkills) return undefined;
	if (context.loadedSkills.has(WORKFLOW_BUILDER_SKILL_ID)) return undefined;

	return {
		success: false,
		errors: [
			'Load the workflow-builder skill with load_skill before calling workflows(action="create"|"update").',
		],
	};
}

function blockTemporaryPlannedBuildCreate(
	context: InstanceAiContext,
	input: WorkflowCodeActionInput,
): { success: false; errors: string[] } | undefined {
	if (context.plannedBuildTask && input.action === 'create' && input.temporary === true) {
		return { success: false, errors: [PLANNED_TEMPORARY_CREATE_ERROR] };
	}

	return undefined;
}

function blockPlannedBuildActionMismatch(
	context: InstanceAiContext,
	input: WorkflowCodeActionInput,
): { success: false; errors: string[] } | undefined {
	const plannedBuildTask = context.plannedBuildTask;
	if (!plannedBuildTask) return undefined;

	if (!plannedBuildTask.workflowId && input.action === 'update') {
		return { success: false, errors: [PLANNED_CREATE_UPDATE_ERROR] };
	}

	if (plannedBuildTask.workflowId && input.action === 'create') {
		return {
			success: false,
			errors: [plannedUpdateCreateError(plannedBuildTask.workflowId)],
		};
	}

	if (
		plannedBuildTask.workflowId &&
		input.action === 'update' &&
		input.workflowId !== plannedBuildTask.workflowId
	) {
		return {
			success: false,
			errors: [plannedUpdateWrongWorkflowError(plannedBuildTask.workflowId, input.workflowId)],
		};
	}

	return undefined;
}

// After a planned create succeeds, adopt the new workflow as the planned target
// so later saves in the same turn refine it: re-creates are blocked (the mismatch
// guard sends the model to update) and updates to this id are allowed without
// re-approval.
function registerPlannedCreatedWorkflow(context: InstanceAiContext, workflowId: string): void {
	const plannedBuildTask = context.plannedBuildTask;
	if (!plannedBuildTask || plannedBuildTask.workflowId) return;
	plannedBuildTask.workflowId = workflowId;
	const allowed = new Set(context.allowedUpdateWorkflowIds ?? []);
	allowed.add(workflowId);
	context.allowedUpdateWorkflowIds = allowed;
}

function isPlannedCreateAllowed(
	context: InstanceAiContext,
	input: WorkflowCodeActionInput,
): boolean {
	if (input.action === 'create') {
		return (
			context.permissions?.createWorkflow === 'always_allow' &&
			context.plannedBuildTask?.workflowId === undefined
		);
	}

	return false;
}

function isPlannedUpdateAllowed(
	context: InstanceAiContext,
	input: WorkflowCodeActionInput,
): boolean {
	if (input.action !== 'update') return false;
	if (context.permissions?.updateWorkflow !== 'always_allow') return false;
	return (
		context.plannedBuildTask?.workflowId === input.workflowId &&
		context.allowedUpdateWorkflowIds?.has(input.workflowId) === true
	);
}

function isAdHocSaveAllowed(context: InstanceAiContext, input: WorkflowCodeActionInput): boolean {
	if (input.action === 'create') {
		return context.permissions?.createWorkflow === 'always_allow';
	}

	if (context.permissions?.updateWorkflow !== 'always_allow') return false;
	const allowList = context.allowedUpdateWorkflowIds;
	return allowList === undefined || allowList.has(input.workflowId);
}

function isSaveAlwaysAllowed(context: InstanceAiContext, input: WorkflowCodeActionInput): boolean {
	if (!context.plannedBuildTask) return isAdHocSaveAllowed(context, input);
	return isPlannedCreateAllowed(context, input) || isPlannedUpdateAllowed(context, input);
}

async function confirmSave(
	context: InstanceAiContext,
	input: WorkflowCodeActionInput,
	ctx: WorkflowCodeToolContext,
): Promise<WorkflowCodeDeniedResult | undefined> {
	const needsApproval = !isSaveAlwaysAllowed(context, input);
	const resumeData = ctx.resumeData;
	const workflowId = getWorkflowId(input);

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: approvalLabel(input),
			severity: 'info',
			...(workflowId ? { workflowId } : {}),
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	return undefined;
}

function hasMockedCredentials(
	outcome: Pick<WorkflowBuildOutcome, 'mockedCredentialTypes' | 'mockedCredentialsByNode'>,
): boolean {
	return (
		(outcome.mockedCredentialTypes?.length ?? 0) > 0 ||
		Object.keys(outcome.mockedCredentialsByNode ?? {}).length > 0
	);
}

function hasCredentialVerificationData(
	outcome: Pick<WorkflowBuildOutcome, 'verificationPinData' | 'usesWorkflowPinDataForVerification'>,
): boolean {
	return (
		Object.keys(outcome.verificationPinData ?? {}).length > 0 ||
		outcome.usesWorkflowPinDataForVerification === true
	);
}

function determineDirectVerificationReadiness(
	outcome: Pick<
		WorkflowBuildOutcome,
		| 'submitted'
		| 'workflowId'
		| 'triggerNodes'
		| 'mockedCredentialTypes'
		| 'mockedCredentialsByNode'
		| 'verificationPinData'
		| 'usesWorkflowPinDataForVerification'
		| 'hasUnresolvedPlaceholders'
	>,
): WorkflowVerificationReadiness {
	if (!outcome.submitted) {
		return {
			status: 'not_verifiable',
			reason: 'not-submitted',
			guidance: 'The build did not submit a workflow, so there is nothing to verify.',
		};
	}

	if (!outcome.workflowId) {
		return {
			status: 'not_verifiable',
			reason: 'missing-workflow-id',
			guidance: 'The build outcome does not include a workflow ID.',
		};
	}

	if (
		hasCredentialVerificationData(outcome) ||
		outcome.triggerNodes?.some((node) => isMockableTriggerNodeType(node.nodeType))
	) {
		return { status: 'ready' };
	}

	if (hasMockedCredentials(outcome)) {
		return {
			status: 'needs_setup',
			reason: 'missing-mocked-credential-pin-data',
			guidance:
				'The workflow has mocked credentials but no mockable trigger or verification pin data, so it cannot be verified before setup.',
		};
	}

	return {
		status: 'not_verifiable',
		reason: 'non-mockable-trigger',
		guidance: 'The workflow does not have a trigger the post-build verifier can exercise.',
	};
}

function determineDirectSetupRequirement(
	outcome: Pick<
		WorkflowBuildOutcome,
		| 'submitted'
		| 'workflowId'
		| 'mockedCredentialTypes'
		| 'mockedCredentialsByNode'
		| 'hasUnresolvedPlaceholders'
	>,
): WorkflowSetupRequirement {
	if (!outcome.submitted || !outcome.workflowId) {
		return { status: 'not_required' };
	}

	if (outcome.hasUnresolvedPlaceholders) {
		return {
			status: 'required',
			reason: 'unresolved-placeholders',
			guidance: 'Route the workflow through setup so the user can fill unresolved values.',
		};
	}

	if (hasMockedCredentials(outcome)) {
		return {
			status: 'required',
			reason: 'mocked-credentials',
			guidance: 'Route the workflow through setup so the user can add real credentials.',
		};
	}

	return { status: 'not_required' };
}

function hasArrayItems(value: string[] | undefined): value is string[] {
	return (value?.length ?? 0) > 0;
}

function hasRecordEntries<T>(value: Record<string, T> | undefined): value is Record<string, T> {
	return Object.keys(value ?? {}).length > 0;
}

function enhanceValidationErrors(errors: string[]): string[] {
	return errors.map((error) => {
		if (error.includes('[MISSING_EXPRESSION_PREFIX]')) {
			return (
				`${error}\n` +
				'Hint: n8n expressions in node parameters must start with ={{ ... }}. ' +
				"Use expr('{{ ... }}') in workflow SDK code so the saved parameter becomes ={{ ... }}."
			);
		}

		return error;
	});
}

function enhanceBuildErrors(errors: string[]): string[] {
	const templateExpressionPrefix = '$' + '{';

	return errors.map((error) => {
		const lower = error.toLowerCase();
		const looksLikeTemplateLiteralIssue =
			lower.includes('unterminated template') ||
			lower.includes('template literal') ||
			(lower.includes('unexpected token') && error.includes(templateExpressionPrefix));

		if (looksLikeTemplateLiteralIssue) {
			return (
				`${error}\n` +
				'Hint: check Code node snippets and JavaScript template literals. Escape backticks ' +
				`and ${templateExpressionPrefix}...} sequences that should be saved as literal code, or use a quoted string.`
			);
		}

		return error;
	});
}

function appendWorkflowLoopAction(
	errors: string[],
	action: WorkflowLoopAction | undefined,
): string[] {
	if (action?.type !== 'blocked') return errors;
	return [...errors, `Repair guard stopped automatic edits: ${action.reason}`];
}

function buildWorkflowOutcomeBase({
	workflowId,
	triggerNodes,
	mockedNodeNames,
	mockedCredentialTypes,
	mockedCredentialsByNode,
	verificationPinData,
	usesWorkflowPinDataForVerification,
	supportingWorkflowIds,
	hasUnresolvedPlaceholders,
}: WorkflowOutcomeBaseInput): WorkflowOutcomeBase {
	const hasMockedNodeNames = hasArrayItems(mockedNodeNames);
	const hasMockedCredentialTypes = hasArrayItems(mockedCredentialTypes);
	const hasMockedCredentialsByNode = hasRecordEntries(mockedCredentialsByNode);
	const hasVerificationPinData = hasRecordEntries(verificationPinData);

	return {
		workflowId,
		submitted: true,
		triggerType: 'manual_or_testable',
		triggerNodes,
		needsUserInput: Boolean(
			hasUnresolvedPlaceholders === true || hasMockedCredentialTypes || hasMockedCredentialsByNode,
		),
		...(hasMockedNodeNames ? { mockedNodeNames } : {}),
		...(hasMockedCredentialTypes ? { mockedCredentialTypes } : {}),
		...(hasMockedCredentialsByNode ? { mockedCredentialsByNode } : {}),
		...(hasVerificationPinData ? { verificationPinData } : {}),
		...(usesWorkflowPinDataForVerification ? { usesWorkflowPinDataForVerification } : {}),
		...(supportingWorkflowIds && supportingWorkflowIds.length > 0 ? { supportingWorkflowIds } : {}),
		...(hasUnresolvedPlaceholders !== undefined ? { hasUnresolvedPlaceholders } : {}),
	};
}

function buildSaveMetadataFromOutcomeBase(
	outcomeBase: WorkflowOutcomeBase,
	referencedWorkflowIds: string[],
): Omit<WorkflowSaveMetadata, 'verificationReadiness' | 'setupRequirement'> {
	return {
		triggerNodes: outcomeBase.triggerNodes ?? [],
		...(outcomeBase.mockedNodeNames ? { mockedNodeNames: outcomeBase.mockedNodeNames } : {}),
		...(outcomeBase.mockedCredentialTypes
			? { mockedCredentialTypes: outcomeBase.mockedCredentialTypes }
			: {}),
		...(outcomeBase.mockedCredentialsByNode
			? { mockedCredentialsByNode: outcomeBase.mockedCredentialsByNode }
			: {}),
		...(outcomeBase.verificationPinData
			? { verificationPinData: outcomeBase.verificationPinData }
			: {}),
		...(outcomeBase.usesWorkflowPinDataForVerification
			? { usesWorkflowPinDataForVerification: true }
			: {}),
		...(referencedWorkflowIds.length > 0
			? { referencedWorkflowIds, supportingWorkflowIds: referencedWorkflowIds }
			: {}),
		...(outcomeBase.hasUnresolvedPlaceholders !== undefined
			? { hasUnresolvedPlaceholders: outcomeBase.hasUnresolvedPlaceholders }
			: {}),
	};
}

async function reportPlannedBuildSuccess({
	context,
	workflowId,
	workflowName,
	triggerNodes,
	mockedNodeNames,
	mockedCredentialTypes,
	mockedCredentialsByNode,
	verificationPinData,
	usesWorkflowPinDataForVerification,
	supportingWorkflowIds,
	hasUnresolvedPlaceholders,
}: {
	context: InstanceAiContext;
	workflowId: string;
	workflowName?: string;
	triggerNodes: Array<{ nodeName: string; nodeType: string }>;
	mockedNodeNames?: string[];
	mockedCredentialTypes?: string[];
	mockedCredentialsByNode?: Record<string, string[]>;
	verificationPinData?: Record<string, Array<Record<string, unknown>>>;
	usesWorkflowPinDataForVerification?: boolean;
	supportingWorkflowIds?: string[];
	hasUnresolvedPlaceholders?: boolean;
}): Promise<void> {
	const plannedBuildTask = context.plannedBuildTask;
	if (!plannedBuildTask) return;
	const graph = await plannedBuildTask.plannedTaskService.getGraph(plannedBuildTask.threadId);
	const task = graph?.tasks.find((t) => t.id === plannedBuildTask.taskId);
	// 'succeeded' is allowed so an in-turn update (refining a workflow created
	// earlier this turn) re-records its outcome for the checkpoint to read.
	// 'failed'/'cancelled' route through recovery: a guard failed the task earlier
	// but the save just succeeded, so re-arm the verification checkpoint.
	const recoverable = task?.status === 'failed' || task?.status === 'cancelled';
	if (task?.status !== 'running' && task?.status !== 'succeeded' && !recoverable) {
		context.logger?.warn?.('Skipped planned build success report because task is not running', {
			threadId: plannedBuildTask.threadId,
			taskId: plannedBuildTask.taskId,
			status: task?.status ?? 'not-found',
		});
		return;
	}

	const summary = workflowName
		? `Workflow built: ${workflowName}.`
		: `Workflow built: ${workflowId}.`;
	const outcomeBase = buildWorkflowOutcomeBase({
		workflowId,
		triggerNodes,
		mockedNodeNames,
		mockedCredentialTypes,
		mockedCredentialsByNode,
		verificationPinData,
		usesWorkflowPinDataForVerification,
		supportingWorkflowIds,
		hasUnresolvedPlaceholders,
	});
	const outcomeWithoutRouting: Omit<
		WorkflowBuildOutcome,
		'verificationReadiness' | 'setupRequirement'
	> = {
		workItemId: plannedBuildTask.workItemId,
		...(context.runId ? { runId: context.runId } : {}),
		taskId: plannedBuildTask.taskId,
		...outcomeBase,
		summary,
	};
	const outcome: WorkflowBuildOutcome = {
		...outcomeWithoutRouting,
		verificationReadiness: determineDirectVerificationReadiness(outcomeWithoutRouting),
		setupRequirement: determineDirectSetupRequirement(outcomeWithoutRouting),
	};
	await plannedBuildTask.workflowTaskService?.reportBuildOutcome(outcome);
	plannedBuildTask.onSavedWorkflowBuildOutcome?.({ result: summary, outcome });
	if (recoverable) {
		await plannedBuildTask.plannedTaskService.recoverWorkflowBuildSuccess(
			plannedBuildTask.threadId,
			plannedBuildTask.taskId,
			{ result: summary, outcome },
		);
	} else {
		await plannedBuildTask.plannedTaskService.markSucceeded(
			plannedBuildTask.threadId,
			plannedBuildTask.taskId,
			{ result: summary, outcome },
		);
	}
}

async function reportPlannedBuildFailure({
	context,
	errors,
	failureSignature,
	category,
	shouldEdit,
	reason,
	guidance,
	needsUserInput,
	blockingReason,
}: WorkflowCodeFailureReport): Promise<WorkflowLoopAction | undefined> {
	const plannedBuildTask = context.plannedBuildTask;
	if (!plannedBuildTask) return;
	const graph = await plannedBuildTask.plannedTaskService.getGraph(plannedBuildTask.threadId);
	const task = graph?.tasks.find((t) => t.id === plannedBuildTask.taskId);
	if (task?.status !== 'running') {
		context.logger?.warn?.('Skipped planned build failure report because task is not running', {
			threadId: plannedBuildTask.threadId,
			taskId: plannedBuildTask.taskId,
			status: task?.status ?? 'not-found',
		});
		return;
	}

	const summary = `Workflow build failed before save: ${errors[0] ?? failureSignature}`;
	const defaultGuidance =
		errors.length > 0
			? errors.join('\n')
			: 'Fix the workflow SDK code and call workflows(action="create"|"update") again.';
	const remediation = plannedBuildFailureRemediation({
		errors,
		failureSignature,
		category,
		shouldEdit,
		reason,
		guidance: guidance ?? defaultGuidance,
	});
	const outcome: WorkflowBuildOutcome = {
		workItemId: plannedBuildTask.workItemId,
		...(context.runId ? { runId: context.runId } : {}),
		taskId: plannedBuildTask.taskId,
		submitted: false,
		triggerType: 'manual_or_testable',
		needsUserInput: needsUserInput ?? remediation.category === 'needs_setup',
		blockingReason,
		failureSignature,
		remediation,
		summary,
	};

	const action = await plannedBuildTask.workflowTaskService?.reportBuildOutcome(outcome);
	if (action?.type === 'blocked' || !remediation.shouldEdit) {
		try {
			await plannedBuildTask.plannedTaskService.markFailed?.(
				plannedBuildTask.threadId,
				plannedBuildTask.taskId,
				{
					error: action?.type === 'blocked' ? action.reason : remediation.guidance,
				},
			);
		} catch (error) {
			context.logger?.warn?.('Failed to mark planned build task failed after terminal failure', {
				threadId: plannedBuildTask.threadId,
				taskId: plannedBuildTask.taskId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return action;
}

async function reportPlannedBuildFailureSafely(
	input: Parameters<typeof reportPlannedBuildFailure>[0],
): Promise<WorkflowLoopAction | undefined> {
	try {
		return await reportPlannedBuildFailure(input);
	} catch (error) {
		input.context.logger?.warn?.('Failed to report planned build failure', {
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

async function reportPlannedBuildSuccessSafely(
	input: Parameters<typeof reportPlannedBuildSuccess>[0],
): Promise<string | undefined> {
	try {
		await reportPlannedBuildSuccess(input);
		return undefined;
	} catch (error) {
		input.context.logger?.warn?.('Failed to report planned build success', {
			error: error instanceof Error ? error.message : String(error),
		});
		return error instanceof Error ? error.message : String(error);
	}
}

function buildWorkflowSaveMetadata({
	workflowId,
	triggerNodes,
	mockResult,
	referencedWorkflowIds,
	hasUnresolvedPlaceholders,
}: {
	workflowId: string;
	triggerNodes: Array<{ nodeName: string; nodeType: string }>;
	mockResult: Awaited<ReturnType<typeof resolveCredentials>>;
	referencedWorkflowIds: string[];
	hasUnresolvedPlaceholders?: boolean;
}): WorkflowSaveMetadata {
	const outcomeBase = buildWorkflowOutcomeBase({
		workflowId,
		triggerNodes,
		mockedNodeNames: mockResult.mockedNodeNames,
		mockedCredentialTypes: mockResult.mockedCredentialTypes,
		mockedCredentialsByNode: mockResult.mockedCredentialsByNode,
		verificationPinData: mockResult.verificationPinData,
		usesWorkflowPinDataForVerification: mockResult.usesWorkflowPinDataForVerification,
		supportingWorkflowIds: referencedWorkflowIds,
		hasUnresolvedPlaceholders,
	});

	return {
		...buildSaveMetadataFromOutcomeBase(outcomeBase, referencedWorkflowIds),
		verificationReadiness: determineDirectVerificationReadiness(outcomeBase),
		setupRequirement: determineDirectSetupRequirement(outcomeBase),
	};
}

function buildSaveWarnings(
	informational: ReturnType<typeof partitionWarnings>['informational'],
	plannedReportError?: string,
): string[] | undefined {
	const warnings = informational.map((w) => `[${w.code}]: ${w.message}`);
	if (plannedReportError) {
		warnings.push(
			`Workflow was saved, but planned task state update failed: ${plannedReportError}`,
		);
	}

	return warnings.length > 0 ? warnings : undefined;
}

export function createWorkflowCodeService(context: InstanceAiContext) {
	// Keep code per workflow so patch-mode never crosses workflow boundaries.
	const lastCodeByWorkflowId = new Map<string, string>();
	const inFlightCreates = new Map<string, Promise<WorkflowCodeSaveResult>>();
	let lastCreateCode: string | null = null;

	function rememberCode(workflowId: string | undefined, code: string): void {
		if (workflowId) {
			lastCodeByWorkflowId.set(workflowId, code);
		} else {
			lastCreateCode = code;
		}
	}

	function rememberRejectedCode(workflowId: string | undefined, code: string): void {
		// Rejected create drafts feed the next patch attempt. Rejected update drafts
		// come from a workflow we can refetch, so do not poison that cache.
		if (!workflowId) rememberCode(undefined, code);
	}

	function rememberCreatedCode(workflowId: string, code: string): void {
		lastCodeByWorkflowId.set(workflowId, code);
		lastCreateCode = null;
	}

	function invalidate(workflowId?: string): void {
		if (workflowId) {
			lastCodeByWorkflowId.delete(workflowId);
			return;
		}
		lastCreateCode = null;
	}

	async function getPatchBaseCode(workflowId: string | undefined) {
		if (!workflowId) return lastCreateCode;

		let baseCode = lastCodeByWorkflowId.get(workflowId);
		if (baseCode) return baseCode;

		const json = await context.workflowService.getAsWorkflowJSON(workflowId);
		baseCode = generateWorkflowCode(json);
		lastCodeByWorkflowId.set(workflowId, baseCode);
		return baseCode;
	}

	function getCreateInFlightKey(input: WorkflowCodeCreateInput, json: WorkflowJSON): string {
		if (context.plannedBuildTask) {
			return `planned:${context.plannedBuildTask.threadId}:${context.plannedBuildTask.taskId}`;
		}

		const projectId = input.projectId ?? '';
		const workflowName = json.name ?? input.name ?? '';
		const temporary = input.temporary === true ? 'temporary' : 'final';
		return `adhoc:${projectId}:${workflowName}:${temporary}`;
	}

	async function runCreateOnce(
		key: string,
		createWorkflow: () => Promise<WorkflowCodeSaveResult>,
	): Promise<WorkflowCodeSaveResult> {
		const existing = inFlightCreates.get(key);
		if (existing) return await existing;

		const pending = createWorkflow().finally(() => {
			inFlightCreates.delete(key);
		});
		inFlightCreates.set(key, pending);
		return await pending;
	}

	async function reportSaveFailure(error: unknown): Promise<WorkflowCodeFailureResult> {
		const message = `Workflow save failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
		const loopAction = await reportPlannedBuildFailureSafely({
			context,
			errors: [message],
			failureSignature: `save_failed:${message}`,
			category: 'blocked',
			shouldEdit: false,
			reason: 'save_failed',
		});
		return {
			success: false,
			errors: appendWorkflowLoopAction([message], loopAction),
		};
	}

	async function saveWorkflowCode(
		input: WorkflowCodeActionInput,
		ctx: WorkflowCodeToolContext,
	): Promise<WorkflowCodeSaveResult> {
		const blocked = blockSaveIfNeeded(context, input);
		if (blocked) return blocked;
		const missingSkill = blockIfWorkflowBuilderSkillMissing(context);
		if (missingSkill) return missingSkill;
		const blockedTemporaryPlannedBuild = blockTemporaryPlannedBuildCreate(context, input);
		if (blockedTemporaryPlannedBuild) return blockedTemporaryPlannedBuild;
		const plannedBuildActionMismatch = blockPlannedBuildActionMismatch(context, input);
		if (plannedBuildActionMismatch) return plannedBuildActionMismatch;

		const { code, patches, projectId, name } = input;
		const workflowId = getWorkflowId(input);
		let finalCode: string;

		if (patches) {
			// Patch mode: apply str_replace to existing code.
			// Source priority: cached code for this workflow → fetch from backend.
			let baseCode: string | null;
			try {
				baseCode = await getPatchBaseCode(workflowId);
			} catch {
				await reportPlannedBuildFailureSafely({
					context,
					errors: ['Patch mode: could not fetch workflow. Send full code instead.'],
					failureSignature: 'patch_fetch_failed',
				});
				return {
					success: false,
					errors: ['Patch mode: could not fetch workflow. Send full code instead.'],
				};
			}
			if (!baseCode) {
				await reportPlannedBuildFailureSafely({
					context,
					errors: [
						'Patch mode requires either previous workflow code in this turn or a workflowId to fetch from.',
					],
					failureSignature: 'patch_base_missing',
				});
				return {
					success: false,
					errors: [
						'Patch mode requires either previous workflow code in this turn or a workflowId to fetch from.',
					],
				};
			}

			const patchResult = applyPatches(baseCode, patches);
			if (!patchResult.success) {
				await reportPlannedBuildFailureSafely({
					context,
					errors: [patchResult.error],
					failureSignature: `patch_apply_failed:${patchResult.error}`,
				});
				return { success: false, errors: [patchResult.error] };
			}

			finalCode = patchResult.code;
		} else if (code) {
			finalCode = extractWorkflowCode(code);
		} else {
			await reportPlannedBuildFailureSafely({
				context,
				errors: ['Either `code` (full code) or `patches` (to fix previous code) is required.'],
				failureSignature: 'missing_code_or_patches',
			});
			return {
				success: false,
				errors: ['Either `code` (full code) or `patches` (to fix previous code) is required.'],
			};
		}

		// Parse TypeScript to WorkflowJSON with two-stage validation
		let result;
		try {
			result = parseAndValidate(finalCode, {
				nodeTypesProvider: context.nodeTypesProvider,
			});
		} catch (error) {
			rememberRejectedCode(workflowId, finalCode);
			const errors = enhanceBuildErrors([
				error instanceof Error ? error.message : 'Failed to parse workflow code',
			]);
			const loopAction = await reportPlannedBuildFailureSafely({
				context,
				errors,
				failureSignature: `parse_failed:${errors[0] ?? 'unknown'}`,
			});
			return {
				success: false,
				errors: appendWorkflowLoopAction(errors, loopAction),
			};
		}

		// Partition validation results into blocking errors and informational warnings
		const { errors, informational } = partitionWarnings(result.warnings);

		if (errors.length > 0) {
			rememberRejectedCode(workflowId, finalCode);
			const formattedErrors = enhanceValidationErrors(
				errors.map((e) => `[${e.code}]${e.nodeName ? ` (${e.nodeName})` : ''}: ${e.message}`),
			);
			const loopAction = await reportPlannedBuildFailureSafely({
				context,
				errors: formattedErrors,
				failureSignature: `validation_failed:${errors
					.map((e) => `${e.code}${e.nodeName ? `:${e.nodeName}` : ''}`)
					.join('|')}`,
			});
			return {
				success: false,
				errors: appendWorkflowLoopAction(formattedErrors, loopAction),
				warnings:
					informational.length > 0
						? informational.map((w) => `[${w.code}]: ${w.message}`)
						: undefined,
			};
		}

		const json = result.workflow;
		normalizeWorkflowNodeParameters(json);
		if (name) {
			json.name = name;
		} else if (!json.name && !workflowId) {
			await reportPlannedBuildFailureSafely({
				context,
				errors: [
					'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
				],
				failureSignature: 'missing_workflow_name',
			});
			return {
				success: false,
				errors: [
					'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
				],
			};
		}

		// Drop credential entries that are no longer valid for the current
		// parameters before resolving credentials so stale keys do not produce
		// setup or verification metadata.
		await stripStaleCredentialsFromWorkflow(context, json);

		// Resolve undefined/null credentials before saving.
		// newCredential() produces NewCredentialImpl which serializes to undefined.
		const credentialMap = await buildCredentialMap(context.credentialService);
		const mockResult = await resolveCredentials(json, workflowId, context, credentialMap);

		// Ensure webhook nodes have a webhookId so n8n registers clean paths
		await ensureWebhookIds(json, workflowId, context);
		const triggerNodes = (json.nodes ?? [])
			.filter((n) => isTriggerNodeType(n.type))
			.map((n) => ({ nodeName: n.name, nodeType: n.type }))
			.filter(
				(t): t is { nodeName: string; nodeType: string } =>
					Boolean(t.nodeName) && Boolean(t.nodeType),
			);
		const hasPlaceholders =
			(json.nodes ?? []).some((n) => hasPlaceholderDeep(n.parameters)) || undefined;
		const referencedWorkflowIds = getReferencedWorkflowIds(json);

		try {
			const confirmationInput: WorkflowCodeActionInput = {
				...input,
				name: input.name ?? json.name,
			};
			const denied = await confirmSave(context, confirmationInput, ctx);
			if (denied) {
				const isResumedDenial =
					ctx.resumeData !== undefined && ctx.resumeData !== null && !ctx.resumeData.approved;
				if (isResumedDenial) {
					await reportPlannedBuildFailureSafely({
						context,
						errors: [denied.reason],
						failureSignature: 'user_denied',
						category: 'blocked',
						shouldEdit: false,
						reason: 'user_denied',
						guidance:
							'The user denied saving the workflow. Stop editing and acknowledge the cancellation.',
						needsUserInput: true,
						blockingReason: denied.reason,
					});
				}
				return denied;
			}

			// Remember only after approval. Patch-mode handlers are re-entered on HITL
			// resume with the original input, so caching a valid pre-approval patch
			// would make the resumed call apply the same patch twice.
			rememberCode(workflowId, finalCode);

			if (input.action === 'update') {
				const updated = await context.workflowService.updateFromWorkflowJSON(
					input.workflowId,
					json,
					projectId ? { projectId } : undefined,
				);
				const saveMetadata = buildWorkflowSaveMetadata({
					workflowId: updated.id,
					triggerNodes,
					mockResult,
					referencedWorkflowIds,
					hasUnresolvedPlaceholders: hasPlaceholders,
				});
				const plannedReportError = await reportPlannedBuildSuccessSafely({
					context,
					workflowId: updated.id,
					workflowName: json.name,
					...saveMetadata,
				});
				return {
					success: true,
					workflowId: updated.id,
					workflowName: json.name,
					...saveMetadata,
					warnings: buildSaveWarnings(informational, plannedReportError),
				};
			} else {
				const createKey = getCreateInFlightKey(input, json);
				return await runCreateOnce(createKey, async () => {
					try {
						const markAsAiTemporary = input.temporary === true;
						const created = await context.workflowService.createFromWorkflowJSON(json, {
							...(projectId ? { projectId } : {}),
							...(markAsAiTemporary ? { markAsAiTemporary: true } : {}),
						});
						if (markAsAiTemporary) {
							const createdWorkflowIds = (context.aiCreatedWorkflowIds ??= new Set<string>());
							createdWorkflowIds.add(created.id);
						}
						const saveMetadata = buildWorkflowSaveMetadata({
							workflowId: created.id,
							triggerNodes,
							mockResult,
							referencedWorkflowIds,
							hasUnresolvedPlaceholders: hasPlaceholders,
						});
						if (markAsAiTemporary) {
							rememberCreatedCode(created.id, finalCode);
							return {
								success: true,
								workflowId: created.id,
								workflowName: json.name,
								temporary: true,
								...saveMetadata,
								warnings: buildSaveWarnings(informational),
							};
						}
						const plannedReportError = await reportPlannedBuildSuccessSafely({
							context,
							workflowId: created.id,
							workflowName: json.name,
							...saveMetadata,
						});
						registerPlannedCreatedWorkflow(context, created.id);
						rememberCreatedCode(created.id, finalCode);
						return {
							success: true,
							workflowId: created.id,
							workflowName: json.name,
							...saveMetadata,
							warnings: buildSaveWarnings(informational, plannedReportError),
						};
					} catch (error) {
						return await reportSaveFailure(error);
					}
				});
			}
		} catch (error) {
			return await reportSaveFailure(error);
		}
	}

	return {
		create: async (input: WorkflowCodeCreateInput, ctx: WorkflowCodeToolContext) =>
			await saveWorkflowCode(input, ctx),
		update: async (input: WorkflowCodeUpdateInput, ctx: WorkflowCodeToolContext) =>
			await saveWorkflowCode(input, ctx),
		invalidate,
	};
}
