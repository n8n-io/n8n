import { Tool } from '@n8n/agents';
import {
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import { hasPlaceholderDeep } from '@n8n/utils/placeholder';
import {
	dropInvalidWorkflowJsonGroups,
	SDK_IMPORTABLE_FUNCTIONS,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';
import { makeGetNodeTypeForGrouping } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { computeChatModelValidationIssues } from './chat-model-validation';
import { planVerificationSimulation } from './plan-verification-simulation';
import { preserveExistingNodePositions } from './preserve-node-positions';
import {
	buildCredentialMap,
	buildCredentialResolutionNote,
	isN8nCreditsWalletDepleted,
	resolveCredentials,
} from './resolve-credentials';
import { resolvedCredentialSchema } from './resolved-credential.schema';
import { buildSetupItemsFromSetupRequests, isSetupPanelEnabled } from './setup-items';
import { getSkippedSetupSubjects, partitionSkippedSetupRequests } from './setup-skip-state';
import { analyzeWorkflow, stripStaleCredentialsFromWorkflow } from './setup-workflow.service';
import {
	combineWarnings,
	formatWarning,
	getBuildFailureTrackingKey,
	grantSessionWorkflowUpdate,
	isApprovedBuildContext,
	canSkipWorkflowUpdateHitl,
	markSourceBuildFailed,
	recordSessionOwnedWorkflow,
	resolveBuildIdentifiers,
	resolveWorkflowName,
	sourceResponseBase,
} from './workflow-build-context';
import {
	createCodeFixableRemediation,
	createSaveFailureRemediation,
	createSourceCompileRemediation,
	createWorkflowModifiedExternallyRemediation,
} from './workflow-build-remediation';
import {
	promoteMainWorkflow,
	reportFailedWorkflowBuildOutcome,
	reportWorkflowBuildOutcome,
} from './workflow-build-reporting';
import { withDeterministicRouting } from './workflow-build-routing';
import {
	trackWaitGateVerificationPlan,
	trackWorkflowSourceBuild,
} from './workflow-build-telemetry';
import {
	bindSourceFileToExistingWorkflow,
	getWorkflowSourceFileBinding,
	hashWorkflowSource,
	normalizeWorkflowSourceFilePath,
	readWorkflowSourceFile,
	saveWorkflowSourceFileBinding,
	type WorkflowSourceFileBinding,
} from './workflow-file-bindings';
import {
	ensureUniqueNodeIds,
	ensureWebhookIds,
	getReferencedWorkflowIds,
	hasLostAllSavedNodeIds,
	preserveExistingNodeIds,
	isTriggerNodeType,
	preserveExistingNodeGroupIds,
	preserveExistingSetupValues,
} from './workflow-json-utils';
import { computeChangedNodeNames, downgradeUnchangedNodeBlockers } from './workflow-node-diff';
import { compileWorkflowSource } from './workflow-source-compiler';
import {
	nodeGroupDroppedWarnings,
	partitionWarnings,
	type ValidationWarning,
} from './workflow-validation-warnings';
import { FolderResolutionError } from '../../errors/folder-resolution.error';
import { WorkflowSaveConflictError } from '../../errors/workflow-save-conflict.error';
import { INSTANCE_AI_SKILLS_DIR } from '../../skills/runtime-skills';
import { emitTraceOnlyChildRun } from '../../tracing/langsmith-tracing';
import type { InstanceAiContext, WorkflowFolderRef } from '../../types';
import { BuildFailureTracker } from '../../workflow-builder/build-failure-tracker';
import { createRemediation } from '../../workflow-loop/remediation';
import {
	remediationMetadataSchema,
	workflowVerificationReadinessSchema,
	type WorkflowBuildOutcome,
} from '../../workflow-loop/workflow-loop-state';
import { writeWorkspaceFile } from '../../workspace/workspace-files';
import { buildChatModelProviderMismatchWarnings } from '../nodes/preferred-chat-model';
import { COMPILED_WORKFLOW_TRACE_RUN_NAME } from '../tool-ids';

/** Over this serialized length only a `truncated` marker is emitted; the seed
 *  consumer falls back to source replay. */
const MAX_COMPILED_WORKFLOW_TRACE_CHARS = 1_000_000;

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	/** Resolved target workflow — used by the UI for per-workflow always-allow keys. */
	workflowId: z.string(),
});

const confirmationResumeSchema = instanceAiApprovalResumeSchema;

interface BuildCtx {
	toolCallId?: string;
	resumeData?: z.infer<typeof confirmationResumeSchema>;
	suspend?: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
	abortSignal?: AbortSignal;
}

/**
 * Structural (schema-level) filePath check. Absolute paths are accepted here
 * even though only paths under the workspace root are valid: the root is only
 * known at handler time, and a schema rejection surfaces as a hard
 * AI_InvalidToolInputError instead of a recoverable tool result. The handler
 * does the authoritative normalization against the workspace root.
 */
function isStructurallyValidWorkflowSourceFilePath(value: string): boolean {
	try {
		normalizeWorkflowSourceFilePath(value);
		return true;
	} catch {
		const trimmed = value.trim();
		return (
			trimmed.startsWith('/') &&
			trimmed.length > 1 &&
			!trimmed.includes('\\') &&
			!trimmed.includes('\0') &&
			!trimmed.split('/').some((segment) => segment === '..')
		);
	}
}

export const buildWorkflowInputSchema = z
	.object({
		filePath: z
			.string()
			.min(1)
			.refine(isStructurallyValidWorkflowSourceFilePath, {
				message:
					'Workflow source file path must stay within the workspace ' +
					'(no "..", "~", backslashes, or null bytes). ' +
					'Pass a workspace-relative path like src/workflows/my-workflow.workflow.ts.',
			})
			.describe(
				'Workspace-relative path to the TypeScript SDK workflow source file to build, e.g. src/workflows/my-workflow.workflow.ts.',
			),
		sourceCode: z
			.string()
			.optional()
			.describe(
				'Full source to write to filePath before building — use this instead of a separate workspace_write_file call when creating or fully rewriting the source. Omit to build the existing file content (preferred for targeted edits made with file tools, and required before `workflow-sdk validate`).',
			),
		workflowId: z
			.string()
			.optional()
			.describe(
				'Real n8n workflow id from a prior build-workflow or workflows() tool result, used to bind this file on the first update. ' +
					'Never pass the first argument of workflow(slug, name). Once bound, omit this on retries. ' +
					'Omit to create a new workflow. Missing and inaccessible ids look the same — confirm with workflows() before inventing one.',
			),
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
		preferNewCredentials: z
			.array(z.string())
			.optional()
			.describe(
				'Credential types (e.g. ["slackApi"]) to route to fresh credential creation — pass when the user ' +
					'explicitly asked ("create a new Slack credential") or needs to enter a replacement for a ' +
					'credential whose secret is invalid or rotated, never as a default. Those slots are ' +
					'left unresolved instead of being filled from an existing credential or Gateway credits, so ' +
					'credential setup can offer to create one. Pass the same list to workflows(action="setup").',
			),
		executionIntent: z
			.enum(['one-off', 'reusable'])
			.optional()
			.describe(
				'How the user intends to use this workflow. Pass `one-off` when the user wants a concrete ' +
					'effect once (an export, migration, backfill, or cleanup) and the workflow is only the ' +
					'vehicle — verification becomes an optional pre-flight and completion is a live run whose ' +
					'output was read back (see the one-off-operations skill). Omit or pass `reusable` for ' +
					'anything the user may run again.',
			),
	})
	.strict();

const FOLDER_PATH_PLACEMENT_DESCRIPTION =
	'Folder to create the NEW workflow in, named the way the user named it — "Clients/Acme", "Acme". ' +
	'Pass it whenever the workflow has a clear home: the user named a folder, or the related workflows you read live there. ' +
	'Resolved strictly (exact path, then folder name, then path suffix), never fuzzy: an unresolved folder fails the build before anything is saved and lists the real folders, so retry with one of those or ask the user. ' +
	'New workflows only — to move an existing workflow use `workspace(action="move-workflow-to-folder")`.';

/** Same contract plus a folder target; advertised only while folder exploration is on for the run. */
export const buildWorkflowInputSchemaWithFolderPlacement = buildWorkflowInputSchema
	.extend({
		folderPath: z.string().optional().describe(FOLDER_PATH_PLACEMENT_DESCRIPTION),
	})
	.strict();

function pickBuildWorkflowInputSchema(context: InstanceAiContext) {
	return context.folderExplorationEnabled === true
		? buildWorkflowInputSchemaWithFolderPlacement
		: buildWorkflowInputSchema;
}

/**
 * An unresolved folder must read as "nothing was created", before any other
 * note: a workflow quietly left at the root when the user named a folder is
 * the failure `folderPath` exists to remove.
 */
function formatFolderPlacementFailure(failure: {
	requested: string;
	reason: string;
	candidates: string[];
}): string {
	const candidates =
		failure.candidates.length > 0
			? ` Folders in this project: ${failure.candidates.map((path) => `"${path}"`).join(', ')}.`
			: '';
	const retry =
		' Re-run `build-workflow` with one of those paths as `folderPath`, or ask the user which folder they mean. Do NOT guess a folder from workflow names, and do NOT drop `folderPath` to save at the project root unless the user agrees.';
	switch (failure.reason) {
		case 'ambiguous':
			return `Folder "${failure.requested}" matches more than one folder, so the workflow was NOT created.${candidates}${retry}`;
		case 'unsupported':
			return `Folders are not available on this instance, so the workflow was NOT created in "${failure.requested}". Tell the user, and re-run without \`folderPath\` only if they agree to a root-level workflow.`;
		default:
			return `No folder matches "${failure.requested}", so the workflow was NOT created.${candidates}${retry}`;
	}
}

const triggerNodeOutputSchema = z.object({
	nodeName: z.string(),
	nodeType: z.string(),
});

// Reuse the workflow-loop schema — the tool output mirrors the persisted
// readiness verdict, and a second hand-maintained copy drifts.
const verificationReadinessOutputSchema = workflowVerificationReadinessSchema;

const setupRequirementOutputSchema = z.discriminatedUnion('status', [
	z.object({
		status: z.literal('not_required'),
		reason: z.literal('skipped-by-user').optional(),
		guidance: z.string().optional(),
	}),
	z.object({
		status: z.literal('required'),
		reason: z.enum(['mocked-credentials', 'unresolved-placeholders', 'workflow-needs-setup']),
		guidance: z.string(),
	}),
]);

/** User-facing @n8n/workflow-sdk factories; used to auto-recover missing-import compile failures. */
const SDK_IMPORTABLE_SYMBOLS = new Set<string>(SDK_IMPORTABLE_FUNCTIONS);

const SDK_IMPORT_REGEX = /import\s*\{([^}]*)\}\s*from\s*['"]@n8n\/workflow-sdk['"]/;

/** Adds missing known SDK symbols to the import for "X is not defined" errors; undefined when not applicable. */
export function autoImportMissingSdkSymbols(
	source: string,
	errors: string[],
): { source: string; symbols: string[] } | undefined {
	const missing = new Set<string>();
	for (const error of errors) {
		for (const match of error.matchAll(/\b([A-Za-z_$][\w$]*) is not defined\b/g)) {
			if (SDK_IMPORTABLE_SYMBOLS.has(match[1])) missing.add(match[1]);
		}
	}
	if (missing.size === 0) return undefined;

	const symbols = Array.from(missing);
	const existing = SDK_IMPORT_REGEX.exec(source);
	if (existing) {
		const names = new Set(
			existing[1]
				.split(',')
				.map((name) => name.trim())
				.filter(Boolean),
		);
		for (const symbol of symbols) names.add(symbol);
		return {
			source: source.replace(
				SDK_IMPORT_REGEX,
				`import {\n  ${Array.from(names).join(',\n  ')},\n} from '@n8n/workflow-sdk'`,
			),
			symbols,
		};
	}
	return {
		source: `import { ${symbols.join(', ')} } from '@n8n/workflow-sdk';\n\n${source}`,
		symbols,
	};
}

const POST_BUILD_FLOW_SKILL_ID = 'post-build-flow';
const ONE_OFF_OPERATIONS_SKILL_ID = 'one-off-operations';

const ONE_OFF_OPERATIONS_GUIDANCE =
	'This one-off build is not complete yet. Follow the one-off instructions in `instructions` now (do NOT load the one-off-operations skill — they are the same instructions). Simulated verification is NOT required and NOT the completion criterion: route setup if needed, then run the workflow live with the user’s approval, read back the actual node output, and report only what you read. Offer to keep or delete the workflow when the operation is done.';

const POST_BUILD_FLOW_GUIDANCE =
	'This direct build is not complete yet. Follow the post-build instructions in `instructions` now (do NOT load the post-build-flow skill — they are the same instructions) before verification, setup, error-workflow follow-up, publishing, testing, or any final user-visible summary. Follow-up order is verification/setup first, then mocked/no-mock live-test when latest verification used mocks or simulations, then generic testing prompts. Until a non-simulated execution succeeds, never offer publishing as an alternative to the live test. A user-run execution counts only after `executions(action="list")` and `executions(action="get")` confirm that it succeeded and ran the required path; the user\'s statement alone is not execution evidence. Honor an explicit publish request before live execution only after warning that the live path remains untested. Offer the explicit error-workflow opt-in for direct new primary workflows only after the primary workflow is successfully published. Do not replace the error-workflow opt-in with a generic add-anything, publish, or test question.';

// Inlined into successful build results; the skills stay registered for tag-driven follow-up turns.
const inlineSkillInstructionsCache = new Map<string, string>();

/** Tag-turn-only sections, stripped from the inline copy; follow-up turns load the full skill. */
const INLINE_SKIPPED_SECTIONS = [
	'## Verification follow-up',
	'## Setup follow-up',
	'## Credentials before build',
];

function getInlineSkillInstructions(skillId: string): string {
	let instructions = inlineSkillInstructionsCache.get(skillId);
	if (instructions === undefined) {
		const raw = readFileSync(join(INSTANCE_AI_SKILLS_DIR, skillId, 'SKILL.md'), 'utf-8');
		// Strip the YAML front-matter; catalog metadata is noise in a tool result.
		const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
		instructions = body
			.split(/\n(?=## )/)
			.filter((section) => !INLINE_SKIPPED_SECTIONS.some((title) => section.startsWith(title)))
			.join('\n')
			.trim();
		inlineSkillInstructionsCache.set(skillId, instructions);
	}
	return instructions;
}

// Discriminated on skillId so a mismatched skillId/reason pair cannot validate.
const postBuildFlowOutputSchema = z.discriminatedUnion('skillId', [
	z.object({
		required: z.literal(true),
		skillId: z.literal(POST_BUILD_FLOW_SKILL_ID),
		reason: z.literal('direct-build-succeeded'),
		guidance: z.string(),
		/** Full post-build instructions (the selected skill body), inlined. */
		instructions: z.string(),
	}),
	z.object({
		required: z.literal(true),
		skillId: z.literal(ONE_OFF_OPERATIONS_SKILL_ID),
		reason: z.literal('direct-one-off-build-succeeded'),
		guidance: z.string(),
		instructions: z.string(),
	}),
]);

function directPostBuildFlowHandoff(
	owner: ReturnType<typeof resolveBuildIdentifiers>['owner'],
	isAuxiliarySupportingWorkflow: boolean,
	outcome: WorkflowBuildOutcome,
): z.infer<typeof postBuildFlowOutputSchema> | undefined {
	if (owner?.type !== 'direct' || isAuxiliarySupportingWorkflow) return undefined;

	// One-off instructions only apply when the workflow can actually run — their
	// completion criterion is a live run. A triggerless or otherwise unrunnable
	// build falls back to the standard post-build flow, which handles
	// not_verifiable outcomes.
	if (outcome.executionIntent === 'one-off' && outcome.verificationReadiness?.status === 'ready') {
		return {
			required: true,
			skillId: ONE_OFF_OPERATIONS_SKILL_ID,
			reason: 'direct-one-off-build-succeeded',
			guidance: ONE_OFF_OPERATIONS_GUIDANCE,
			instructions: getInlineSkillInstructions(ONE_OFF_OPERATIONS_SKILL_ID),
		};
	}

	return {
		required: true,
		skillId: POST_BUILD_FLOW_SKILL_ID,
		reason: 'direct-build-succeeded',
		guidance: POST_BUILD_FLOW_GUIDANCE,
		instructions: getInlineSkillInstructions(POST_BUILD_FLOW_SKILL_ID),
	};
}

interface ValidationFailureArgs {
	context: InstanceAiContext;
	blocking: ValidationWarning[];
	informational: ValidationWarning[];
	reason: string;
	guidance: string;
	summary: string;
	binding: WorkflowSourceFileBinding;
	sourceHash: string;
	targetWorkflowId?: string;
	filePath: string;
	resolvedWorkItemId: string;
	resolvedTaskId: string;
	plannedTaskId?: string;
	owner: WorkflowBuildOutcome['owner'];
	isSupportingWorkflow?: boolean;
	isAuxiliarySupportingWorkflow?: boolean;
	withEscalation: (errors: string[]) => string[];
}

async function handleValidationFailure(args: ValidationFailureArgs) {
	const {
		context,
		blocking,
		informational,
		reason,
		guidance,
		summary,
		binding: initialBinding,
		sourceHash,
		targetWorkflowId,
		filePath,
		resolvedWorkItemId,
		resolvedTaskId,
		plannedTaskId,
		owner,
		isSupportingWorkflow = false,
		isAuxiliarySupportingWorkflow = false,
		withEscalation,
	} = args;

	const formattedErrors = withEscalation(
		blocking.map((e) => `[${e.code}]${e.nodeName ? ` (${e.nodeName})` : ''}: ${e.message}`),
	);
	const remediation = createCodeFixableRemediation({ reason, guidance });
	const binding = await markSourceBuildFailed(context, initialBinding, sourceHash);
	await reportFailedWorkflowBuildOutcome(context, {
		targetWorkflowId,
		sourceFilePath: filePath,
		workItemId: resolvedWorkItemId,
		taskId: resolvedTaskId,
		plannedTaskId,
		owner,
		remediation,
		errors: formattedErrors,
		summary,
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
		success: false as const,
		...sourceResponseBase(binding),
		workflowId: targetWorkflowId,
		workItemId: resolvedWorkItemId,
		errors: formattedErrors,
		remediation,
		warnings: combineWarnings(informational.map((w) => formatWarning(w.code, w.message))),
	};
}

const buildWorkflowOutputSchema = z.object({
	success: z.boolean(),
	filePath: z.string(),
	sourceHash: z.string().optional(),
	workflowId: z.string().optional(),
	workflowName: z.string().optional(),
	workItemId: z.string().optional(),
	triggerNodes: z.array(triggerNodeOutputSchema).optional(),
	verificationReadiness: verificationReadinessOutputSchema.optional(),
	/** Effective intent after merging with the prior outcome for this work
	 *  item — a repair rebuild that omits the input keeps the stored value. */
	executionIntent: z.enum(['one-off', 'reusable']).optional(),
	setupRequirement: setupRequirementOutputSchema.optional(),
	postBuildFlow: postBuildFlowOutputSchema.optional(),
	isSupportingWorkflow: z.boolean().optional(),
	mockedNodeNames: z.array(z.string()).optional(),
	mockedCredentialTypes: z.array(z.string()).optional(),
	mockedCredentialsByNode: z.record(z.array(z.string())).optional(),
	resolvedCredentialsByNode: z.record(z.array(resolvedCredentialSchema)).optional(),
	credentialResolutionNote: z.string().optional(),
	referencedWorkflowIds: z.array(z.string()).optional(),
	hasUnresolvedPlaceholders: z.boolean().optional(),
	denied: z.boolean().optional(),
	reason: z.string().optional(),
	remediation: remediationMetadataSchema.optional(),
	errors: z.array(z.string()).optional(),
	warnings: z.array(z.string()).optional(),
});

/** The output mirrors the input gate: `folder` is advertised only while folder exploration is on. */
function pickBuildWorkflowOutputSchema(context: InstanceAiContext) {
	return context.folderExplorationEnabled === true
		? buildWorkflowOutputSchema.extend({
				/** Folder the workflow was created in, when a `folderPath` was given. */
				folder: z.object({ id: z.string(), name: z.string(), path: z.string() }).optional(),
			})
		: buildWorkflowOutputSchema;
}

export function createBuildWorkflowTool(context: InstanceAiContext) {
	const failureTracker = new BuildFailureTracker();

	return new Tool('build-workflow')
		.description(
			'Build and save a workflow from workflow source. ' +
				'Load `workflow-builder` via `load_skill` before calling this tool. ' +
				'When the workflow creates or writes Data Tables, also load `data-table-manager` first. ' +
				'Use TypeScript SDK .workflow.ts source for new and existing workflows. ' +
				'Prefer writing the file with `workspace_write_file` / `workspace_str_replace_file` so `workflow-sdk validate` can run on it, then call this tool with filePath. ' +
				'For a one-shot create/rewrite you may pass `sourceCode` instead (the tool writes filePath and builds).',
		)
		.input(pickBuildWorkflowInputSchema(context))
		.output(pickBuildWorkflowOutputSchema(context))
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input, ctx: BuildCtx) => {
			let filePath: string;
			try {
				// Accepts absolute paths under the workspace root (models often echo
				// them from prompts/shell output) and converts them to relative.
				filePath = normalizeWorkflowSourceFilePath(input.filePath, {
					workspaceRoot: context.workspaceRoot,
				});
			} catch (error) {
				const guidance =
					'Call build-workflow again with a workspace-relative filePath like src/workflows/my-workflow.workflow.ts.';
				return {
					success: false,
					filePath: input.filePath,
					errors: [error instanceof Error ? error.message : String(error)],
					remediation: createRemediation({
						category: 'code_fixable',
						shouldEdit: false,
						reason: 'invalid_file_path',
						guidance,
					}),
				};
			}
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
				try {
					binding = await bindSourceFileToExistingWorkflow(context, binding, input.workflowId);
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					// File is not bound yet, so not-found maps to workflow_id_not_found (not bound_*).
					const remediation = createSaveFailureRemediation(error, false);

					trackWorkflowSourceBuild(context, {
						result: 'blocked',
						stage: 'save',
						binding,
						targetWorkflowId: input.workflowId,
						remediation,
						errorCount: 1,
					});

					return {
						success: false,
						...sourceResponseBase(binding),
						errors: [`Failed to bind source file to workflow ${input.workflowId}: ${message}`],
						remediation,
					};
				}
			}

			const targetWorkflowId = binding.workflowId;
			// Only the folder-enabled schema carries the field; the narrowing keeps the
			// handler valid for both shapes without a cast.
			const folderPath =
				'folderPath' in input && typeof input.folderPath === 'string'
					? input.folderPath
					: undefined;
			if (folderPath !== undefined && targetWorkflowId) {
				// Placement is a create-time decision. Moving on update would silently
				// relocate a workflow the user did not ask to move.
				const remediation = createRemediation({
					category: 'blocked',
					shouldEdit: false,
					reason: 'folder_placement_on_update',
					guidance:
						'`folderPath` only applies when creating a new workflow. Nothing was saved. Re-run without `folderPath` to update the workflow, and move it with `workspace(action="move-workflow-to-folder")` if the user asked for that.',
				});
				trackWorkflowSourceBuild(context, {
					result: 'blocked',
					stage: 'folder',
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
					errors: [remediation.guidance],
					remediation,
				};
			}
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

			const canSkipUpdateHitl =
				targetWorkflowId !== undefined && canSkipWorkflowUpdateHitl(context, targetWorkflowId);

			if (
				targetWorkflowId &&
				!canSkipUpdateHitl &&
				!isApprovedBuildContext(context) &&
				context.permissions?.updateWorkflow !== 'always_allow'
			) {
				if (ctx.resumeData && !ctx.resumeData.approved) {
					const remediation = createRemediation({
						category: 'blocked',
						shouldEdit: false,
						reason: 'user_denied',
						guidance:
							'The user declined the save approval card — nothing was saved. Do not re-issue ' +
							'the same save unprompted: acknowledge the denial, tell the user what remains ' +
							'unsaved, and ask how they want to proceed.',
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
						workflowId: targetWorkflowId,
					});
				}
				// "Always allow" — persist so later edits of this workflow skip HITL.
				if (ctx.resumeData.approved && ctx.resumeData.scope === 'session') {
					await grantSessionWorkflowUpdate(context, targetWorkflowId);
				}
			}

			// Persist inline source first so the workspace file stays canonical for later repairs.
			if (input.sourceCode !== undefined && context.workspace) {
				try {
					await writeWorkspaceFile(context.workspace, filePath, input.sourceCode, {
						logger: context.logger,
						resourceLabel: 'Workflow source file',
						abortSignal: ctx.abortSignal,
					});
				} catch (error) {
					const remediation = createCodeFixableRemediation({
						reason: 'workflow_source_write_failed',
						guidance:
							'The inline sourceCode could not be written to filePath. Write the file with workspace file tools, then call build-workflow again with the same filePath.',
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
			}

			let sourceCode: string;
			let sourceHash: string;
			try {
				({ source: sourceCode, sourceHash } = await readWorkflowSourceFile(
					context,
					filePath,
					ctx.abortSignal,
				));
			} catch (error) {
				const remediation = createCodeFixableRemediation({
					reason: 'workflow_source_read_failed',
					guidance:
						'The workflow source file could not be read. Write it with `workspace_write_file`, then call build-workflow again with the same filePath.',
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

			const { name } = input;
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
			// One-off intent is sticky per work item: a repair rebuild that omits the
			// flag must not silently flip the stored outcome back to the verify-first
			// flow (which would re-arm verification follow-ups mid-repair).
			let executionIntent = input.executionIntent;
			if (executionIntent === undefined) {
				try {
					executionIntent = (
						await buildContext?.workflowTaskService?.getBuildOutcome(resolvedWorkItemId)
					)?.executionIntent;
				} catch {
					// Best-effort: no prior outcome just means the default flow.
				}
			}
			const withEscalation = (
				errors: string[],
				options: { includeSdkLanguageGuidance?: boolean } = {},
			): string[] => {
				const escalation = failureTracker.record(workItemKey, errors, options);
				return escalation ? [...errors, escalation] : errors;
			};

			let informational: ValidationWarning[] = [];

			let compiled = await compileWorkflowSource(context, filePath, sourceCode, ctx.abortSignal);
			if (
				!compiled.success &&
				compiled.reason === 'workflow_source_build_failed' &&
				context.workspace
			) {
				// Recover missing-import errors server-side; persist so later edits see the fix.
				const recovery = autoImportMissingSdkSymbols(sourceCode, compiled.errors);
				if (recovery) {
					try {
						await writeWorkspaceFile(context.workspace, filePath, recovery.source, {
							logger: context.logger,
							resourceLabel: 'Workflow source file',
							abortSignal: ctx.abortSignal,
						});
						const retried = await compileWorkflowSource(
							context,
							filePath,
							recovery.source,
							ctx.abortSignal,
						);
						// The corrected source is on disk; keep reported errors/hash in sync with it.
						sourceCode = recovery.source;
						sourceHash = hashWorkflowSource(recovery.source);
						compiled = retried.success
							? {
									...retried,
									warnings: [
										...retried.warnings,
										{
											code: 'auto_imported_sdk_symbols',
											message: `Auto-added missing @n8n/workflow-sdk import(s): ${recovery.symbols.join(', ')}. Include them in future source.`,
											severity: 'informational',
										},
									],
								}
							: retried;
					} catch (error) {
						context.logger.debug('Auto-import recovery failed; returning original errors', {
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}
			}
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

			// Snapshot of the previously saved workflow, used to tell nodes this
			// build actually touched apart from pre-existing ones it round-tripped.
			let savedWorkflowSnapshot: WorkflowJSON | undefined;
			if (targetWorkflowId) {
				try {
					savedWorkflowSnapshot = await context.workflowService.getAsWorkflowJSON(targetWorkflowId);
				} catch {
					// Prior state unreadable — treat every node as changed (unscoped).
				}
			}

			const partitionedWarnings = partitionWarnings(
				downgradeUnchangedNodeBlockers(compiled.warnings, compiled.workflow, savedWorkflowSnapshot),
			);
			informational = partitionedWarnings.informational;

			if (partitionedWarnings.blocking.length > 0) {
				return await handleValidationFailure({
					context,
					blocking: partitionedWarnings.blocking,
					informational,
					reason: 'workflow_source_validation_failed',
					guidance:
						'Edit the workspace source file using the validation diagnostics, then call build-workflow again with the same filePath.',
					summary: 'Workflow source failed validation.',
					binding,
					sourceHash,
					targetWorkflowId,
					filePath,
					resolvedWorkItemId,
					resolvedTaskId,
					plannedTaskId,
					owner,
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					withEscalation,
				});
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
			const mockResult = await resolveCredentials(
				json,
				targetWorkflowId,
				context,
				credentialMap,
				input.preferNewCredentials,
			);

			// Deterministic backstop for a builder that never checked credentials:
			// a chat-model node for a provider the user has no credential for gets
			// flagged with the LLM credentials they do have. Nodes the resolver
			// covered with n8n credits are exempt — they run as built.
			const chatModelBlocking: ValidationWarning[] = [];
			for (const message of buildChatModelProviderMismatchWarnings(
				(json.nodes ?? []).filter((node) => !node.disabled),
				[...credentialMap.values()].flat(),
				mockResult.resolvedCredentialsByNode,
			)) {
				informational.push({
					code: 'chat_model_provider_mismatch',
					message,
					severity: 'informational',
				});
			}

			for (const node of json.nodes ?? []) {
				if (!node.name || node.disabled) continue;
				const chatModelIssues = await computeChatModelValidationIssues(context, node);
				for (const messages of Object.values(chatModelIssues)) {
					for (const message of messages) {
						chatModelBlocking.push({
							code: 'chat_model_validation',
							message: `${node.name}: ${message}`,
							nodeName: node.name,
							severity: 'error',
						});
					}
				}
			}

			const partitionedChatModelWarnings = partitionWarnings(
				downgradeUnchangedNodeBlockers(chatModelBlocking, json, savedWorkflowSnapshot),
			);
			informational.push(...partitionedChatModelWarnings.informational);

			if (partitionedChatModelWarnings.blocking.length > 0) {
				return await handleValidationFailure({
					context,
					blocking: partitionedChatModelWarnings.blocking,
					informational,
					reason: 'chat_model_validation_failed',
					guidance:
						'Fix the chat-model configuration using nodes(action="explore-resources") to pick a model the connected credential supports, then call build-workflow again.',
					summary: 'Workflow uses a chat model or parameter the connected credential cannot run.',
					binding,
					sourceHash,
					targetWorkflowId,
					filePath,
					resolvedWorkItemId,
					resolvedTaskId,
					plannedTaskId,
					owner,
					isSupportingWorkflow,
					isAuxiliarySupportingWorkflow,
					withEscalation,
				});
			}

			await stripStaleCredentialsFromWorkflow(context, json);

			try {
				let droppedGroupCount = 0;
				// Runs first: the passes below key off node ids, so they must be unique.
				ensureUniqueNodeIds(json);
				// Recovers the saved id of a surviving node whose source declared none — layered
				// under the declared id, so a rename still follows the id.
				await preserveExistingNodeIds(json, targetWorkflowId, context);
				await preserveExistingSetupValues(json, targetWorkflowId, context);
				await ensureWebhookIds(json, targetWorkflowId, context);
				await preserveExistingNodeGroupIds(json, targetWorkflowId, context);
				await preserveExistingNodePositions(json, targetWorkflowId, context);
				const groupCountBeforeDrop = json.nodeGroups?.length ?? 0;
				const droppedGroupWarnings = nodeGroupDroppedWarnings(
					dropInvalidWorkflowJsonGroups(
						json,
						context.nodeTypesProvider
							? makeGetNodeTypeForGrouping(context.nodeTypesProvider)
							: null,
					),
				);
				droppedGroupCount = groupCountBeforeDrop - (json.nodeGroups?.length ?? 0);
				informational.push(...droppedGroupWarnings);

				if (await hasLostAllSavedNodeIds(json, targetWorkflowId, context)) {
					context.logger.debug('Build kept none of the saved node ids', {
						workflowId: targetWorkflowId,
					});
					informational.push({
						code: 'node_ids_not_preserved',
						message:
							"None of this workflow's saved node IDs were kept, so every node is recorded as " +
							"deleted and re-added. Keep each node's `id` from get-as-code verbatim when " +
							'editing, and omit `id` only for nodes you add.',
						severity: 'informational',
					});
				}

				const hasMockedCredentialNodes = mockResult.mockedNodeNames.length > 0;
				const hasResolvedCredentials = Object.keys(mockResult.resolvedCredentialsByNode).length > 0;
				// Reported by the resolver rather than inferred from the mocked types, so a
				// slot the source omitted entirely — held by the required-type pass, which
				// mocks nothing — still carries the request into the setup call.
				const heldForNewCredentialTypes = mockResult.heldForNewCredentialTypes;
				const referencedWorkflowIds = getReferencedWorkflowIds(json);
				const triggerNodes = (json.nodes ?? [])
					.filter((n) => isTriggerNodeType(n.type))
					.map((n) => ({ nodeName: n.name, nodeType: n.type }))
					.filter(
						(t): t is { nodeName: string; nodeType: string } =>
							Boolean(t.nodeName) && Boolean(t.nodeType),
					);
				// Setup routing is scoped to nodes this build actually changed:
				// pre-existing nodes the build merely round-tripped must not route
				// the user into setup for an unrelated edit. Undefined = unscoped
				// (new workflow, or prior state unreadable).
				const changedNodeNames = savedWorkflowSnapshot
					? computeChangedNodeNames(json, savedWorkflowSnapshot)
					: undefined;
				const isInSetupScope = (nodeName: string | undefined) =>
					changedNodeNames === undefined ||
					(nodeName !== undefined && changedNodeNames.includes(nodeName));
				const hasPlaceholders = (json.nodes ?? []).some(
					(n) => isInSetupScope(n.name) && hasPlaceholderDeep(n.parameters),
				);
				const createSuccessResponse = async (
					saved: { id: string; versionId: string; checksum?: string; folder?: WorkflowFolderRef },
					operation: 'create' | 'update',
				) => {
					// The setup panel lists bound slots too (rendered as done), so its
					// snapshot needs the settled requests the routing below must not see.
					const setupItemsEmitter = isSetupPanelEnabled(context)
						? context.setupItemsEmitter
						: undefined;
					const analyzedRequests = await analyzeWorkflow(context, saved.id, undefined, {
						...(input.preferNewCredentials
							? { preferNewCredentialTypes: input.preferNewCredentials }
							: {}),
						...(setupItemsEmitter ? { includeSettled: true } : {}),
					});
					const setupRequests = analyzedRequests.filter((request) => !!request.needsAction);
					if (setupItemsEmitter) {
						// Every saved iteration re-announces the checklist; the emitter
						// drops unchanged snapshots. Best-effort: never fail a build over it.
						try {
							setupItemsEmitter.emit(
								saved.id,
								buildSetupItemsFromSetupRequests(saved.id, analyzedRequests),
							);
						} catch (error) {
							context.logger.warn('Failed to emit setup-items snapshot for built workflow', {
								workflowId: saved.id,
								error: error instanceof Error ? error.message : String(error),
							});
						}
					}
					// Two independent filters over the same list: `isInSetupScope` drops nodes this
					// build never touched, the skip partition drops cards the user declined. A node
					// only re-arms the setup follow-up when it survives both.
					const { pending: pendingSetupRequests, skippedByUser: skippedSetupRequests } =
						partitionSkippedSetupRequests(
							setupRequests,
							saved.id,
							getSkippedSetupSubjects(context),
						);
					const needsSetupInScope = (request: (typeof setupRequests)[number]) =>
						request.needsAction === true && isInSetupScope(request.node.name);
					const workflowNeedsSetup = pendingSetupRequests.some(needsSetupInScope);
					// Only the user's skip explains the silence — an out-of-scope node is not
					// something they declined, and has its own reporting on the setup path.
					const onlySkippedSetupRemains =
						!workflowNeedsSetup && skippedSetupRequests.some(needsSetupInScope);
					const { nodeSimulationPlan, simulationFixtures, waitGateScripts } =
						await planVerificationSimulation({
							workflow: json,
							mockedNodeNames: mockResult.mockedNodeNames,
							declaredOutputFixtures: compiled.declaredOutputFixtures,
							workflowId: saved.id,
							outputSchemaLookup: context.outputSchemaLookup,
							fallbackModelConfig: context.modelId,
							logger: context.logger,
						});
					trackWaitGateVerificationPlan(context, {
						haltedGateCount: (nodeSimulationPlan ?? []).filter((verdict) => verdict.haltBranch)
							.length,
						scriptedGateCount: waitGateScripts?.length ?? 0,
						savedWorkflowId: saved.id,
					});
					const runId = buildContext?.runId ?? context.runId;
					const workflowName = json.name || 'workflow';
					const summary = `${operation === 'update' ? 'Updated' : 'Created'} ${isSupportingWorkflow ? 'supporting ' : ''}workflow "${workflowName}" (${saved.id}).`;
					binding = await saveWorkflowSourceFileBinding(context, {
						...binding,
						workflowId: saved.id,
						workflowVersionId: saved.versionId,
						...(saved.checksum ? { workflowChecksum: saved.checksum } : {}),
						sourceHash,
					});
					// Trace-only compiled-JSON event for eval seed reconstruction — never part
					// of the tool result, so it never enters the agent's context.
					try {
						const payload = { workflowId: saved.id, sourceHash, workflow: json };
						const withinSizeGate =
							JSON.stringify(payload).length <= MAX_COMPILED_WORKFLOW_TRACE_CHARS;
						const emittedVia = await emitTraceOnlyChildRun(
							context.tracing,
							{
								name: COMPILED_WORKFLOW_TRACE_RUN_NAME,
								// 'chain' like other bookkeeping spans (HITL) — a tool-typed run
								// reads as a real agent tool call in trace UIs.
								runType: 'chain',
								canonicalName: `instance-ai.${COMPILED_WORKFLOW_TRACE_RUN_NAME}`,
								tags: [COMPILED_WORKFLOW_TRACE_RUN_NAME],
								metadata: { workflow_id: saved.id, source_hash: sourceHash },
							},
							withinSizeGate
								? { outputs: payload, rawOutputs: true }
								: { outputs: { workflowId: saved.id, sourceHash, truncated: true } },
						);
						context.logger.debug(
							`[build-workflow] compiled-workflow trace event: ${emittedVia}${withinSizeGate ? '' : ' (payload over size gate, emitted truncated marker)'}`,
						);
					} catch (error) {
						// Best-effort: tracing must never break a build.
						context.logger.debug(
							`[build-workflow] compiled-workflow trace event failed: ${error instanceof Error ? error.message : String(error)}`,
						);
					}
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
						needsUserInput: false,
						mockedNodeNames: hasMockedCredentialNodes ? mockResult.mockedNodeNames : undefined,
						mockedCredentialTypes: hasMockedCredentialNodes
							? mockResult.mockedCredentialTypes
							: undefined,
						mockedCredentialsByNode: hasMockedCredentialNodes
							? mockResult.mockedCredentialsByNode
							: undefined,
						resolvedCredentialsByNode: hasResolvedCredentials
							? mockResult.resolvedCredentialsByNode
							: undefined,
						workflowNeedsSetup,
						onlySkippedSetupRemains,
						nodeSimulationPlan,
						simulationFixtures,
						waitGateScripts,
						supportingWorkflowIds:
							referencedWorkflowIds.length > 0 ? referencedWorkflowIds : undefined,
						hasUnresolvedPlaceholders: hasPlaceholders || undefined,
						changedNodeNames,
						executionIntent,
						summary,
					});
					const postBuildFlow = directPostBuildFlowHandoff(
						owner,
						isAuxiliarySupportingWorkflow,
						outcome,
					);

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
						warningCount: informational.length,
						droppedGroupCount,
					});

					return {
						success: true,
						...sourceResponseBase(binding),
						workflowId: saved.id,
						workflowName: json.name || undefined,
						workItemId: resolvedWorkItemId,
						...(saved.folder ? { folder: saved.folder } : {}),
						isSupportingWorkflow: isSupportingWorkflow || undefined,
						triggerNodes,
						verificationReadiness: outcome.verificationReadiness,
						executionIntent: outcome.executionIntent,
						setupRequirement: outcome.setupRequirement,
						...(postBuildFlow ? { postBuildFlow } : {}),
						mockedNodeNames: hasMockedCredentialNodes ? mockResult.mockedNodeNames : undefined,
						mockedCredentialTypes: hasMockedCredentialNodes
							? mockResult.mockedCredentialTypes
							: undefined,
						mockedCredentialsByNode: hasMockedCredentialNodes
							? mockResult.mockedCredentialsByNode
							: undefined,
						resolvedCredentialsByNode: hasResolvedCredentials
							? mockResult.resolvedCredentialsByNode
							: undefined,
						credentialResolutionNote:
							hasResolvedCredentials || heldForNewCredentialTypes.length > 0
								? buildCredentialResolutionNote(
										mockResult.resolvedCredentialsByNode,
										heldForNewCredentialTypes,
										{
											n8nCreditsDepleted: await isN8nCreditsWalletDepleted(
												context,
												mockResult.resolvedCredentialsByNode,
											),
										},
									)
								: undefined,
						referencedWorkflowIds:
							referencedWorkflowIds.length > 0 ? referencedWorkflowIds : undefined,
						hasUnresolvedPlaceholders: hasPlaceholders || undefined,
						warnings: combineWarnings(informational.map((w) => formatWarning(w.code, w.message))),
					};
				};

				if (targetWorkflowId) {
					const updateOptions = binding.workflowChecksum
						? { expectedChecksum: binding.workflowChecksum }
						: undefined;
					const updated = await context.workflowService.updateFromWorkflowJSON(
						targetWorkflowId,
						json,
						updateOptions,
					);
					return await createSuccessResponse(updated, 'update');
				}

				const created = await context.workflowService.createFromWorkflowJSON(json, {
					markAsAiTemporary: true,
					...(folderPath !== undefined ? { folderPath } : {}),
				});
				await recordSessionOwnedWorkflow(context, created.id);
				return await createSuccessResponse(created, 'create');
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';

				if (error instanceof FolderResolutionError) {
					// Nothing was written. The source is fine, so the binding is left as is:
					// the fix is a corrected `folderPath` or a question to the user, not an edit.
					const failureText = formatFolderPlacementFailure(error.folderResolution);
					const remediation = createRemediation({
						category: 'blocked',
						shouldEdit: false,
						reason: `folder_${error.folderResolution.reason.replace(/-/g, '_')}`,
						guidance: failureText,
					});
					trackWorkflowSourceBuild(context, {
						result: 'failure',
						stage: 'folder',
						binding,
						targetWorkflowId,
						saveOperation: 'create',
						isSupportingWorkflow,
						isAuxiliarySupportingWorkflow,
						remediation,
						errorCount: 1,
					});
					return {
						success: false,
						...sourceResponseBase(binding),
						workflowName: json.name || undefined,
						workItemId: resolvedWorkItemId,
						errors: [failureText],
						remediation,
					};
				}

				if (error instanceof WorkflowSaveConflictError) {
					const remediation = createWorkflowModifiedExternallyRemediation();
					binding = await markSourceBuildFailed(context, binding, sourceHash);
					await reportFailedWorkflowBuildOutcome(context, {
						targetWorkflowId,
						sourceFilePath: filePath,
						workItemId: resolvedWorkItemId,
						taskId: resolvedTaskId,
						plannedTaskId,
						owner,
						remediation,
						errors: [message],
						summary: 'Workflow save conflict — the workflow changed outside this conversation.',
						storeOnRunContext: !isAuxiliarySupportingWorkflow,
					});
					trackWorkflowSourceBuild(context, {
						result: 'failure',
						stage: 'conflict',
						binding,
						targetWorkflowId,
						saveOperation: 'update',
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
						errors: [message],
						remediation,
					};
				}

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
