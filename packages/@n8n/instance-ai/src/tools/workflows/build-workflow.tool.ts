import { Tool } from '@n8n/agents';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { hasPlaceholderDeep } from '@n8n/utils';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
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
import type { InstanceAiContext } from '../../types';
import { parseAndValidate, partitionWarnings } from '../../workflow-builder';
import { BuildFailureTracker } from '../../workflow-builder/build-failure-tracker';
import { extractWorkflowCode } from '../../workflow-builder/extract-code';
import { applyPatches } from '../../workflow-builder/patch-code';
import { createRemediation } from '../../workflow-loop/remediation';
import type {
	WorkflowBuildOutcome,
	WorkflowSetupRequirement,
	WorkflowVerificationReadiness,
} from '../../workflow-loop/workflow-loop-state';

const patchSchema = z.object({
	old_str: z.string().describe('Exact string to find in the code'),
	new_str: z.string().describe('Replacement string'),
});

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

// Coerce JSON-stringified arrays into arrays. The model sometimes sends `patches`
// as a JSON string because the payload contains escaped code. Leave non-strings
// untouched so Zod can validate them normally.
function coercePatches(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

export const buildWorkflowInputSchema = z.object({
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
	workflowId: z.string().optional().describe('Existing workflow ID to update (omit to create new)'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID to create the workflow in. Defaults to personal project.'),
	name: z.string().optional().describe('Workflow name (required for new workflows)'),
	workItemId: z
		.string()
		.optional()
		.describe(
			'Existing workflow-loop work item ID when patching a workflow from verification guidance.',
		),
	isSupportingWorkflow: z
		.boolean()
		.optional()
		.describe(
			'Set true when saving a supporting sub-workflow that will be referenced by the main workflow. ' +
				'In a planned build task, this completes the task only when the task itself is marked isSupportingWorkflow; otherwise save the main workflow later.',
		),
});

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

export function createBuildWorkflowTool(context: InstanceAiContext) {
	// Keeps the last code submitted (or patched) so patches work even before save,
	// and always match the LLM's own code — not a roundtripped version.
	// lastCodeVersionId pins the cache to the workflow version it was derived
	// from; a mismatch on the next turn (user edited the workflow in the canvas)
	// invalidates the cache so patches don't silently overwrite the user's work.
	let lastCode: string | null = null;
	let lastCodeVersionId: string | null = null;
	const failureTracker = new BuildFailureTracker();

	return new Tool('build-workflow')
		.description(
			'Build a workflow from TypeScript SDK code. Two modes:\n' +
				'1. Full code: pass `code` to create/update a workflow from scratch.\n' +
				'2. Patch mode: pass `patches` (+ optional `workflowId`) to apply str_replace fixes. ' +
				'Patches apply to last submitted code, or auto-fetch from saved workflow if workflowId given.',
		)
		.input(buildWorkflowInputSchema)
		.output(
			z.object({
				success: z.boolean(),
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
				errors: z.array(z.string()).optional(),
				warnings: z.array(z.string()).optional(),
			}),
		)
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input, ctx: BuildCtx) => {
			const permKey = input.workflowId ? 'updateWorkflow' : 'createWorkflow';
			if (context.permissions?.[permKey] === 'blocked') {
				return { success: false, errors: ['Action blocked by admin'] };
			}

			if (
				input.workflowId &&
				!isApprovedBuildContext(context) &&
				context.permissions?.updateWorkflow !== 'always_allow'
			) {
				if (ctx.resumeData && !ctx.resumeData.approved) {
					return {
						success: false,
						denied: true,
						reason: 'User denied the action',
						errors: ['User denied the action'],
					};
				}
				if (!ctx.resumeData) {
					if (!ctx.suspend) {
						return { success: false, errors: ['Workflow edit approval is required.'] };
					}
					const workflowName = await resolveWorkflowName(context, input.workflowId);
					return await ctx.suspend({
						requestId: nanoid(),
						message: `Edit ${workflowName} (ID: ${input.workflowId})?`,
						severity: 'warning',
					});
				}
			}

			const { code, patches, workflowId, projectId, name, workItemId } = input;
			const isSupportingWorkflow = input.isSupportingWorkflow === true;
			const buildContext = context.workflowBuildContext;
			const isAuxiliarySupportingWorkflow =
				isSupportingWorkflow && buildContext?.isSupportingWorkflowTask !== true;
			const workItemKey = getBuildFailureTrackingKey({
				workItemId,
				workflowId,
				workflowName: name,
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
			let finalCode: string;

			if (patches) {
				// Patch mode: apply str_replace to existing code.
				// Cache-hit fast path uses a cheap head check (versionId only, no
				// nodes/connections payload) to confirm `lastCode` still matches the
				// server. On match we reuse the cached code; on drift we invalidate
				// and fall through to the snapshot fetch below, which returns body
				// + versionId in one round-trip.
				if (lastCode && lastCodeVersionId && workflowId) {
					try {
						const head = await context.workflowService.getWorkflowHead(workflowId);
						if (head.versionId !== lastCodeVersionId) {
							lastCode = null;
							lastCodeVersionId = null;
						}
					} catch {
						// Best-effort: a transient head-lookup failure shouldn't break
						// patch mode. If the cache is stale, patches will either fail to
						// apply cleanly or the next save will surface the conflict.
					}
				}

				let baseCode = lastCode;
				if (!baseCode && workflowId) {
					try {
						const snapshot = await context.workflowService.getWorkflowSnapshot(workflowId);
						baseCode = generateWorkflowCode(snapshot.json);
						lastCode = baseCode;
						lastCodeVersionId = snapshot.versionId;
					} catch {
						return {
							success: false,
							errors: [
								'Patch mode: no previous code and could not fetch workflow. Send full code instead.',
							],
						};
					}
				}
				if (!baseCode) {
					return {
						success: false,
						errors: [
							'Patch mode requires either a previous build-workflow call or a workflowId to fetch from.',
						],
					};
				}

				const patchResult = applyPatches(baseCode, patches);
				if (!patchResult.success) {
					return { success: false, errors: [patchResult.error] };
				}

				finalCode = patchResult.code;
			} else if (code) {
				finalCode = extractWorkflowCode(code);
			} else {
				return {
					success: false,
					errors: ['Either `code` (full code) or `patches` (to fix previous code) is required.'],
				};
			}

			// Remember for future patches
			lastCode = finalCode;

			// Parse TypeScript to WorkflowJSON with two-stage validation
			let result;
			try {
				result = parseAndValidate(finalCode, {
					nodeTypesProvider: context.nodeTypesProvider,
				});
			} catch (error) {
				return {
					success: false,
					errors: withEscalation(
						[error instanceof Error ? error.message : 'Failed to parse workflow code'],
						{
							includeSdkLanguageGuidance: true,
						},
					),
				};
			}

			// Partition validation results into blocking errors and informational warnings
			const { errors, informational } = partitionWarnings(result.warnings);

			if (errors.length > 0) {
				return {
					success: false,
					errors: withEscalation(
						errors.map((e) => `[${e.code}]${e.nodeName ? ` (${e.nodeName})` : ''}: ${e.message}`),
					),
					warnings:
						informational.length > 0
							? informational.map((w) => `[${w.code}]: ${w.message}`)
							: undefined,
				};
			}

			const json = result.workflow;
			if (name) {
				json.name = name;
			} else if (!json.name && !workflowId) {
				return {
					success: false,
					errors: [
						'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
					],
				};
			}

			// Resolve undefined/null credentials before saving.
			// newCredential() produces NewCredentialImpl which serializes to undefined.
			const credentialMap = await buildCredentialMap(context.credentialService);
			const mockResult = await resolveCredentials(json, workflowId, context, credentialMap);

			// Strip credential entries that are no longer valid for the current
			// parameters. Resolution above (and the LLM itself) can re-emit stale
			// references between turns; without this, setup analysis would surface
			// a credential request for a node that no longer needs one.
			await stripStaleCredentialsFromWorkflow(context, json);

			// Ensure webhook nodes have a webhookId so n8n registers clean paths
			await ensureWebhookIds(json, workflowId, context);

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
				const plannedTaskId =
					buildContext?.plannedTaskService && !isAuxiliarySupportingWorkflow
						? buildContext.taskId
						: undefined;
				const owner = plannedTaskId
					? { type: 'planned' as const, taskId: plannedTaskId }
					: { type: 'direct' as const };
				const resolvedWorkItemId =
					workItemId ??
					(isAuxiliarySupportingWorkflow ? undefined : buildContext?.workItemId) ??
					`wi_${nanoid(8)}`;
				const resolvedTaskId = isAuxiliarySupportingWorkflow
					? `${buildContext?.taskId ?? (context.runId ? `build-${context.runId}` : 'build')}:supporting-${nanoid(6)}`
					: (buildContext?.taskId ??
						(context.runId ? `build-${context.runId}` : `build-${nanoid(8)}`));

				const createSuccessResponse = async (savedId: string) => {
					const runId = buildContext?.runId ?? context.runId;
					const workflowName = json.name || 'workflow';
					const summary = `${workflowId ? 'Updated' : 'Created'} ${isSupportingWorkflow ? 'supporting ' : ''}workflow "${workflowName}" (${savedId}).`;
					const placeholderRemediation = hasPlaceholders
						? createRemediation({
								category: 'needs_setup',
								shouldEdit: false,
								reason: 'mocked_credentials_or_placeholders',
								guidance:
									'Workflow submitted successfully, but unresolved setup values remain. Stop code edits and route to workflows(action="setup").',
							})
						: undefined;
					const outcome = withDeterministicRouting({
						workItemId: resolvedWorkItemId,
						...(runId ? { runId } : {}),
						taskId: resolvedTaskId,
						owner,
						plannedTaskId,
						workflowId: savedId,
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

					await promoteMainWorkflow(context, savedId);
					await reportWorkflowBuildOutcome(context, outcome, {
						storeOnRunContext: !isAuxiliarySupportingWorkflow,
						markPlannedTaskSucceeded: !isAuxiliarySupportingWorkflow,
					});

					failureTracker.clear(workItemKey);

					return {
						success: true,
						workflowId: savedId,
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
						warnings:
							informational.length > 0
								? informational.map((w) => `[${w.code}]: ${w.message}`)
								: undefined,
					};
				};

				if (workflowId) {
					const updated = await context.workflowService.updateFromWorkflowJSON(
						workflowId,
						json,
						projectId ? { projectId } : undefined,
					);
					lastCodeVersionId = updated.versionId;
					return await createSuccessResponse(updated.id);
				} else {
					const created = await context.workflowService.createFromWorkflowJSON(json, {
						...(projectId ? { projectId } : {}),
						markAsAiTemporary: true,
					});
					(context.aiCreatedWorkflowIds ??= new Set<string>()).add(created.id);
					lastCodeVersionId = created.versionId;
					return await createSuccessResponse(created.id);
				}
			} catch (error) {
				return {
					success: false,
					errors: [
						`Workflow save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					],
				};
			}
		})
		.build();
}
