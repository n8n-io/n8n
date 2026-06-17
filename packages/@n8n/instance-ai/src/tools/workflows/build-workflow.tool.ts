import { Tool } from '@n8n/agents';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { hasPlaceholderDeep } from '@n8n/utils';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { buildCredentialMap, resolveCredentials } from './resolve-credentials';
import { stripStaleCredentialsFromWorkflow } from './setup-workflow.service';
import { ensureWebhookIds } from './submit-workflow.tool';
import {
	getReferencedWorkflowIds,
	isMockableTriggerNodeType,
	isTriggerNodeType,
} from './workflow-json-utils';
import {
	getWorkflowSourceArtifactStore,
	readWorkflowSourceFile,
	writeWorkflowSourceMetadataFile,
} from './workflow-source-artifacts';
import type { InstanceAiContext } from '../../types';
import { parseAndValidate, partitionWarnings } from '../../workflow-builder';
import { BuildFailureTracker } from '../../workflow-builder/build-failure-tracker';
import { createRemediation } from '../../workflow-loop/remediation';
import {
	remediationMetadataSchema,
	type RemediationMetadata,
	type WorkflowBuildOutcome,
	type WorkflowSetupRequirement,
	type WorkflowSourceArtifact,
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
		sourceRef: z
			.string()
			.describe('Registered workflow source artifact returned by workflow-source.'),
		projectId: z
			.string()
			.optional()
			.describe('Project ID to create the workflow in. Defaults to personal project.'),
		name: z.string().optional().describe('Workflow name (required for new workflows)'),
		workItemId: z
			.string()
			.optional()
			.describe(
				'Optional workflow-loop work item hint. The registered source artifact is authoritative.',
			),
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
	isAuxiliarySupportingWorkflow,
	buildContext,
	runId,
}: {
	workItemId?: string;
	workflowId?: string;
	workflowName?: string;
	isAuxiliarySupportingWorkflow: boolean;
	buildContext?: InstanceAiContext['workflowBuildContext'];
	runId?: string;
}): string {
	if (workItemId) return workItemId;

	if (isAuxiliarySupportingWorkflow) {
		return [
			'supporting-workflow',
			buildContext?.taskId ?? (runId ? `run:${runId}` : 'unknown-run'),
			workflowId ?? workflowName ?? 'new',
		].join(':');
	}

	return (
		buildContext?.workItemId ??
		buildContext?.taskId ??
		workflowId ??
		workflowName ??
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

// Clear the AI-builder temporary marker from the main workflow so run-finish
// cleanup only reaps scratch artifacts, not the saved deliverable.
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

function sourceResponseBase(artifact: WorkflowSourceArtifact) {
	return {
		sourceRef: artifact.sourceRef,
		filePath: artifact.filePath,
		sourceHash: artifact.sourceHash,
	};
}

async function markSourceBuildFailed(
	context: InstanceAiContext,
	artifact: WorkflowSourceArtifact,
	input: { sourceHash: string; workflowName?: string },
): Promise<WorkflowSourceArtifact> {
	const store = getWorkflowSourceArtifactStore(context);
	const updated = (await store.markFailed({
		sourceRef: artifact.sourceRef,
		sourceHash: input.sourceHash,
		workflowName: input.workflowName,
	})) ?? {
		...artifact,
		sourceHash: input.sourceHash,
		workflowName: input.workflowName ?? artifact.workflowName,
		lastFailedBuildAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	await writeWorkflowSourceMetadataFile(context, updated);
	return updated;
}

async function reportFailedWorkflowBuildOutcome(
	context: InstanceAiContext,
	input: {
		artifact: WorkflowSourceArtifact;
		targetWorkflowId?: string;
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
		workItemId: input.artifact.workItemId,
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
		sourceArtifact: input.artifact,
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

function isWorkflowStructureSaveFailure(text: string): boolean {
	return text.includes('workflow structure is invalid') || text.includes('invalid_type');
}

function isWorkflowNameLengthFailure(text: string): boolean {
	return (
		text.includes('workflow name') &&
		(text.includes('too long') ||
			text.includes('maximum') ||
			text.includes('max length') ||
			text.includes('longer than'))
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
				'The saved workflow bound to this source artifact no longer exists. Stop editing this source and explain that the workflow must be restored or a new build started.',
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

	if (isWorkflowStructureSaveFailure(text)) {
		return createCodeFixableRemediation({
			reason: 'workflow_structure_invalid',
			guidance:
				'The workflow structure is invalid. Edit the registered workspace source file using the save diagnostics, then call build-workflow again with the same sourceRef.',
		});
	}

	if (isWorkflowNameLengthFailure(text)) {
		return createCodeFixableRemediation({
			reason: 'workflow_name_invalid',
			guidance:
				'The workflow name is invalid. Shorten or adjust the name in the registered workspace source file or name parameter, then call build-workflow again with the same sourceRef.',
		});
	}

	return createCodeFixableRemediation({
		reason: 'workflow_save_failed',
		guidance:
			'The workflow did not save. Edit the registered workspace source file using the returned filePath, then call build-workflow again with the same sourceRef.',
	});
}

type BuildTelemetryResult = 'success' | 'failure' | 'blocked' | 'denied' | 'suspended';
type BuildTelemetryStage =
	| 'source_lookup'
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
		sourceRef: string;
		artifact?: WorkflowSourceArtifact;
		targetWorkflowId?: string;
		savedWorkflowId?: string;
		sourceHash?: string;
		saveOperation?: 'create' | 'update';
		repairAfterFailure?: boolean;
		isSupportingWorkflow?: boolean;
		isAuxiliarySupportingWorkflow?: boolean;
		remediation?: RemediationMetadata;
		errorCount?: number;
		warningCount?: number;
	},
): void {
	const buildContext = context.workflowBuildContext;
	const artifact = input.artifact;
	context.trackTelemetry?.('instance_ai_workflow_source_build', {
		source_transport: 'workspace_file',
		result: input.result,
		stage: input.stage,
		source_ref: input.sourceRef,
		thread_id: artifact?.threadId ?? buildContext?.threadId ?? 'unknown',
		run_id: artifact?.runId ?? buildContext?.runId ?? context.runId ?? 'unknown',
		work_item_id: artifact?.workItemId ?? buildContext?.workItemId ?? 'unknown',
		task_id: artifact?.taskId ?? buildContext?.taskId ?? 'unknown',
		file_path: artifact?.filePath ?? 'unknown',
		identity_bound: Boolean(artifact?.workflowId),
		repair_after_failure: input.repairAfterFailure === true,
		is_supporting_workflow: input.isSupportingWorkflow === true,
		is_auxiliary_supporting_workflow: input.isAuxiliarySupportingWorkflow === true,
		error_count: input.errorCount ?? 0,
		warning_count: input.warningCount ?? 0,
		...(input.targetWorkflowId ? { target_workflow_id: input.targetWorkflowId } : {}),
		...(input.savedWorkflowId ? { workflow_id: input.savedWorkflowId } : {}),
		...((input.sourceHash ?? artifact?.sourceHash)
			? { source_hash: input.sourceHash ?? artifact?.sourceHash ?? '' }
			: {}),
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
			'Build and save a workflow from a registered workspace source file. ' +
				'Call workflow-source first, edit the returned filePath with workspace file tools, then pass sourceRef here.',
		)
		.input(buildWorkflowInputSchema)
		.output(
			z.object({
				success: z.boolean(),
				sourceRef: z.string(),
				filePath: z.string().optional(),
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
			const store = getWorkflowSourceArtifactStore(context);
			const registeredArtifact = await store.getBySourceRef(input.sourceRef);
			if (!registeredArtifact) {
				const remediation = createRemediation({
					category: 'blocked',
					shouldEdit: false,
					reason: 'unknown_source_ref',
					guidance:
						'Call workflow-source to create or hydrate a workflow source artifact before calling build-workflow.',
				});
				trackWorkflowSourceBuild(context, {
					result: 'blocked',
					stage: 'source_lookup',
					sourceRef: input.sourceRef,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					sourceRef: input.sourceRef,
					errors: [`Unknown workflow sourceRef: ${input.sourceRef}`],
					remediation,
				};
			}

			const repairAfterFailure = Boolean(registeredArtifact.lastFailedBuildAt);
			let sourceCode: string;
			let sourceHash: string;
			try {
				({ source: sourceCode, sourceHash } = await readWorkflowSourceFile(
					context,
					registeredArtifact,
				));
			} catch (error) {
				const remediation = createCodeFixableRemediation({
					reason: 'workflow_source_read_failed',
					guidance:
						'The registered workflow source file could not be read. Recreate or edit the returned filePath, then call build-workflow again with the same sourceRef.',
				});
				trackWorkflowSourceBuild(context, {
					result: 'failure',
					stage: 'source_read',
					sourceRef: input.sourceRef,
					artifact: registeredArtifact,
					repairAfterFailure,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					...sourceResponseBase(registeredArtifact),
					errors: [error instanceof Error ? error.message : String(error)],
					remediation,
				};
			}

			let artifact =
				sourceHash === registeredArtifact.sourceHash
					? registeredArtifact
					: {
							...registeredArtifact,
							sourceHash,
							updatedAt: new Date().toISOString(),
						};
			if (artifact !== registeredArtifact) {
				await store.upsert(artifact);
				await writeWorkflowSourceMetadataFile(context, artifact);
			}

			const targetWorkflowId = artifact.workflowId;

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
					sourceRef: input.sourceRef,
					artifact,
					targetWorkflowId,
					sourceHash,
					repairAfterFailure,
					isSupportingWorkflow: input.isSupportingWorkflow,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					...sourceResponseBase(artifact),
					workflowId: targetWorkflowId,
					workItemId: artifact.workItemId,
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
						sourceRef: input.sourceRef,
						artifact,
						targetWorkflowId,
						sourceHash,
						repairAfterFailure,
						isSupportingWorkflow: input.isSupportingWorkflow,
						remediation,
						errorCount: 1,
					});
					return {
						success: false,
						...sourceResponseBase(artifact),
						workflowId: targetWorkflowId,
						workItemId: artifact.workItemId,
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
							guidance: 'Workflow edit approval is required before saving this source.',
						});
						trackWorkflowSourceBuild(context, {
							result: 'blocked',
							stage: 'hitl',
							sourceRef: input.sourceRef,
							artifact,
							targetWorkflowId,
							sourceHash,
							repairAfterFailure,
							isSupportingWorkflow: input.isSupportingWorkflow,
							remediation,
							errorCount: 1,
						});
						return {
							success: false,
							...sourceResponseBase(artifact),
							workflowId: targetWorkflowId,
							workItemId: artifact.workItemId,
							errors: ['Workflow edit approval is required.'],
							remediation,
						};
					}
					const workflowName = await resolveWorkflowName(context, targetWorkflowId);
					trackWorkflowSourceBuild(context, {
						result: 'suspended',
						stage: 'hitl',
						sourceRef: input.sourceRef,
						artifact,
						targetWorkflowId,
						sourceHash,
						repairAfterFailure,
						isSupportingWorkflow: input.isSupportingWorkflow,
					});
					return await ctx.suspend({
						requestId: nanoid(),
						message: `Edit ${workflowName} (ID: ${targetWorkflowId})?`,
						severity: 'warning',
					});
				}
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
			const resolvedTaskId = isAuxiliarySupportingWorkflow
				? `${buildContext?.taskId ?? (context.runId ? `build-${context.runId}` : 'build')}:supporting-${nanoid(6)}`
				: (artifact.taskId ??
					buildContext?.taskId ??
					(context.runId ? `build-${context.runId}` : `build-${nanoid(8)}`));
			const workItemKey = getBuildFailureTrackingKey({
				workItemId: artifact.workItemId,
				workflowId: targetWorkflowId,
				workflowName: name ?? artifact.workflowName,
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

			// Parse TypeScript to WorkflowJSON with two-stage validation
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
						'Edit the registered workflow source file using filePath, then call build-workflow again with the same sourceRef.',
				});
				artifact = await markSourceBuildFailed(context, artifact, { sourceHash });
				await reportFailedWorkflowBuildOutcome(context, {
					artifact,
					targetWorkflowId,
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
					sourceRef: input.sourceRef,
					artifact,
					targetWorkflowId,
					sourceHash,
					repairAfterFailure,
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					remediation,
					errorCount: errors.length,
				});
				return {
					success: false,
					...sourceResponseBase(artifact),
					workflowId: targetWorkflowId,
					workItemId: artifact.workItemId,
					errors,
					remediation,
				};
			}

			// Partition validation results into blocking errors and informational warnings
			const { errors, informational } = partitionWarnings(result.warnings);

			if (errors.length > 0) {
				const formattedErrors = withEscalation(
					errors.map((e) => `[${e.code}]${e.nodeName ? ` (${e.nodeName})` : ''}: ${e.message}`),
				);
				const remediation = createCodeFixableRemediation({
					reason: 'workflow_source_validation_failed',
					guidance:
						'Edit the registered workflow source file using the validation diagnostics, then call build-workflow again with the same sourceRef.',
				});
				artifact = await markSourceBuildFailed(context, artifact, { sourceHash });
				await reportFailedWorkflowBuildOutcome(context, {
					artifact,
					targetWorkflowId,
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
					sourceRef: input.sourceRef,
					artifact,
					targetWorkflowId,
					sourceHash,
					repairAfterFailure,
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					remediation,
					errorCount: formattedErrors.length,
					warningCount: informational.length,
				});
				return {
					success: false,
					...sourceResponseBase(artifact),
					workflowId: targetWorkflowId,
					workItemId: artifact.workItemId,
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
						'Add a workflow name in the workspace source file or pass the name parameter, then call build-workflow again with the same sourceRef.',
				});
				artifact = await markSourceBuildFailed(context, artifact, { sourceHash });
				await reportFailedWorkflowBuildOutcome(context, {
					artifact,
					targetWorkflowId,
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
					sourceRef: input.sourceRef,
					artifact,
					targetWorkflowId,
					sourceHash,
					repairAfterFailure,
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					...sourceResponseBase(artifact),
					workflowId: targetWorkflowId,
					workItemId: artifact.workItemId,
					errors: [
						'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
					],
					remediation,
				};
			}

			// Resolve undefined/null credentials before saving.
			// newCredential() produces NewCredentialImpl which serializes to undefined.
			const credentialMap = await buildCredentialMap(context.credentialService);
			const mockResult = await resolveCredentials(json, targetWorkflowId, context, credentialMap);

			// Strip credential entries that are no longer valid for the current
			// parameters. Resolution above (and the LLM itself) can re-emit stale
			// references between turns; without this, setup analysis would surface
			// a credential request for a node that no longer needs one.
			await stripStaleCredentialsFromWorkflow(context, json);

			// Ensure webhook nodes have a webhookId so n8n registers clean paths
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
					artifact = (await store.updateAfterSave({
						sourceRef: artifact.sourceRef,
						workflowId: saved.id,
						workflowVersionId: saved.versionId,
						sourceHash,
						workflowName,
					})) ?? {
						...artifact,
						workflowId: saved.id,
						workflowVersionId: saved.versionId,
						sourceHash,
						workflowName,
						lastSuccessfulBuildAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					};
					await writeWorkflowSourceMetadataFile(context, artifact);
					const outcome = withDeterministicRouting({
						workItemId: artifact.workItemId,
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
						sourceArtifact: artifact,
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
						sourceRef: input.sourceRef,
						artifact,
						targetWorkflowId,
						savedWorkflowId: saved.id,
						sourceHash,
						saveOperation: operation,
						repairAfterFailure,
						isSupportingWorkflow,
						isAuxiliarySupportingWorkflow,
						remediation: placeholderRemediation,
						warningCount: informational.length,
					});

					return {
						success: true,
						...sourceResponseBase(artifact),
						workflowId: saved.id,
						workflowName: json.name || undefined,
						workItemId: artifact.workItemId,
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
				const remediation = createSaveFailureRemediation(error, Boolean(artifact.workflowId));
				artifact = await markSourceBuildFailed(context, artifact, {
					sourceHash,
					workflowName: json.name || undefined,
				});
				await reportFailedWorkflowBuildOutcome(context, {
					artifact,
					targetWorkflowId,
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
					sourceRef: input.sourceRef,
					artifact,
					targetWorkflowId,
					sourceHash,
					saveOperation: targetWorkflowId ? 'update' : 'create',
					repairAfterFailure,
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					remediation,
					errorCount: 1,
				});
				return {
					success: false,
					...sourceResponseBase(artifact),
					workflowId: targetWorkflowId,
					workflowName: json.name || undefined,
					workItemId: artifact.workItemId,
					errors: [`Workflow save failed: ${message}`],
					remediation,
				};
			}
		})
		.build();
}
