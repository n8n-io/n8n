import { instanceAiApprovalResumeSchema } from '@n8n/api-types';
import { Tool, type RuntimeSkillLoader } from '@n8n/agents';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import { ThreadSessionStore } from './compiler-session-store';
import { confirmationSuspendSchema, createPersistWorkflowTool } from './persist-workflow.tool';
import type { ExecutionDebugInfo, InstanceAiContext } from '../../types';
import {
	ModelDecisionService,
	NodeRegistry,
	NullDecisionService,
	WorkflowCompilerService,
	type CompilerResult,
	type DecisionService,
	type VerificationReport,
} from '../../workflow-compiler';
import { approvalSummarySchema } from '../approval-copy';

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
	request: z
		.string()
		.optional()
		.describe(
			'The user’s words: the behavior to build (create), the change to make (edit), what they reported (debug), or their reply (answer). Required except for debug.',
		),
	workflowId: z.string().optional().describe('Target workflow. Required for edit and debug.'),
	executionId: z
		.string()
		.optional()
		.describe(
			'Failed execution to use as evidence for debug. Defaults to the latest failed execution.',
		),
	sessionId: z
		.string()
		.optional()
		.describe(
			'Compiler session to continue. Returned by an earlier call; required with action "answer".',
		),
	answers: z
		.record(z.string(), z.unknown())
		.optional()
		.describe(
			'Structured answers to earlier clarification questions, keyed by the returned `fields` paths.',
		),
	name: z.string().optional().describe('Workflow name override for new workflows.'),
	approvalSummary: approvalSummarySchema,
	workItemId: z
		.string()
		.optional()
		.describe('Workflow-loop work item id when repairing a workflow.'),
	isSupportingWorkflow: z
		.boolean()
		.optional()
		.describe('Marks a saved sub-workflow as supporting.'),
	preferNewCredentials: z
		.array(z.string())
		.optional()
		.describe('Credential types the user asked to create fresh instead of reusing existing ones.'),
	executionIntent: z
		.enum(['one-off', 'reusable'])
		.optional()
		.describe(
			'"one-off" when the user wants a single run now; "reusable" for an ongoing automation.',
		),
};

export const buildWorkflowInputSchema = z.object(baseInputShape).strict();
export const buildWorkflowInputSchemaWithFolderPlacement = z
	.object({
		...baseInputShape,
		folderPath: z
			.string()
			.optional()
			.describe(
				'Folder to create a new workflow in, named as the user named it (`Clients/Acme`). New workflows only.',
			),
	})
	.strict();
export type BuildWorkflowInput = z.infer<typeof buildWorkflowInputSchemaWithFolderPlacement>;

const verificationLevelSchema = z.enum(['pass', 'fail', 'warn', 'not_run']);

export const buildWorkflowOutputSchema = z
	.object({
		success: z.boolean(),
		status: z.enum(['compiled', 'needs_clarification', 'needs_setup', 'failed', 'denied']),
		sessionId: z.string(),
		/** Question(s) for the user when status is needs_clarification; relay verbatim, then call action "answer". */
		message: z.string().optional(),
		questions: z
			.array(
				z.object({
					fields: z.array(z.string()),
					question: z.string(),
					candidates: z.array(z.unknown()).optional(),
				}),
			)
			.optional(),
		summary: z.string().optional(),
		verification: z
			.object({
				structural: verificationLevelSchema,
				parameters: verificationLevelSchema,
				expressions: verificationLevelSchema,
				contracts: verificationLevelSchema,
				fixtureTests: verificationLevelSchema,
				integrationTests: verificationLevelSchema,
				publication: verificationLevelSchema,
			})
			.optional(),
		issues: z
			.array(
				z.object({
					severity: z.enum(['error', 'warning', 'info']),
					code: z.string(),
					message: z.string(),
					nodeName: z.string().optional(),
				}),
			)
			.optional(),
		executionPaths: z
			.array(
				z.object({
					id: z.string(),
					decisions: z.array(z.object({ node: z.string(), label: z.string() })),
					end: z.string(),
				}),
			)
			.optional(),
		changedNodeNames: z.array(z.string()).optional(),
		credentialTypes: z.array(z.string()).optional(),
		generator: z
			.object({
				compilerVersion: z.string(),
				patternRegistryVersion: z.string(),
				nodeRegistryVersion: z.string(),
				patternIds: z.array(z.string()),
			})
			.optional(),
		diagnostics: z
			.object({
				planningPath: z.string(),
				decisionCount: z.number(),
				decisionWaves: z.number(),
				decisionLatencyMs: z.number(),
				timings: z.record(z.string(), z.number()),
			})
			.optional(),
		errors: z.array(z.string()).optional(),
	})
	.passthrough();

const confirmationResumeSchema = instanceAiApprovalResumeSchema;

interface BuildCtx {
	loadSkill?: RuntimeSkillLoader;
	toolCallId?: string;
	resumeData?: z.infer<typeof confirmationResumeSchema>;
	suspend?: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
	abortSignal?: AbortSignal;
}

/** Session that an in-flight tool call compiled before it suspended for approval. */
const pendingSessions = new Map<string, string>();

const registryByNodeService = new WeakMap<InstanceAiContext['nodeService'], NodeRegistry>();

function registryFor(context: InstanceAiContext): NodeRegistry {
	const key = context.nodeService;
	let registry = registryByNodeService.get(key);
	if (!registry) {
		registry = new NodeRegistry({
			descriptions: {
				getDescription: async (type, version) => await key.getDescription(type, version),
			},
		});
		registryByNodeService.set(key, registry);
	}
	return registry;
}

/** Decision backend priority: host-wired structured reads, then the run's model, then abstain. */
export function selectDecisionService(context: InstanceAiContext): DecisionService {
	if (context.decisionService) return context.decisionService;
	if (context.modelId) return new ModelDecisionService(context.modelId);
	return new NullDecisionService();
}

export function createWorkflowCompilerService(context: InstanceAiContext): WorkflowCompilerService {
	return new WorkflowCompilerService({
		registry: registryFor(context),
		decisions: selectDecisionService(context),
		sessions: new ThreadSessionStore(context),
	});
}

function slug(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'workflow'
	);
}

function sourceFilePathFor(
	result: Extract<CompilerResult, { status: 'compiled' }>,
	workflowId: string | undefined,
): string {
	const base = workflowId
		? slug(workflowId)
		: `${slug(result.workflow.name)}-${slug(result.sessionId)}`;
	return `src/workflows/${base}.workflow.json`;
}

async function latestFailedExecution(
	context: InstanceAiContext,
	workflowId: string,
	executionId?: string,
): Promise<ExecutionDebugInfo | undefined> {
	if (executionId) return await context.executionService.getDebugInfo(executionId);
	const failed = await context.executionService.list({ workflowId, status: 'error', limit: 1 });
	const latest = failed[0];
	if (!latest) return undefined;
	return await context.executionService.getDebugInfo(latest.id);
}

export function createBuildWorkflowTool(context: InstanceAiContext) {
	const persist = createPersistWorkflowTool(context);
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
		.input(folderEnabled ? buildWorkflowInputSchemaWithFolderPlacement : buildWorkflowInputSchema)
		.output(buildWorkflowOutputSchema)
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input, ctx: BuildCtx) => {
			const service = createWorkflowCompilerService(context);
			const pendingSessionId = ctx.toolCallId ? pendingSessions.get(ctx.toolCallId) : undefined;
			const pending =
				ctx.resumeData && pendingSessionId ? await service.getSession(pendingSessionId) : undefined;

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
				if (invalid)
					return {
						success: false,
						status: 'failed' as const,
						sessionId: input.sessionId ?? '',
						errors: [invalid],
					};
				const run = await runCompiler(context, service, input, ctx.abortSignal);
				if ('error' in run) {
					return {
						success: false,
						status: 'failed' as const,
						sessionId: input.sessionId ?? '',
						errors: [run.error],
					};
				}
				result = run.result;
				targetWorkflowId = run.workflowId;
			}

			const diagnostics = {
				planningPath: result.diagnostics.planningPath,
				decisionCount: result.diagnostics.decisionCount,
				decisionWaves: result.diagnostics.decisionWaves,
				decisionLatencyMs: result.diagnostics.decisionLatencyMs,
				timings: result.diagnostics.timings,
			};

			switch (result.status) {
				case 'needs_clarification':
					return {
						success: false,
						status: 'needs_clarification' as const,
						sessionId: result.sessionId,
						message: result.message,
						questions: result.questions,
						diagnostics,
					};
				case 'needs_setup':
					return {
						success: false,
						status: 'needs_setup' as const,
						sessionId: result.sessionId,
						summary: result.summary,
						credentialTypes: result.credentialTypes,
						message: `${result.summary} Run workflows(action="setup") for workflow ${targetWorkflowId ?? ''} to fix the credential, then verify again.`,
						diagnostics,
					};
				case 'failed':
					return {
						success: false,
						status: 'failed' as const,
						sessionId: result.sessionId,
						errors: [result.reason],
						...(result.report
							? { verification: levels(result.report), issues: result.report.issues }
							: {}),
						diagnostics,
					};
				case 'compiled':
					break;
			}

			if (ctx.toolCallId) pendingSessions.set(ctx.toolCallId, result.sessionId);
			const persistHandler = persist.handler;
			if (!persistHandler) throw new UnexpectedError('persist-workflow tool has no handler');
			const persisted = await persistHandler(
				{
					filePath: sourceFilePathFor(result, targetWorkflowId),
					sourceCode: JSON.stringify(result.workflow, null, 2),
					...(targetWorkflowId ? { workflowId: targetWorkflowId } : {}),
					...(input.name ? { name: input.name } : {}),
					...(input.approvalSummary ? { approvalSummary: input.approvalSummary } : {}),
					...(input.workItemId ? { workItemId: input.workItemId } : {}),
					...(input.isSupportingWorkflow !== undefined
						? { isSupportingWorkflow: input.isSupportingWorkflow }
						: {}),
					...(input.preferNewCredentials
						? { preferNewCredentials: input.preferNewCredentials }
						: {}),
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
				verification: levels(result.report),
				issues: result.report.issues,
				executionPaths: result.executionPaths.map((path) => ({
					id: path.id,
					decisions: path.decisions.map((decision) => ({
						node: decision.node,
						label: decision.label,
					})),
					end: path.end,
				})),
				changedNodeNames: result.changedNodeNames,
				generator: {
					compilerVersion: result.generator.compilerVersion,
					patternRegistryVersion: result.generator.patternRegistryVersion,
					nodeRegistryVersion: result.generator.nodeRegistryVersion,
					patternIds: result.generator.patternIds,
				},
				diagnostics,
			};
		})
		.build();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function levels(report: VerificationReport) {
	return {
		structural: report.structural,
		parameters: report.parameters,
		expressions: report.expressions,
		contracts: report.contracts,
		fixtureTests: report.fixtureTests,
		integrationTests: report.integrationTests,
		publication: report.publication,
	};
}

function validateActionInput(input: BuildWorkflowInput): string | undefined {
	switch (input.action) {
		case 'create':
			return input.request
				? undefined
				: 'action "create" needs `request`: the user’s description of the workflow.';
		case 'edit':
			if (!input.workflowId) return 'action "edit" needs `workflowId`.';
			return input.request ? undefined : 'action "edit" needs `request`: the change to make.';
		case 'debug':
			return input.workflowId ? undefined : 'action "debug" needs `workflowId`.';
		case 'answer':
			if (!input.sessionId) return 'action "answer" needs `sessionId` from the earlier call.';
			return input.request ? undefined : 'action "answer" needs `request`: the user’s reply.';
	}
}

async function runCompiler(
	context: InstanceAiContext,
	service: WorkflowCompilerService,
	input: BuildWorkflowInput,
	abortSignal: AbortSignal | undefined,
): Promise<{ result: CompilerResult; workflowId?: string } | { error: string }> {
	switch (input.action) {
		case 'create':
			return {
				result: await service.create({
					request: input.request ?? '',
					sessionId: input.sessionId,
					answers: input.answers,
					name: input.name,
					abortSignal,
				}),
			};
		case 'edit': {
			const workflowId = input.workflowId ?? '';
			const workflow = await loadWorkflow(context, workflowId);
			if (!workflow) return { error: `Workflow ${workflowId} was not found.` };
			return {
				result: await service.edit({
					request: input.request ?? '',
					workflow,
					workflowId,
					sessionId: input.sessionId,
					answers: input.answers,
					abortSignal,
				}),
				workflowId,
			};
		}
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
			return {
				result: await service.debug({
					request: input.request,
					workflow,
					workflowId,
					execution,
					sessionId: input.sessionId,
					abortSignal,
				}),
				workflowId,
			};
		}
		case 'answer': {
			const sessionId = input.sessionId ?? '';
			const reply = input.request ?? '';
			const session = await service.getSession(sessionId);
			if (!session)
				return {
					error: `Compiler session ${sessionId} was not found; start again with action "create", "edit" or "debug".`,
				};
			if (session.intent === 'create') {
				return {
					result: await service.create({
						request: reply,
						sessionId,
						answers: input.answers,
						name: input.name,
						abortSignal,
					}),
				};
			}
			if (!session.workflowId) return { error: `Session ${sessionId} has no target workflow.` };
			const workflow = await loadWorkflow(context, session.workflowId);
			if (!workflow) return { error: `Workflow ${session.workflowId} was not found.` };
			if (session.intent === 'edit') {
				return {
					result: await service.edit({
						request: reply,
						workflow,
						workflowId: session.workflowId,
						sessionId,
						answers: input.answers,
						abortSignal,
					}),
					workflowId: session.workflowId,
				};
			}
			// A debug answer is a change request against the failing node: route it through edit.
			return {
				result: await service.edit({
					request: reply,
					workflow,
					workflowId: session.workflowId,
					answers: input.answers,
					abortSignal,
				}),
				workflowId: session.workflowId,
			};
		}
	}
}

async function loadWorkflow(
	context: InstanceAiContext,
	workflowId: string,
): Promise<WorkflowJSON | undefined> {
	try {
		return await context.workflowService.getAsWorkflowJSON(workflowId);
	} catch {
		return undefined;
	}
}
