import { instanceAiApprovalResumeSchema } from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import { ThreadSessionStore } from './compiler-session-store';
import {
	clarificationQuestionsSchema,
	decisionDiagnosticsShape,
	issueSchema,
	optional,
	optionalString,
	registryFor,
	selectDecisionService,
	slug,
	verificationLevelSchema,
} from './compiler-tool-support';
import { confirmationSuspendSchema, createBuildWorkflowTool } from './build-workflow.tool';
import { saveWorkflowSourceFileBinding } from './workflow-file-bindings';
import type { ExecutionDebugInfo, InstanceAiContext } from '../../types';
import { WorkflowCompilerService, type CompilerResult } from '../../workflow-compiler';
import { approvalSummarySchema } from '../approval-copy';

export { selectDecisionService };

/**
 * `build-workflow`: the decision-assisted workflow compiler. The orchestrator
 * hands it the user's request (create), the target workflow and change (edit),
 * or the failing execution (debug). Bounded decisions choose what to build,
 * deterministic code builds and validates it, and the persistence step saves
 * it with the same credential, approval and setup flow as before.
 */

const baseInputShape = {
	action: z
		.enum(['create', 'edit', 'debug', 'answer'])
		.describe(
			'"create": build a new workflow from `request`. "edit": change `workflowId` as `request` says. ' +
				'"debug": repair `workflowId` from its failed execution (`executionId` optional). ' +
				'"answer": continue `sessionId` with the user’s reply in `request`.',
		),
	request: optionalString(
		'The user’s words: the behavior to build (create), the change to make (edit), what they reported (debug), or their reply (answer). Required except for debug.',
	),
	workflowId: optionalString('Target workflow. Required for edit and debug.'),
	executionId: optionalString(
		'Failed execution to use as evidence for debug. Defaults to the latest failed execution.',
	),
	sessionId: optionalString(
		'Compiler session to continue. Returned by an earlier call; required with action "answer".',
	),
	answers: optional(
		z.record(z.string(), z.unknown()),
		'Structured answers to earlier clarification questions, keyed by the returned `fields` paths.',
	),
	name: optionalString('Workflow name override for new workflows.'),
	approvalSummary: approvalSummarySchema,
	workItemId: optionalString('Workflow-loop work item id when repairing a workflow.'),
	isSupportingWorkflow: optional(z.boolean(), 'Marks a saved sub-workflow as supporting.'),
	preferNewCredentials: optional(
		z.array(z.string()),
		'Credential types the user asked to create fresh instead of reusing existing ones.',
	),
	executionIntent: optional(
		z.enum(['one-off', 'reusable']),
		'"one-off" when the user wants a single run now; "reusable" for an ongoing automation.',
	),
};

export const compileWorkflowInputSchema = z.object(baseInputShape).strict();
export const compileWorkflowInputSchemaWithFolderPlacement = z
	.object({
		...baseInputShape,
		folderPath: optionalString(
			'Folder to create a new workflow in, named as the user named it (`Clients/Acme`). New workflows only.',
		),
	})
	.strict();
export type CompileWorkflowInput = z.infer<typeof compileWorkflowInputSchemaWithFolderPlacement>;

const levelsSchema = z.object({
	structural: verificationLevelSchema,
	parameters: verificationLevelSchema,
	expressions: verificationLevelSchema,
	contracts: verificationLevelSchema,
	fixtureTests: verificationLevelSchema,
	integrationTests: verificationLevelSchema,
	publication: verificationLevelSchema,
});
const executionPathsSchema = z.array(
	z.object({
		id: z.string(),
		decisions: z.array(z.object({ node: z.string(), label: z.string() })),
		end: z.string(),
	}),
);
const generatorSchema = z.object({
	compilerVersion: z.string(),
	patternRegistryVersion: z.string(),
	nodeRegistryVersion: z.string(),
	patternIds: z.array(z.string()),
});
const diagnosticsSchema = z.object({ planningPath: z.string(), ...decisionDiagnosticsShape });

export const compileWorkflowOutputSchema = z
	.object({
		success: z.boolean(),
		status: z.enum(['compiled', 'needs_clarification', 'needs_setup', 'failed', 'denied']),
		sessionId: z.string(),
		/** Question(s) for the user when status is needs_clarification; relay verbatim, then call action "answer". */
		message: z.string().optional(),
		questions: clarificationQuestionsSchema,
		summary: z.string().optional(),
		verification: levelsSchema.optional(),
		issues: z.array(issueSchema.extend({ nodeName: z.string().optional() })).optional(),
		executionPaths: executionPathsSchema.optional(),
		changedNodeNames: z.array(z.string()).optional(),
		credentialTypes: z.array(z.string()).optional(),
		generator: generatorSchema.optional(),
		diagnostics: diagnosticsSchema.optional(),
		errors: z.array(z.string()).optional(),
	})
	.passthrough();

/** Session that an in-flight tool call compiled before it suspended for approval. */
const pendingSessions = new Map<string, string>();

export function createWorkflowCompilerService(context: InstanceAiContext): WorkflowCompilerService {
	return new WorkflowCompilerService({
		registry: registryFor(context),
		decisions: selectDecisionService(context),
		sessions: new ThreadSessionStore(context),
	});
}

const wfSlug = (value: string) => slug(value, 'workflow');

export function createCompileWorkflowTool(context: InstanceAiContext) {
	const persist = createBuildWorkflowTool(context, { useModelForSimulation: false });
	const folderEnabled = context.folderExplorationEnabled === true;

	return new Tool('build-workflow')
		.description(
			'Build, edit, or debug a workflow with the workflow compiler. ' +
				'action "create": pass the user’s request; the compiler extracts requirements, picks operations with bounded decisions, compiles a validated workflow and saves it. ' +
				'action "edit": pass workflowId and the change; only the affected nodes change. ' +
				'action "debug": pass workflowId (and executionId when known); the compiler classifies the failure from execution evidence and applies the smallest fix or asks what it needs. ' +
				'When the result is needs_clarification, relay `message` to the user verbatim and call action "answer" with the same sessionId and their reply. ' +
				'Never paraphrase the request into node names or code; give the compiler the user’s words. Do not load workflow-building skills first.',
		)
		.input(
			folderEnabled ? compileWorkflowInputSchemaWithFolderPlacement : compileWorkflowInputSchema,
		)
		.output(compileWorkflowOutputSchema)
		.suspend(confirmationSuspendSchema)
		.resume(instanceAiApprovalResumeSchema)
		.handler(async (input, ctx) => {
			const service = createWorkflowCompilerService(context);
			const pendingSessionId = ctx.toolCallId ? pendingSessions.get(ctx.toolCallId) : undefined;
			const pending =
				ctx.resumeData && pendingSessionId ? await service.getSession(pendingSessionId) : undefined;
			const failed = (errors: string[]) => ({
				success: false,
				status: 'failed' as const,
				sessionId: input.sessionId ?? '',
				errors,
			});

			let result: CompilerResult;
			let targetWorkflowId: string | undefined;
			if (pending?.compiled && pending.report) {
				// Resumed after an approval card: reuse what this call already compiled.
				targetWorkflowId = pending.workflowId;
				result = {
					status: 'compiled',
					sessionId: pending.id,
					workflow: pending.compiled.workflow,
					report: pending.report,
					generator: pending.compiled.generator,
					executionPaths: [],
					summary: 'Resumed after approval.',
					changedNodeNames: [],
					diagnostics: {
						sessionId: pending.id,
						planningPath: pending.planningPath,
						decisionCount: 0,
						decisionWaves: 0,
						decisionLatencyMs: 0,
						timings: pending.timings,
						compilerVersion: '',
						decisions: [],
					},
				};
			} else {
				const invalid = validateActionInput(input);
				if (invalid) return failed([invalid]);
				const run = await runCompiler(context, service, input, ctx.abortSignal);
				if ('error' in run) return failed([run.error]);
				result = run.result;
				targetWorkflowId = run.workflowId;
			}

			const diagnostics = diagnosticsSchema.parse(result.diagnostics);
			const blocked = <E extends object>(
				status: 'needs_clarification' | 'needs_setup' | 'failed',
				extra: E,
			) => ({ success: false, status, sessionId: result.sessionId, ...extra, diagnostics });
			switch (result.status) {
				case 'needs_clarification':
					return blocked(result.status, { message: result.message, questions: result.questions });
				case 'needs_setup':
					return blocked(result.status, {
						summary: result.summary,
						credentialTypes: result.credentialTypes,
						message: `${result.summary} Run workflows(action="setup") for workflow ${targetWorkflowId ?? ''} to fix the credential, then verify again.`,
					});
				case 'failed':
					return blocked(result.status, {
						errors: [result.reason],
						...(result.report
							? { verification: levelsSchema.parse(result.report), issues: result.report.issues }
							: {}),
					});
				case 'compiled':
					break;
			}

			if (ctx.toolCallId) pendingSessions.set(ctx.toolCallId, result.sessionId);
			const persistHandler = persist.handler;
			if (!persistHandler) throw new UnexpectedError('persist-workflow tool has no handler');
			const { isSupportingWorkflow, preferNewCredentials } = input;
			const base = targetWorkflowId
				? wfSlug(targetWorkflowId)
				: `${wfSlug(result.workflow.name)}-${wfSlug(result.sessionId)}`;
			const persisted = await persistHandler(
				{
					filePath: `src/workflows/${base}.workflow.json`,
					sourceCode: JSON.stringify(result.workflow, null, 2),
					...(targetWorkflowId ? { workflowId: targetWorkflowId } : {}),
					...(input.name ? { name: input.name } : {}),
					...(input.approvalSummary ? { approvalSummary: input.approvalSummary } : {}),
					...(input.workItemId ? { workItemId: input.workItemId } : {}),
					...(isSupportingWorkflow !== undefined ? { isSupportingWorkflow } : {}),
					...(preferNewCredentials ? { preferNewCredentials } : {}),
					...(input.executionIntent ? { executionIntent: input.executionIntent } : {}),
					...('folderPath' in input && input.folderPath ? { folderPath: input.folderPath } : {}),
					// The compiler emits a flat graph; canvas node groups are not part of the compiled artifact.
					groupingDecision: 'not_warranted',
					groupingReason:
						'Compiled workflow: the compiler emits a flat graph without canvas node groups.',
				},
				ctx,
			);
			if (ctx.toolCallId) pendingSessions.delete(ctx.toolCallId);
			const persistedRecord = isRecord(persisted) ? persisted : {};
			const persistSucceeded = persistedRecord.success === true;
			return {
				...persistedRecord,
				success: persistSucceeded,
				status: persistSucceeded
					? ('compiled' as const)
					: persistedRecord.denied === true
						? ('denied' as const)
						: ('failed' as const),
				sessionId: result.sessionId,
				summary: result.summary,
				verification: levelsSchema.parse(result.report),
				issues: result.report.issues,
				executionPaths: executionPathsSchema.parse(result.executionPaths),
				changedNodeNames: result.changedNodeNames,
				generator: generatorSchema.parse(result.generator),
				diagnostics,
			};
		})
		.build();
}

const REQUEST_MEANING = {
	create: 'the user’s description of the workflow',
	edit: 'the change to make',
	answer: 'the user’s reply',
};

function validateActionInput(input: CompileWorkflowInput): string | undefined {
	const { action } = input;
	if ((action === 'edit' || action === 'debug') && !input.workflowId)
		return `action "${action}" needs \`workflowId\`.`;
	if (action === 'answer' && !input.sessionId)
		return 'action "answer" needs `sessionId` from the earlier call.';
	if (action === 'debug' || input.request) return undefined;
	return `action "${action}" needs \`request\`: ${REQUEST_MEANING[action]}.`;
}

async function runCompiler(
	context: InstanceAiContext,
	service: WorkflowCompilerService,
	input: CompileWorkflowInput,
	abortSignal: AbortSignal | undefined,
): Promise<{ result: CompilerResult; workflowId?: string } | { error: string }> {
	const { answers, name } = input;
	const request = input.request ?? '';
	const create = async (sessionId?: string) => ({
		result: await service.create({ request, sessionId, answers, name, abortSignal }),
	});
	const edit = async (workflowId: string, sessionId?: string) => {
		const workflow = await loadWorkflow(context, workflowId);
		if (!workflow) return { error: `Workflow ${workflowId} was not found.` };
		const args = { request, workflow, workflowId, sessionId, answers, abortSignal };
		return { result: await service.edit(args), workflowId };
	};
	switch (input.action) {
		case 'create':
			return await create(input.sessionId);
		case 'edit':
			return await edit(input.workflowId ?? '', input.sessionId);
		case 'debug': {
			const workflowId = input.workflowId ?? '';
			const workflow = await loadWorkflow(context, workflowId);
			if (!workflow) return { error: `Workflow ${workflowId} was not found.` };
			const execution = await latestFailedExecution(context, workflowId, input.executionId).catch(
				() => undefined,
			);
			if (!execution)
				return {
					error: `No failed execution found for workflow ${workflowId}. Run it (or pass executionId) so the compiler has evidence to work from.`,
				};
			const base = { request: input.request, workflow, workflowId, execution, abortSignal };
			return { result: await service.debug({ ...base, sessionId: input.sessionId }), workflowId };
		}
		case 'answer': {
			const sessionId = input.sessionId ?? '';
			const session = await service.getSession(sessionId);
			if (!session)
				return {
					error: `Compiler session ${sessionId} was not found; start again with action "create", "edit" or "debug".`,
				};
			if (session.intent === 'create') return await create(sessionId);
			if (!session.workflowId) return { error: `Session ${sessionId} has no target workflow.` };
			// A debug answer is a change request against the failing node: route it through edit.
			return await edit(session.workflowId, session.intent === 'edit' ? sessionId : undefined);
		}
	}
}

async function latestFailedExecution(
	context: InstanceAiContext,
	workflowId: string,
	executionId?: string,
): Promise<ExecutionDebugInfo | undefined> {
	if (executionId) return await context.executionService.getDebugInfo(executionId);
	const [latest] = await context.executionService.list({ workflowId, status: 'error', limit: 1 });
	return latest ? await context.executionService.getDebugInfo(latest.id) : undefined;
}

async function loadWorkflow(
	context: InstanceAiContext,
	workflowId: string,
): Promise<WorkflowJSON | undefined> {
	try {
		const snapshot = await context.workflowService.getWorkflowSnapshot(workflowId);
		// Fence the save against the same snapshot used to plan this change.
		await saveWorkflowSourceFileBinding(context, {
			filePath: `src/workflows/${wfSlug(workflowId)}.workflow.json`,
			workflowId,
			workflowVersionId: snapshot.versionId,
			workflowChecksum: snapshot.checksum,
		});
		return snapshot.json;
	} catch {
		return undefined;
	}
}
