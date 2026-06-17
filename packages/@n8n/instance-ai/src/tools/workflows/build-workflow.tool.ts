import { Tool } from '@n8n/agents';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { hasPlaceholderDeep } from '@n8n/utils';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { buildCredentialMap, resolveCredentials } from './resolve-credentials';
import { stripStaleCredentialsFromWorkflow } from './setup-workflow.service';
import { ensureWebhookIds } from './submit-workflow.tool';
import {
	getWorkflowSourceFileBinding,
	normalizeWorkflowSourceFilePath,
	readWorkflowSourceFile,
	saveWorkflowSourceFileBinding,
	type WorkflowSourceFileBinding,
} from './workflow-file-bindings';
import {
	getReferencedWorkflowIds,
	isMockableTriggerNodeType,
	isTriggerNodeType,
} from './workflow-json-utils';
import type { InstanceAiContext } from '../../types';
import { parseAndValidate, partitionWarnings } from '../../workflow-builder';
import { BuildFailureTracker } from '../../workflow-builder/build-failure-tracker';
import { createRemediation } from '../../workflow-loop/remediation';
import {
	remediationMetadataSchema,
	type RemediationMetadata,
	type WorkflowBuildOutcome,
	type WorkflowSetupRequirement,
	type WorkflowVerificationReadiness,
} from '../../workflow-loop/workflow-loop-state';

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const confirmationResumeSchema = z.object({
	approved: z.boolean(),
});

interface BuildCtx {
	resumeData?: z.infer<typeof confirmationResumeSchema>;
	suspend?: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
}

export const buildWorkflowInputSchema = z
	.object({
		filePath: z
			.string()
			.min(1)
			.describe('Workspace path to the TypeScript workflow source file to build.'),
		workflowId: z
			.string()
			.optional()
			.describe(
				'Existing workflow ID to bind this file to on the first update. Once bound, omit this on retries.',
			),
		projectId: z
			.string()
			.optional()
			.describe('Project ID to create the workflow in. Defaults to personal project.'),
		name: z.string().optional().describe('Workflow name (required for new workflows)'),
		workItemId: z
			.string()
			.optional()
			.describe('Optional workflow-loop work item ID when repairing a workflow.'),
		isSupportingWorkflow: z
			.boolean()
			.optional()
			.describe(
				'Set true when saving a supporting sub-workflow that will be referenced by the main workflow. ' +
					'In a planned build task, this completes the task only when the task itself is marked isSupportingWorkflow; otherwise save the main workflow later.',
			),
	})
	.strict();

const triggerNodeOutputSchema = z.object({
	nodeName: z.string(),
	nodeType: z.string(),
});

const verificationReadinessOutputSchema = z.discriminatedUnion('status', [
	z.object({ status: z.literal('ready') }),
	z.object({ status: z.literal('already_verified') }),
	z.object({
		status: z.literal('needs_setup'),
		reason: z.enum([
			'unresolved-placeholders',
			'missing-mocked-credential-pin-data',
			'workflow-needs-setup',
		]),
		guidance: z.string(),
	}),
	z.object({
		status: z.literal('not_verifiable'),
		reason: z.enum(['not-submitted', 'missing-workflow-id', 'non-mockable-trigger']),
		guidance: z.string(),
	}),
]);

const setupRequirementOutputSchema = z.discriminatedUnion('status', [
	z.object({ status: z.literal('not_required') }),
	z.object({
		status: z.literal('required'),
		reason: z.enum(['mocked-credentials', 'unresolved-placeholders', 'workflow-needs-setup']),
		guidance: z.string(),
	}),
]);

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

function getBuildFailureTrackingKey({
	workItemId,
	workflowId,
	workflowName,
	filePath,
	isAuxiliarySupportingWorkflow,
	buildContext,
	runId,
}: {
	workItemId?: string;
	workflowId?: string;
	workflowName?: string;
	filePath: string;
	isAuxiliarySupportingWorkflow: boolean;
	buildContext?: InstanceAiContext['workflowBuildContext'];
	runId?: string;
}): string {
	if (workItemId) return workItemId;

	if (isAuxiliarySupportingWorkflow) {
		return [
			'supporting-workflow',
			buildContext?.taskId ?? (runId ? `run:${runId}` : 'unknown-run'),
			workflowId ?? workflowName ?? filePath,
		].join(':');
	}

	return (
		buildContext?.workItemId ??
		buildContext?.taskId ??
		workflowId ??
		workflowName ??
		filePath ??
		`run:${runId ?? 'unknown'}`
	);
}

function determineVerificationReadiness(
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

	if (outcome.hasUnresolvedPlaceholders) {
		return {
			status: 'needs_setup',
			reason: 'unresolved-placeholders',
			guidance: 'Route the workflow through setup before verification.',
		};
	}

	if (hasMockedCredentials(outcome) && !hasCredentialVerificationData(outcome)) {
		return {
			status: 'needs_setup',
			reason: 'missing-mocked-credential-pin-data',
			guidance: 'Route the workflow through setup because mocked credentials cannot be verified.',
		};
	}

	if (!outcome.triggerNodes?.some((node) => isMockableTriggerNodeType(node.nodeType))) {
		return {
			status: 'not_verifiable',
			reason: 'non-mockable-trigger',
			guidance: 'The workflow does not have a trigger the post-build verifier can exercise.',
		};
	}

	return { status: 'ready' };
}

function determineSetupRequirement(
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

function withDeterministicRouting(
	outcome: Omit<WorkflowBuildOutcome, 'verificationReadiness' | 'setupRequirement'>,
): WorkflowBuildOutcome {
	return {
		...outcome,
		verificationReadiness: determineVerificationReadiness(outcome),
		setupRequirement: determineSetupRequirement(outcome),
	};
}

function isApprovedBuildContext(context: InstanceAiContext): boolean {
	const buildContext = context.workflowBuildContext;
	return Boolean(buildContext?.plannedTaskService ?? buildContext?.allowPostPlanWorkflowCreate);
}

async function resolveWorkflowName(
	context: InstanceAiContext,
	workflowId: string,
): Promise<string> {
	try {
		return (await context.workflowService.getAsWorkflowJSON(workflowId)).name || 'workflow';
	} catch {
		return 'workflow';
	}
}

async function reportWorkflowBuildOutcome(
	context: InstanceAiContext,
	outcome: WorkflowBuildOutcome,
	options: { storeOnRunContext?: boolean; markPlannedTaskSucceeded?: boolean } = {},
): Promise<void> {
	const buildContext = context.workflowBuildContext;
	if (!buildContext) return;

	if (options.storeOnRunContext !== false) {
		try {
			await buildContext.onBuildOutcome?.(outcome);
		} catch (error) {
			context.logger?.warn('Failed to store workflow build outcome on run context', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	try {
		await buildContext.workflowTaskService?.reportBuildOutcome(outcome);
	} catch (error) {
		context.logger?.warn('Failed to report workflow build outcome to workflow loop', {
			workItemId: outcome.workItemId,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	if (options.markPlannedTaskSucceeded === false) return;

	try {
		await buildContext.plannedTaskService?.markSucceeded(
			buildContext.threadId,
			buildContext.taskId,
			{
				result: outcome.summary,
				outcome,
			},
		);
	} catch (error) {
		context.logger?.warn('Failed to mark planned workflow build task succeeded', {
			taskId: buildContext.taskId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

async function promoteMainWorkflow(context: InstanceAiContext, workflowId: string): Promise<void> {
	try {
		await context.workflowService.clearAiTemporary(workflowId);
	} catch (error) {
		context.logger?.warn(
			`Failed to clear AI-builder temporary marker on main workflow ${workflowId}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

function formatWarning(code: string, message: string): string {
	return `[${code}]: ${message}`;
}

function combineWarnings(...groups: Array<string[] | undefined>): string[] | undefined {
	const warnings = groups.flatMap((group) => group ?? []);
	return warnings.length > 0 ? warnings : undefined;
}

function sourceResponseBase(binding: WorkflowSourceFileBinding) {
	return {
		filePath: binding.filePath,
		sourceHash: binding.sourceHash,
	};
}

async function markSourceBuildFailed(
	context: InstanceAiContext,
	binding: WorkflowSourceFileBinding,
	sourceHash: string,
): Promise<WorkflowSourceFileBinding> {
	return await saveWorkflowSourceFileBinding(context, {
		...binding,
		sourceHash,
	});
}

async function reportFailedWorkflowBuildOutcome(
	context: InstanceAiContext,
	input: {
		binding: WorkflowSourceFileBinding;
		targetWorkflowId?: string;
		workItemId: string;
		taskId: string;
		plannedTaskId?: string;
		owner: WorkflowBuildOutcome['owner'];
		remediation: RemediationMetadata;
		errors: string[];
		summary: string;
		storeOnRunContext: boolean;
	},
): Promise<void> {
	const buildContext = context.workflowBuildContext;
	const outcome = withDeterministicRouting({
		workItemId: input.workItemId,
		...((buildContext?.runId ?? context.runId)
			? { runId: buildContext?.runId ?? context.runId }
			: {}),
		taskId: input.taskId,
		owner: input.owner,
		plannedTaskId: input.plannedTaskId,
		workflowId: input.targetWorkflowId,
		submitted: false,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		blockingReason: input.remediation.guidance,
		failureSignature: input.errors.join('\n').slice(0, 500),
		remediation: input.remediation,
		summary: input.summary,
	});

	await reportWorkflowBuildOutcome(context, outcome, {
		storeOnRunContext: input.storeOnRunContext,
		markPlannedTaskSucceeded: false,
	});
}

function isWorkflowNotFoundError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /workflow not found/i.test(message);
}

function getFailureText(error: unknown): string {
	return (error instanceof Error ? error.message : String(error)).toLowerCase();
}

function isCredentialSaveFailure(text: string): boolean {
	if (!text.includes('credential')) return false;

	return (
		text.includes('not found') ||
		text.includes('missing') ||
		text.includes('not accessible') ||
		text.includes('no access') ||
		text.includes('do not have access') ||
		text.includes("don't have access") ||
		text.includes('not shared') ||
		text.includes('unauthorized')
	);
}

function isPermissionSaveFailure(text: string): boolean {
	return (
		text.includes('blocked by admin') ||
		text.includes('read-only') ||
		text.includes('permission') ||
		text.includes('forbidden') ||
		text.includes('not authorized')
	);
}

function createCodeFixableRemediation(input: {
	reason: string;
	guidance: string;
}): RemediationMetadata {
	return createRemediation({
		category: 'code_fixable',
		shouldEdit: true,
		reason: input.reason,
		guidance: input.guidance,
	});
}

function createSaveFailureRemediation(
	error: unknown,
	hasBoundWorkflowId: boolean,
): RemediationMetadata {
	const text = getFailureText(error);

	if (isCredentialSaveFailure(text)) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'workflow_save_credential_setup_required',
			guidance:
				'Workflow save failed because a credential is missing or inaccessible. Stop code edits and route the workflow through setup.',
		});
	}

	if (hasBoundWorkflowId && isWorkflowNotFoundError(error)) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'bound_workflow_not_found',
			guidance:
				'The saved workflow bound to this source file no longer exists. Stop editing this source and explain that the workflow must be restored or a new build started.',
		});
	}

	if (isPermissionSaveFailure(text)) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'workflow_save_permission_blocked',
			guidance:
				'Workflow save is blocked by permissions or read-only instance configuration. Stop editing and explain the blocker to the user.',
		});
	}

	return createCodeFixableRemediation({
		reason: 'workflow_save_failed',
		guidance:
			'The workflow did not save. Edit the workspace source file using the returned filePath, then call build-workflow again with the same filePath.',
	});
}

type BuildTelemetryResult = 'success' | 'failure' | 'blocked' | 'denied' | 'suspended';
type BuildTelemetryStage =
	| 'source_read'
	| 'permission'
	| 'hitl'
	| 'parse'
	| 'validation'
	| 'name'
	| 'save';

function trackWorkflowSourceBuild(
	context: InstanceAiContext,
	input: {
		result: BuildTelemetryResult;
		stage: BuildTelemetryStage;
		binding: WorkflowSourceFileBinding;
		targetWorkflowId?: string;
		savedWorkflowId?: string;
		saveOperation?: 'create' | 'update';
		isSupportingWorkflow?: boolean;
		isAuxiliarySupportingWorkflow?: boolean;
		remediation?: RemediationMetadata;
		errorCount?: number;
		warningCount?: number;
	},
): void {
	const buildContext = context.workflowBuildContext;
	context.trackTelemetry?.('instance_ai_workflow_source_build', {
		source_transport: 'workspace_file',
		result: input.result,
		stage: input.stage,
		thread_id: context.threadId ?? buildContext?.threadId ?? 'unknown',
		run_id: buildContext?.runId ?? context.runId ?? 'unknown',
		work_item_id: buildContext?.workItemId ?? 'unknown',
		task_id: buildContext?.taskId ?? 'unknown',
		file_path: input.binding.filePath,
		identity_bound: Boolean(input.binding.workflowId),
		is_supporting_workflow: input.isSupportingWorkflow === true,
		is_auxiliary_supporting_workflow: input.isAuxiliarySupportingWorkflow === true,
		error_count: input.errorCount ?? 0,
		warning_count: input.warningCount ?? 0,
		...(input.targetWorkflowId ? { target_workflow_id: input.targetWorkflowId } : {}),
		...(input.savedWorkflowId ? { workflow_id: input.savedWorkflowId } : {}),
		...(input.binding.sourceHash ? { source_hash: input.binding.sourceHash } : {}),
		...(input.saveOperation ? { save_operation: input.saveOperation } : {}),
		...(input.remediation
			? {
					remediation_category: input.remediation.category,
					remediation_should_edit: input.remediation.shouldEdit,
					...(input.remediation.reason ? { remediation_reason: input.remediation.reason } : {}),
				}
			: {}),
	});
}

export function createBuildWorkflowTool(context: InstanceAiContext) {
	const failureTracker = new BuildFailureTracker();

	return new Tool('build-workflow')
		.description(
			'Build and save a workflow from a TypeScript SDK source file in the workspace. ' +
				'Write or edit the file with workspace file tools, then pass its filePath here.',
		)
		.input(buildWorkflowInputSchema)
		.output(
			z.object({
				success: z.boolean(),
				filePath: z.string(),
				sourceHash: z.string().optional(),
				workflowId: z.string().optional(),
				workflowName: z.string().optional(),
				workItemId: z.string().optional(),
				triggerNodes: z.array(triggerNodeOutputSchema).optional(),
				verificationReadiness: verificationReadinessOutputSchema.optional(),
				setupRequirement: setupRequirementOutputSchema.optional(),
				isSupportingWorkflow: z.boolean().optional(),
				mockedNodeNames: z.array(z.string()).optional(),
				mockedCredentialTypes: z.array(z.string()).optional(),
				mockedCredentialsByNode: z.record(z.array(z.string())).optional(),
				verificationPinData: z.record(z.array(z.record(z.unknown()))).optional(),
				usesWorkflowPinDataForVerification: z.boolean().optional(),
				referencedWorkflowIds: z.array(z.string()).optional(),
				hasUnresolvedPlaceholders: z.boolean().optional(),
				denied: z.boolean().optional(),
				reason: z.string().optional(),
				remediation: remediationMetadataSchema.optional(),
				errors: z.array(z.string()).optional(),
				warnings: z.array(z.string()).optional(),
			}),
		)
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input, ctx: BuildCtx) => {
			const filePath = normalizeWorkflowSourceFilePath(input.filePath);
			let binding = (await getWorkflowSourceFileBinding(context, filePath)) ?? { filePath };

			if (input.workflowId && binding.workflowId && input.workflowId !== binding.workflowId) {
				const remediation = createRemediation({
					category: 'blocked',
					shouldEdit: false,
					reason: 'source_file_workflow_mismatch',
					guidance:
						'This source file is already bound to a different workflow. Use the bound workflow or start from a different filePath.',
				});
				trackWorkflowSourceBuild(context, {
					result: 'blocked',
					stage: 'permission',
					binding,
					targetWorkflowId: binding.workflowId,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					...sourceResponseBase(binding),
					workflowId: binding.workflowId,
					errors: [
						`Source file ${filePath} is already bound to workflow ${binding.workflowId}; cannot bind it to ${input.workflowId}.`,
					],
					remediation,
				};
			}

			if (input.workflowId && !binding.workflowId) {
				binding = await saveWorkflowSourceFileBinding(context, {
					...binding,
					workflowId: input.workflowId,
				});
			}

			const targetWorkflowId = binding.workflowId;
			const permKey = targetWorkflowId ? 'updateWorkflow' : 'createWorkflow';
			if (context.permissions?.[permKey] === 'blocked') {
				const remediation = createRemediation({
					category: 'blocked',
					shouldEdit: false,
					reason: 'permission_blocked',
					guidance: 'The requested workflow save action is blocked by admin policy.',
				});
				trackWorkflowSourceBuild(context, {
					result: 'blocked',
					stage: 'permission',
					binding,
					targetWorkflowId,
					isSupportingWorkflow: input.isSupportingWorkflow,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					...sourceResponseBase(binding),
					workflowId: targetWorkflowId,
					errors: ['Action blocked by admin'],
					remediation,
				};
			}

			if (
				targetWorkflowId &&
				!isApprovedBuildContext(context) &&
				context.permissions?.updateWorkflow !== 'always_allow'
			) {
				if (ctx.resumeData && !ctx.resumeData.approved) {
					const remediation = createRemediation({
						category: 'blocked',
						shouldEdit: false,
						reason: 'user_denied',
						guidance: 'The user denied permission to edit this workflow.',
					});
					trackWorkflowSourceBuild(context, {
						result: 'denied',
						stage: 'hitl',
						binding,
						targetWorkflowId,
						isSupportingWorkflow: input.isSupportingWorkflow,
						remediation,
						errorCount: 1,
					});
					return {
						success: false,
						...sourceResponseBase(binding),
						workflowId: targetWorkflowId,
						denied: true,
						reason: 'User denied the action',
						errors: ['User denied the action'],
						remediation,
					};
				}
				if (!ctx.resumeData) {
					if (!ctx.suspend) {
						const remediation = createRemediation({
							category: 'blocked',
							shouldEdit: false,
							reason: 'approval_required',
							guidance: 'Workflow edit approval is required before saving this source file.',
						});
						trackWorkflowSourceBuild(context, {
							result: 'blocked',
							stage: 'hitl',
							binding,
							targetWorkflowId,
							isSupportingWorkflow: input.isSupportingWorkflow,
							remediation,
							errorCount: 1,
						});
						return {
							success: false,
							...sourceResponseBase(binding),
							workflowId: targetWorkflowId,
							errors: ['Workflow edit approval is required.'],
							remediation,
						};
					}
					const workflowName = await resolveWorkflowName(context, targetWorkflowId);
					trackWorkflowSourceBuild(context, {
						result: 'suspended',
						stage: 'hitl',
						binding,
						targetWorkflowId,
						isSupportingWorkflow: input.isSupportingWorkflow,
					});
					return await ctx.suspend({
						requestId: nanoid(),
						message: `Edit ${workflowName} (ID: ${targetWorkflowId})?`,
						severity: 'warning',
					});
				}
			}

			let sourceCode: string;
			let sourceHash: string;
			try {
				({ source: sourceCode, sourceHash } = await readWorkflowSourceFile(context, filePath));
			} catch (error) {
				const remediation = createCodeFixableRemediation({
					reason: 'workflow_source_read_failed',
					guidance:
						'The workflow source file could not be read. Recreate or edit the returned filePath, then call build-workflow again with the same filePath.',
				});
				trackWorkflowSourceBuild(context, {
					result: 'failure',
					stage: 'source_read',
					binding,
					targetWorkflowId,
					isSupportingWorkflow: input.isSupportingWorkflow,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					...sourceResponseBase(binding),
					workflowId: targetWorkflowId,
					errors: [error instanceof Error ? error.message : String(error)],
					remediation,
				};
			}

			if (sourceHash !== binding.sourceHash) {
				binding = await saveWorkflowSourceFileBinding(context, { ...binding, sourceHash });
			}

			const { projectId, name } = input;
			const isSupportingWorkflow = input.isSupportingWorkflow === true;
			const buildContext = context.workflowBuildContext;
			const isAuxiliarySupportingWorkflow =
				isSupportingWorkflow && buildContext?.isSupportingWorkflowTask !== true;
			const plannedTaskId =
				buildContext?.plannedTaskService && !isAuxiliarySupportingWorkflow
					? buildContext.taskId
					: undefined;
			const owner = plannedTaskId
				? { type: 'planned' as const, taskId: plannedTaskId }
				: { type: 'direct' as const };
			const resolvedWorkItemId =
				input.workItemId ??
				(isAuxiliarySupportingWorkflow ? undefined : buildContext?.workItemId) ??
				filePath;
			const resolvedTaskId = isAuxiliarySupportingWorkflow
				? `${buildContext?.taskId ?? (context.runId ? `build-${context.runId}` : 'build')}:supporting-${nanoid(6)}`
				: (buildContext?.taskId ??
					(context.runId ? `build-${context.runId}` : `build-${nanoid(8)}`));
			const workItemKey = getBuildFailureTrackingKey({
				workItemId: resolvedWorkItemId,
				workflowId: targetWorkflowId,
				workflowName: name,
				filePath,
				isAuxiliarySupportingWorkflow,
				buildContext,
				runId: context.runId,
			});
			const withEscalation = (
				errors: string[],
				options: { includeSdkLanguageGuidance?: boolean } = {},
			): string[] => {
				const escalation = failureTracker.record(workItemKey, errors, options);
				return escalation ? [...errors, escalation] : errors;
			};

			let result;
			try {
				result = parseAndValidate(sourceCode, {
					nodeTypesProvider: context.nodeTypesProvider,
				});
			} catch (error) {
				const errors = withEscalation(
					[error instanceof Error ? error.message : 'Failed to parse workflow code'],
					{
						includeSdkLanguageGuidance: true,
					},
				);
				const remediation = createCodeFixableRemediation({
					reason: 'workflow_source_parse_failed',
					guidance:
						'Edit the workspace source file using filePath, then call build-workflow again with the same filePath.',
				});
				binding = await markSourceBuildFailed(context, binding, sourceHash);
				await reportFailedWorkflowBuildOutcome(context, {
					binding,
					targetWorkflowId,
					workItemId: resolvedWorkItemId,
					taskId: resolvedTaskId,
					plannedTaskId,
					owner,
					remediation,
					errors,
					summary: 'Workflow source did not parse.',
					storeOnRunContext: !isAuxiliarySupportingWorkflow,
				});
				trackWorkflowSourceBuild(context, {
					result: 'failure',
					stage: 'parse',
					binding,
					targetWorkflowId,
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					remediation,
					errorCount: errors.length,
				});
				return {
					success: false,
					...sourceResponseBase(binding),
					workflowId: targetWorkflowId,
					workItemId: resolvedWorkItemId,
					errors,
					remediation,
				};
			}

			const { errors, informational } = partitionWarnings(result.warnings);

			if (errors.length > 0) {
				const formattedErrors = withEscalation(
					errors.map((e) => `[${e.code}]${e.nodeName ? ` (${e.nodeName})` : ''}: ${e.message}`),
				);
				const remediation = createCodeFixableRemediation({
					reason: 'workflow_source_validation_failed',
					guidance:
						'Edit the workspace source file using the validation diagnostics, then call build-workflow again with the same filePath.',
				});
				binding = await markSourceBuildFailed(context, binding, sourceHash);
				await reportFailedWorkflowBuildOutcome(context, {
					binding,
					targetWorkflowId,
					workItemId: resolvedWorkItemId,
					taskId: resolvedTaskId,
					plannedTaskId,
					owner,
					remediation,
					errors: formattedErrors,
					summary: 'Workflow source failed SDK validation.',
					storeOnRunContext: !isAuxiliarySupportingWorkflow,
				});
				trackWorkflowSourceBuild(context, {
					result: 'failure',
					stage: 'validation',
					binding,
					targetWorkflowId,
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					remediation,
					errorCount: formattedErrors.length,
					warningCount: informational.length,
				});
				return {
					success: false,
					...sourceResponseBase(binding),
					workflowId: targetWorkflowId,
					workItemId: resolvedWorkItemId,
					errors: formattedErrors,
					remediation,
					warnings: combineWarnings(informational.map((w) => formatWarning(w.code, w.message))),
				};
			}

			const json = result.workflow;
			if (name) {
				json.name = name;
			} else if (!json.name && !targetWorkflowId) {
				const remediation = createCodeFixableRemediation({
					reason: 'workflow_name_missing',
					guidance:
						'Add a workflow name in the workspace source file or pass the name parameter, then call build-workflow again with the same filePath.',
				});
				binding = await markSourceBuildFailed(context, binding, sourceHash);
				await reportFailedWorkflowBuildOutcome(context, {
					binding,
					targetWorkflowId,
					workItemId: resolvedWorkItemId,
					taskId: resolvedTaskId,
					plannedTaskId,
					owner,
					remediation,
					errors: [
						'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
					],
					summary: 'Workflow source is missing a workflow name.',
					storeOnRunContext: !isAuxiliarySupportingWorkflow,
				});
				trackWorkflowSourceBuild(context, {
					result: 'failure',
					stage: 'name',
					binding,
					targetWorkflowId,
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					...sourceResponseBase(binding),
					workflowId: targetWorkflowId,
					workItemId: resolvedWorkItemId,
					errors: [
						'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
					],
					remediation,
				};
			}

			const credentialMap = await buildCredentialMap(context.credentialService);
			const mockResult = await resolveCredentials(json, targetWorkflowId, context, credentialMap);

			await stripStaleCredentialsFromWorkflow(context, json);
			await ensureWebhookIds(json, targetWorkflowId, context);

			try {
				const hasMockedCredentialNodes = mockResult.mockedNodeNames.length > 0;
				const referencedWorkflowIds = getReferencedWorkflowIds(json);
				const triggerNodes = (json.nodes ?? [])
					.filter((n) => isTriggerNodeType(n.type))
					.map((n) => ({ nodeName: n.name, nodeType: n.type }))
					.filter(
						(t): t is { nodeName: string; nodeType: string } =>
							Boolean(t.nodeName) && Boolean(t.nodeType),
					);
				const hasPlaceholders = (json.nodes ?? []).some((n) => hasPlaceholderDeep(n.parameters));
				const createSuccessResponse = async (
					saved: { id: string; versionId: string },
					operation: 'create' | 'update',
				) => {
					const runId = buildContext?.runId ?? context.runId;
					const workflowName = json.name || 'workflow';
					const summary = `${operation === 'update' ? 'Updated' : 'Created'} ${isSupportingWorkflow ? 'supporting ' : ''}workflow "${workflowName}" (${saved.id}).`;
					const placeholderRemediation = hasPlaceholders
						? createRemediation({
								category: 'needs_setup',
								shouldEdit: false,
								reason: 'mocked_credentials_or_placeholders',
								guidance:
									'Workflow submitted successfully, but unresolved setup values remain. Stop code edits and route to workflows(action="setup").',
							})
						: undefined;
					binding = await saveWorkflowSourceFileBinding(context, {
						...binding,
						workflowId: saved.id,
						workflowVersionId: saved.versionId,
						sourceHash,
					});
					const outcome = withDeterministicRouting({
						workItemId: resolvedWorkItemId,
						...(runId ? { runId } : {}),
						taskId: resolvedTaskId,
						owner,
						plannedTaskId,
						workflowId: saved.id,
						submitted: true,
						triggerType: 'manual_or_testable',
						triggerNodes,
						needsUserInput: hasPlaceholders,
						blockingReason: placeholderRemediation?.guidance,
						mockedNodeNames: hasMockedCredentialNodes ? mockResult.mockedNodeNames : undefined,
						mockedCredentialTypes: hasMockedCredentialNodes
							? mockResult.mockedCredentialTypes
							: undefined,
						mockedCredentialsByNode: hasMockedCredentialNodes
							? mockResult.mockedCredentialsByNode
							: undefined,
						verificationPinData:
							hasMockedCredentialNodes && Object.keys(mockResult.verificationPinData).length > 0
								? mockResult.verificationPinData
								: undefined,
						usesWorkflowPinDataForVerification:
							mockResult.usesWorkflowPinDataForVerification || undefined,
						supportingWorkflowIds:
							referencedWorkflowIds.length > 0 ? referencedWorkflowIds : undefined,
						hasUnresolvedPlaceholders: hasPlaceholders || undefined,
						remediation: placeholderRemediation,
						summary,
					});

					await promoteMainWorkflow(context, saved.id);
					await reportWorkflowBuildOutcome(context, outcome, {
						storeOnRunContext: !isAuxiliarySupportingWorkflow,
						markPlannedTaskSucceeded: !isAuxiliarySupportingWorkflow,
					});

					failureTracker.clear(workItemKey);

					trackWorkflowSourceBuild(context, {
						result: 'success',
						stage: 'save',
						binding,
						targetWorkflowId,
						savedWorkflowId: saved.id,
						saveOperation: operation,
						isSupportingWorkflow,
						isAuxiliarySupportingWorkflow,
						remediation: placeholderRemediation,
						warningCount: informational.length,
					});

					return {
						success: true,
						...sourceResponseBase(binding),
						workflowId: saved.id,
						workflowName: json.name || undefined,
						workItemId: resolvedWorkItemId,
						isSupportingWorkflow: isSupportingWorkflow || undefined,
						triggerNodes,
						verificationReadiness: outcome.verificationReadiness,
						setupRequirement: outcome.setupRequirement,
						mockedNodeNames: hasMockedCredentialNodes ? mockResult.mockedNodeNames : undefined,
						mockedCredentialTypes: hasMockedCredentialNodes
							? mockResult.mockedCredentialTypes
							: undefined,
						mockedCredentialsByNode: hasMockedCredentialNodes
							? mockResult.mockedCredentialsByNode
							: undefined,
						verificationPinData:
							hasMockedCredentialNodes && Object.keys(mockResult.verificationPinData).length > 0
								? mockResult.verificationPinData
								: undefined,
						usesWorkflowPinDataForVerification:
							mockResult.usesWorkflowPinDataForVerification || undefined,
						referencedWorkflowIds:
							referencedWorkflowIds.length > 0 ? referencedWorkflowIds : undefined,
						hasUnresolvedPlaceholders: hasPlaceholders || undefined,
						warnings: combineWarnings(informational.map((w) => formatWarning(w.code, w.message))),
					};
				};

				if (targetWorkflowId) {
					const updated = await context.workflowService.updateFromWorkflowJSON(
						targetWorkflowId,
						json,
						projectId ? { projectId } : undefined,
					);
					return await createSuccessResponse(updated, 'update');
				}

				const created = await context.workflowService.createFromWorkflowJSON(json, {
					...(projectId ? { projectId } : {}),
					markAsAiTemporary: true,
				});
				(context.aiCreatedWorkflowIds ??= new Set<string>()).add(created.id);
				return await createSuccessResponse(created, 'create');
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				const remediation = createSaveFailureRemediation(error, Boolean(binding.workflowId));
				binding = await markSourceBuildFailed(context, binding, sourceHash);
				await reportFailedWorkflowBuildOutcome(context, {
					binding,
					targetWorkflowId,
					workItemId: resolvedWorkItemId,
					taskId: resolvedTaskId,
					plannedTaskId,
					owner,
					remediation,
					errors: [`Workflow save failed: ${message}`],
					summary: 'Workflow source parsed but did not save.',
					storeOnRunContext: !isAuxiliarySupportingWorkflow,
				});
				trackWorkflowSourceBuild(context, {
					result: remediation.category === 'blocked' ? 'blocked' : 'failure',
					stage: 'save',
					binding,
					targetWorkflowId,
					saveOperation: targetWorkflowId ? 'update' : 'create',
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					...sourceResponseBase(binding),
					workflowId: targetWorkflowId,
					workflowName: json.name || undefined,
					workItemId: resolvedWorkItemId,
					errors: [`Workflow save failed: ${message}`],
					remediation,
				};
			}
		})
		.build();
}
