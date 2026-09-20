/**
 * `build-agent`: the compiler-backed orchestration tool for n8n Agent
 * artifacts. The agent compiler turns the user's words into a validated
 * `AgentJsonConfig` with bounded decisions; the builder delegate persists it.
 * No language model writes the config. Verification runs the behavior
 * scenarios in Preview. Targeting (`agentRef`, `name`, `agentId`, `createNew`)
 * keeps the contract of the previous tool.
 */
import { Tool } from '@n8n/agents';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { z } from 'zod';

import { saveAgentBuilderTarget, type AgentBuilderTarget } from './agent-target-binding';
import { resolveAgentBuilderTarget, resolveTargetForCall } from './agent-target-resolution';
import {
	builderRequiredArtifactsSchema,
	type BuilderRequiredArtifact,
} from './builder-required-artifact';
import {
	AgentCompilerService,
	describeScenarioCoverage,
	emptyAgentVerificationReport,
	loadAgentCapabilityCatalog,
	scenarioCoverage,
	type AgentCompilerResult,
	type AgentScenarioRun,
} from '../../agent-compiler';
import {
	emitAgentSnapshotTraceEvent,
	type AgentSnapshotArtifact,
	type AgentSnapshotReason,
} from '../../tracing/agent-snapshot-event';
import type {
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../types';
import type { ValidationIssue } from '../../workflow-compiler';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';
import {
	clarificationQuestionsSchema,
	decisionDiagnosticsShape,
	issueSchema,
	optional,
	optionalString,
	registryFor,
	selectDecisionService,
	verificationLevelSchema,
} from '../workflows/compiler-tool-support';

const workflowContextSchema = z
	.array(z.object({ id: z.string(), name: z.string(), description: z.string().optional() }))
	.optional()
	.describe('Workflows built in this conversation that the agent may attach as tools.');

export const buildAgentInputSchema = z
	.object({
		action: z
			.enum(['create', 'edit', 'answer', 'verify'])
			.describe(
				'"create": build a new agent from `request`. "edit": change the targeted agent as `request` says. ' +
					'"answer": continue `sessionId` with the user’s reply in `request`. "verify": run the compiled behavior scenarios in Preview.',
			),
		request: optionalString(
			'The user’s words: what the agent should do (create), the change (edit), or their reply (answer). Required except for verify.',
		),
		agentRef: optionalString(
			'Stable per-conversation key for the agent. Reuse it on every call about the same agent.',
		),
		name: optionalString(
			'Display name for a new agent. Required to create when no agentRef is bound yet.',
		),
		agentId: optionalString('Existing agent id to adopt (once); later calls use agentRef.'),
		createNew: optional(z.boolean(), 'Create a second agent even though one is already bound.'),
		sessionId: optionalString('Compiler session to continue; required with action "answer".'),
		answers: optional(
			z.record(z.string(), z.unknown()),
			'Structured answers keyed by the returned question `fields`.',
		),
		workflowContext: workflowContextSchema,
	})
	.strict();
export type BuildAgentInput = z.infer<typeof buildAgentInputSchema>;

const levelsSchema = z.object({
	schema: verificationLevelSchema,
	references: verificationLevelSchema,
	channels: verificationLevelSchema,
	runnable: verificationLevelSchema,
	previewScenarios: verificationLevelSchema,
	publication: verificationLevelSchema,
});
const scenariosSchema = z.array(
	z.object({
		id: z.string(),
		kind: z.string(),
		message: z.string(),
		expectedTools: z.array(z.string()),
	}),
);
const scenarioRunSchema = z.object({
	scenarioId: z.string(),
	status: z.string(),
	toolCalls: z.array(z.string()),
	response: z.string(),
});
const diagnosticsSchema = z.object(decisionDiagnosticsShape);

export const buildAgentOutputSchema = z
	.object({
		ok: z.boolean(),
		status: z.enum(['compiled', 'needs_clarification', 'needs_artifacts', 'verified', 'failed']),
		sessionId: z.string().optional(),
		agentId: z.string().optional(),
		agentRef: z.string().optional(),
		agentName: z.string().optional(),
		configUpdated: z.boolean(),
		message: z.string().optional(),
		questions: clarificationQuestionsSchema,
		requiredArtifacts: builderRequiredArtifactsSchema.optional(),
		summary: z.string().optional(),
		verification: levelsSchema.optional(),
		issues: z.array(issueSchema).optional(),
		scenarios: scenariosSchema.optional(),
		scenarioCoverage: z
			.object({
				total: z.number(),
				covered: z.number(),
				note: z.string(),
				runs: z.array(scenarioRunSchema),
			})
			.optional(),
		diagnostics: diagnosticsSchema.optional(),
		error: z.string().optional(),
	})
	.passthrough();

/** Process-wide compiler per delegate, so sessions survive across calls in a run. */
const servicesByDomainContext = new WeakMap<InstanceAiContext, AgentCompilerService>();

export function agentCompilerFor(context: InstanceAiContext): AgentCompilerService {
	let service = servicesByDomainContext.get(context);
	if (!service) {
		service = new AgentCompilerService({ decisions: selectDecisionService(context) });
		servicesByDomainContext.set(context, service);
	}
	return service;
}

async function snapshotAgent(
	context: OrchestrationContext,
	delegate: InstanceAiBuilderDelegate,
	target: AgentBuilderTarget,
	reason: AgentSnapshotReason,
): Promise<void> {
	if (!context.tracing) return;
	let artifact: AgentSnapshotArtifact | null = null;
	try {
		artifact = (await delegate.readAgentArtifact?.(target.agentId)) ?? null;
	} catch {
		return;
	}
	if (!artifact) return;
	await emitAgentSnapshotTraceEvent(context.tracing, {
		agentId: target.agentId,
		projectId: target.projectId,
		reason,
		artifact,
		logger: context.logger,
	});
}

const BUILDER_ROLE = 'agent-builder';

/** The FE tree and the eval harness learn the target agent from these events, as they did with the sub-agent. */
function publishBuildStarted(context: OrchestrationContext, target: AgentBuilderTarget): string {
	const builderAgentId = `${BUILDER_ROLE}:${target.agentId}`;
	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: builderAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role: BUILDER_ROLE,
			tools: [],
			kind: BUILDER_ROLE,
			title: 'Building agent',
			targetResource: {
				type: 'agent',
				id: target.agentId,
				projectId: target.projectId,
				...(target.name ? { name: target.name } : {}),
			},
		},
	});
	return builderAgentId;
}

interface BuildOutput {
	ok: boolean;
	message?: string;
	summary?: string;
	error?: string;
}

/** Publishes `agent-completed` for the builder and passes the output through. */
function finish<T extends BuildOutput>(
	context: OrchestrationContext,
	builderAgentId: string,
	output: T,
): T {
	const result = output.ok ? (output.summary ?? output.message ?? '') : '';
	const error = output.ok
		? undefined
		: (output.error ?? output.message ?? 'The agent build did not complete.');
	context.eventBus.publish(context.threadId, {
		type: 'agent-completed',
		runId: context.runId,
		agentId: builderAgentId,
		payload: { role: BUILDER_ROLE, result: result.slice(0, 200), ...(error ? { error } : {}) },
	});
	return output;
}

const identity = (target: AgentBuilderTarget) => ({
	agentId: target.agentId,
	...(target.ref ? { agentRef: target.ref } : {}),
	...(target.name ? { agentName: target.name } : {}),
});

function failure(message: string, extra: Record<string, unknown> = {}) {
	return { ok: false, status: 'failed' as const, configUpdated: false, error: message, ...extra };
}

export function createCompileAgentTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.BUILD_AGENT)
		.description(
			'Build, edit, or verify an n8n **Agent** with the agent compiler. ' +
				'action "create": pass the user’s words in `request` plus `name` (and an `agentRef` to address it later); the compiler extracts what the agent must do, picks tools with bounded decisions, compiles a validated config and saves it. ' +
				'action "edit": pass the change in `request` with the bound `agentRef`; only the affected part of the config changes. ' +
				'action "answer": when a call returned needs_clarification, relay `message` to the user verbatim, then call again with the same `sessionId` and their reply. ' +
				'action "verify": run the compiled behavior scenarios in Preview and report which tool paths the agent exercised. ' +
				'When the result is needs_artifacts, build each listed workflow with build-workflow, then call again with them in `workflowContext`. ' +
				'Never translate the request into implementation choices yourself; give the compiler the user’s words. This tool is only for Agent artifacts; workflow-anchored requests stay on build-workflow.',
		)
		.input(buildAgentInputSchema)
		.output(buildAgentOutputSchema)
		.handler(async (input) => {
			if (context.abortSignal?.aborted) return failure('The agent build was cancelled.');
			const domainContext = context.domainContext;
			const delegate = domainContext?.builderDelegate;
			if (!domainContext || !delegate)
				return failure('Agent building is not available in this conversation (no agents module).');
			const invalid = validateInput(input);
			if (invalid) return failure(invalid);

			const boundTarget = await resolveAgentBuilderTarget(domainContext);
			const resolution = await resolveTargetForCall(domainContext, delegate, input, boundTarget);
			if (!resolution.ok) return failure(resolution.error);
			const target = resolution.target;
			if (resolution.bindAfterTurn) {
				domainContext.agentBuilderTarget = target;
				await saveAgentBuilderTarget(domainContext, target);
			}
			const builderAgentId = publishBuildStarted(context, target);
			const finished = <T extends BuildOutput>(output: T): T =>
				finish(context, builderAgentId, output);
			const fail = (message: string) => finished(failure(message, identity(target)));
			const service = agentCompilerFor(domainContext);
			const catalog = await loadAgentCapabilityCatalog(delegate, {
				nodeRegistry: registryFor(domainContext),
				excludeAgentId: target.agentId,
			});
			const request = input.request ?? '';

			if (input.action === 'verify')
				return finished(await verify(delegate, service, target, input));

			const { sessionId, answers, workflowContext: sessionWorkflows } = input;
			const existing = await delegate.readAgentArtifact?.(target.agentId).catch(() => null);
			const isEdit =
				input.action === 'edit' ||
				(input.action === 'answer' &&
					(await service.getSession(sessionId ?? ''))?.intent === 'edit') ||
				(resolution.mode === 'edit' &&
					input.action !== 'create' &&
					existing?.config !== undefined &&
					existing.config.instructions.trim() !== '');
			if (isEdit && !existing)
				return fail(
					`Agent ${target.agentId} has no configuration to edit yet; use action "create".`,
				);
			const ref = target.ref ?? target.agentId;
			const shared = {
				ref,
				request,
				catalog,
				sessionId,
				answers,
				sessionWorkflows,
				abortSignal: context.abortSignal,
			};
			const result =
				isEdit && existing
					? await service.edit({ ...shared, agentId: target.agentId, config: existing.config })
					: await service.create({ ...shared, name: input.name ?? target.name });

			const diagnostics = diagnosticsSchema.parse(result.diagnostics);
			const blocked = <E extends object>(
				pending: Extract<AgentCompilerResult, { message: string }>,
				extra: E,
				label: string,
			) => ({
				ok: false,
				status: pending.status,
				configUpdated: false,
				sessionId: pending.sessionId,
				...identity(target),
				message: pending.message,
				...extra,
				diagnostics,
				error: `${label}: ${pending.message}`,
			});
			switch (result.status) {
				case 'needs_clarification':
					return finished(blocked(result, { questions: result.questions }, 'Needs clarification'));
				case 'needs_artifacts': {
					const requiredArtifacts: BuilderRequiredArtifact[] = result.artifacts.map((artifact) => ({
						type: 'workflow',
						name: artifact.name,
						purpose: artifact.purpose,
						relationship: 'agent-tool',
						requirements: artifact.requirements,
					}));
					return finished(blocked(result, { requiredArtifacts }, 'Needs artifacts'));
				}
				case 'failed':
					return finished({
						...failure(result.reason, identity(target)),
						sessionId: result.sessionId,
						...(result.report
							? { verification: levelsSchema.parse(result.report), issues: result.report.issues }
							: {}),
						diagnostics,
					});
				case 'compiled':
					break;
			}

			if (!delegate.writeAgentArtifact)
				return fail(
					'This instance cannot persist compiled agents (builder delegate is missing writeAgentArtifact).',
				);
			const written = await delegate.writeAgentArtifact(
				target.agentId,
				{ config: result.config, skills: result.skills, tasks: result.tasks },
				{ baseConfigHash: existing?.configHash ?? null },
			);
			const report = {
				verification: levelsSchema.parse(result.report),
				issues: result.report.issues,
			};
			if (!written.ok)
				return finished({
					...failure(`Saving the agent failed: ${written.errors.join(' ')}`, identity(target)),
					sessionId: result.sessionId,
					...report,
					diagnostics,
				});
			const name =
				(await delegate.resolveAgentName(target.agentId).catch(() => undefined)) ??
				result.config.name;
			const savedTarget: AgentBuilderTarget = { ...target, name };
			if (name !== target.name) {
				domainContext.agentBuilderTarget = savedTarget;
				await saveAgentBuilderTarget(domainContext, savedTarget);
			}
			await snapshotAgent(context, delegate, savedTarget, 'config-updated');
			return finished({
				ok: true,
				status: 'compiled' as const,
				configUpdated: true,
				sessionId: result.sessionId,
				...identity(savedTarget),
				summary: result.summary,
				message: `${result.summary} ${describeNextSteps(result)}`.trim(),
				...report,
				scenarios: scenariosSchema.parse(result.scenarios),
				diagnostics,
			});
		})
		.build();
}

function validateInput(input: BuildAgentInput): string | undefined {
	if (input.action === 'verify') return undefined;
	if (input.action === 'answer' && !input.sessionId)
		return 'action "answer" needs `sessionId` from the earlier call.';
	if (input.request) return undefined;
	return input.action === 'answer'
		? 'action "answer" needs `request`: the user’s reply.'
		: `action "${input.action}" needs \`request\`: the user’s words.`;
}

function describeNextSteps(result: Extract<AgentCompilerResult, { status: 'compiled' }>): string {
	const has = (test: (issue: ValidationIssue) => boolean) => result.report.issues.some(test);
	const notes: string[] = [];
	if (has((issue) => issue.code === 'model_unresolved'))
		notes.push(
			'The agent is a draft until a model and credential are chosen in the agent settings.',
		);
	if (has((issue) => issue.code === 'channel_credential_unresolved'))
		notes.push('Connect the channel credential in the agent settings before publishing.');
	if (has((issue) => issue.code === 'compile_warning' && issue.message.includes('credential')))
		notes.push('Some tools still need credentials.');
	notes.push('Call action "verify" to run its behavior scenarios in Preview.');
	return notes.join(' ');
}

async function verify(
	delegate: InstanceAiBuilderDelegate,
	service: AgentCompilerService,
	target: AgentBuilderTarget,
	input: BuildAgentInput,
) {
	if (!delegate.runAgentPreview)
		return failure('Preview runs are not available on this instance.', identity(target));
	const session = input.sessionId ? await service.getSession(input.sessionId) : undefined;
	const scenarios = session?.scenarios ?? [];
	if (scenarios.length === 0)
		return failure(
			'No compiled scenarios for this agent in this conversation; build or edit it first, then verify with that sessionId.',
			identity(target),
		);
	const runs: AgentScenarioRun[] = [];
	for (const scenario of scenarios) {
		const record = (
			status: AgentScenarioRun['status'],
			response: string,
			toolCalls: string[] = [],
		) => runs.push({ scenarioId: scenario.id, response, toolCalls, status });
		try {
			const outcome = await delegate.runAgentPreview(target.agentId, scenario.message);
			if (outcome.status === 'misconfigured') {
				record('misconfigured', `Agent is not runnable: missing ${outcome.missing.join(', ')}.`);
				break;
			}
			record(outcome.status, outcome.response, outcome.toolCalls);
		} catch (error) {
			record('failed', getErrorMessage(error));
		}
	}
	const coverage = scenarioCoverage(scenarios, runs);
	const allCovered = coverage.uncovered.length === 0;
	if (session) {
		session.report = {
			...(session.report ?? emptyAgentVerificationReport()),
			previewScenarios: allCovered ? 'pass' : coverage.covered > 0 ? 'warn' : 'fail',
		};
		session.status = allCovered ? 'verified' : session.status;
	}
	const note = describeScenarioCoverage(coverage);
	return {
		ok: allCovered,
		status: 'verified' as const,
		configUpdated: false,
		sessionId: input.sessionId,
		...identity(target),
		message: note,
		scenarioCoverage: {
			total: coverage.total,
			covered: coverage.covered,
			note,
			runs: runs.map((run) =>
				scenarioRunSchema.parse({ ...run, response: run.response.slice(0, 600) }),
			),
		},
	};
}
