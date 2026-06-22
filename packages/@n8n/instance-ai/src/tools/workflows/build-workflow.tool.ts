import { Tool } from '@n8n/agents';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { hasPlaceholderDeep } from '@n8n/utils';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { planVerificationSimulation } from './plan-verification-simulation';
import { buildCredentialMap, resolveCredentials } from './resolve-credentials';
import { stripStaleCredentialsFromWorkflow } from './setup-workflow.service';
import {
	combineWarnings,
	formatWarning,
	getBuildFailureTrackingKey,
	isApprovedBuildContext,
	markSourceBuildFailed,
	resolveBuildIdentifiers,
	resolveWorkflowName,
	sourceResponseBase,
} from './workflow-build-context';
import {
	createCodeFixableRemediation,
	createSaveFailureRemediation,
	createSourceCompileRemediation,
} from './workflow-build-remediation';
import {
	promoteMainWorkflow,
	reportFailedWorkflowBuildOutcome,
	reportWorkflowBuildOutcome,
} from './workflow-build-reporting';
import { withDeterministicRouting } from './workflow-build-routing';
import { trackWorkflowSourceBuild } from './workflow-build-telemetry';
import {
	getWorkflowSourceFileBinding,
	normalizeWorkflowSourceFilePath,
	readWorkflowSourceFile,
	saveWorkflowSourceFileBinding,
} from './workflow-file-bindings';
import {
	ensureWebhookIds,
	getReferencedWorkflowIds,
	isTriggerNodeType,
	preserveExistingNodeGroupIds,
} from './workflow-json-utils';
import { compileWorkflowSource } from './workflow-source-compiler';
import { partitionWarnings, type ValidationWarning } from './workflow-validation-warnings';
import type { InstanceAiContext } from '../../types';
import { BuildFailureTracker } from '../../workflow-builder/build-failure-tracker';
import { createRemediation } from '../../workflow-loop/remediation';
import { remediationMetadataSchema } from '../../workflow-loop/workflow-loop-state';

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const confirmationResumeSchema = z.object({
	approved: z.boolean(),
});

interface BuildCtx {
	toolCallId?: string;
	resumeData?: z.infer<typeof confirmationResumeSchema>;
	suspend?: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
}

export const buildWorkflowInputSchema = z
	.object({
		filePath: z
			.string()
			.min(1)
			.refine(
				(value) => {
					try {
						normalizeWorkflowSourceFilePath(value);
						return true;
					} catch {
						return false;
					}
				},
				{ message: 'Workflow source file path must stay within the workspace root.' },
			)
			.describe(
				'Workspace path to the workflow source file to build. Supports TypeScript SDK files and WorkflowJSON .json files.',
			),
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

export function createBuildWorkflowTool(context: InstanceAiContext) {
	const failureTracker = new BuildFailureTracker();

	return new Tool('build-workflow')
		.description(
			'Build and save a workflow from a workspace source file. ' +
				'Use TypeScript SDK source for new workflows, or WorkflowJSON .json source for existing workflow edits. ' +
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
			const {
				isAuxiliarySupportingWorkflow,
				plannedTaskId,
				owner,
				resolvedWorkItemId,
				resolvedTaskId,
			} = resolveBuildIdentifiers({
				context,
				filePath,
				inputWorkItemId: input.workItemId,
				isSupportingWorkflow,
			});
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

			let informational: ValidationWarning[] = [];

			const compiled = await compileWorkflowSource(context, filePath, sourceCode);
			if (!compiled.success) {
				const errors = compiled.editable ? withEscalation(compiled.errors) : compiled.errors;
				const remediation = createSourceCompileRemediation({
					reason: compiled.reason,
					editable: compiled.editable,
				});
				binding = await markSourceBuildFailed(context, binding, sourceHash);
				await reportFailedWorkflowBuildOutcome(context, {
					targetWorkflowId,
					sourceFilePath: filePath,
					workItemId: resolvedWorkItemId,
					taskId: resolvedTaskId,
					plannedTaskId,
					owner,
					remediation,
					errors,
					summary: compiled.summary,
					storeOnRunContext: !isAuxiliarySupportingWorkflow,
				});
				trackWorkflowSourceBuild(context, {
					result: remediation.category === 'blocked' ? 'blocked' : 'failure',
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

			const partitionedWarnings = partitionWarnings(compiled.warnings);
			informational = partitionedWarnings.informational;

			if (partitionedWarnings.errors.length > 0) {
				const formattedErrors = withEscalation(
					partitionedWarnings.errors.map(
						(e) => `[${e.code}]${e.nodeName ? ` (${e.nodeName})` : ''}: ${e.message}`,
					),
				);
				const remediation = createCodeFixableRemediation({
					reason: 'workflow_source_validation_failed',
					guidance:
						'Edit the workspace source file using the validation diagnostics, then call build-workflow again with the same filePath.',
				});
				binding = await markSourceBuildFailed(context, binding, sourceHash);
				await reportFailedWorkflowBuildOutcome(context, {
					targetWorkflowId,
					sourceFilePath: filePath,
					workItemId: resolvedWorkItemId,
					taskId: resolvedTaskId,
					plannedTaskId,
					owner,
					remediation,
					errors: formattedErrors,
					summary: 'Workflow source failed validation.',
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

			const json = compiled.workflow;
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
					targetWorkflowId,
					sourceFilePath: filePath,
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

			try {
				await ensureWebhookIds(json, targetWorkflowId, context);
				await preserveExistingNodeGroupIds(json, targetWorkflowId, context);

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
					const { nodeSimulationPlan, simulationFixtures } = await planVerificationSimulation({
						workflow: json,
						mockedNodeNames: mockResult.mockedNodeNames,
						workflowId: saved.id,
						logger: context.logger,
					});
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
						sourceFilePath: filePath,
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
						nodeSimulationPlan,
						simulationFixtures,
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
					targetWorkflowId,
					sourceFilePath: filePath,
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
