/**
 * build-agent — compiler-backed orchestration tool for n8n Agent artifacts.
 *
 * The orchestrator hands over the user's words with an action (create, edit,
 * answer, verify). The agent compiler extracts requirements, resolves bounded
 * decisions (tool operations, ambiguous targets), plans a typed IR and compiles
 * a validated `AgentJsonConfig`; the builder delegate persists it. No language
 * model writes the config. Verification runs the enumerated behavior scenarios
 * in Preview and reports which paths the agent exercised.
 *
 * Targeting (`agentRef`, `name`, `agentId`, `createNew`) keeps the contract of
 * the previous tool so conversations address agents the same way.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { saveAgentBuilderTarget, type AgentBuilderTarget } from './agent-target-binding';
import { resolveAgentBuilderTarget, resolveTargetForCall } from './agent-target-resolution';
import {
	builderRequiredArtifactsSchema,
	type BuilderRequiredArtifact,
} from './builder-required-artifact';
import { formatParentHandoffEnvelope } from './parent-handoff-state';
import {
	AgentCompilerService,
	loadAgentCapabilityCatalog,
	scenarioCoverage,
	describeScenarioCoverage,
	type AgentCompilerResult,
	type AgentScenario,
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
import { NodeRegistry } from '../../workflow-compiler/catalog/node-registry';
import {
	ModelDecisionService,
	NullDecisionService,
	type DecisionService,
} from '../../workflow-compiler/decision';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

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
		request: z
			.string()
			.optional()
			.describe(
				'The user’s words: what the agent should do (create), the change (edit), or their reply (answer). Required except for verify.',
			),
		agentRef: z
			.string()
			.optional()
			.describe(
				'Stable per-conversation key for the agent. Reuse it on every call about the same agent.',
			),
		name: z
			.string()
			.optional()
			.describe('Display name for a new agent. Required to create when no agentRef is bound yet.'),
		agentId: z
			.string()
			.optional()
			.describe('Existing agent id to adopt (once); later calls use agentRef.'),
		createNew: z
			.boolean()
			.optional()
			.describe('Create a second agent even though one is already bound.'),
		sessionId: z
			.string()
			.optional()
			.describe('Compiler session to continue; required with action "answer".'),
		answers: z
			.record(z.string(), z.unknown())
			.optional()
			.describe('Structured answers keyed by the returned question `fields`.'),
		workflowContext: workflowContextSchema,
	})
	.strict();
export type BuildAgentInput = z.infer<typeof buildAgentInputSchema>;

const verificationLevelSchema = z.enum(['pass', 'fail', 'warn', 'not_run']);

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
		questions: z
			.array(
				z.object({
					fields: z.array(z.string()),
					question: z.string(),
					candidates: z.array(z.unknown()).optional(),
				}),
			)
			.optional(),
		requiredArtifacts: builderRequiredArtifactsSchema.optional(),
		summary: z.string().optional(),
		verification: z
			.object({
				schema: verificationLevelSchema,
				references: verificationLevelSchema,
				channels: verificationLevelSchema,
				runnable: verificationLevelSchema,
				previewScenarios: verificationLevelSchema,
				publication: verificationLevelSchema,
			})
			.optional(),
		issues: z
			.array(
				z.object({
					severity: z.enum(['error', 'warning', 'info']),
					code: z.string(),
					message: z.string(),
				}),
			)
			.optional(),
		scenarios: z
			.array(
				z.object({
					id: z.string(),
					kind: z.string(),
					message: z.string(),
					expectedTools: z.array(z.string()),
				}),
			)
			.optional(),
		scenarioCoverage: z
			.object({
				total: z.number(),
				covered: z.number(),
				note: z.string(),
				runs: z.array(
					z.object({
						scenarioId: z.string(),
						status: z.string(),
						toolCalls: z.array(z.string()),
						response: z.string(),
					}),
				),
			})
			.optional(),
		diagnostics: z
			.object({
				decisionCount: z.number(),
				decisionWaves: z.number(),
				decisionLatencyMs: z.number(),
				timings: z.record(z.string(), z.number()),
			})
			.optional(),
		error: z.string().optional(),
	})
	.passthrough();

const registryByNodeService = new WeakMap<InstanceAiContext['nodeService'], NodeRegistry>();

function registryFor(context: InstanceAiContext): NodeRegistry {
	let registry = registryByNodeService.get(context.nodeService);
	if (!registry) {
		registry = new NodeRegistry({
			descriptions: {
				getDescription: async (type, version) =>
					await context.nodeService.getDescription(type, version),
			},
		});
		registryByNodeService.set(context.nodeService, registry);
	}
	return registry;
}

function decisionServiceFor(context: InstanceAiContext): DecisionService {
	if (context.decisionService) return context.decisionService;
	if (context.modelId) return new ModelDecisionService(context.modelId);
	return new NullDecisionService();
}

/** Process-wide compiler per delegate, so sessions survive across calls in a run. */
const servicesByDomainContext = new WeakMap<InstanceAiContext, AgentCompilerService>();

export function agentCompilerFor(context: InstanceAiContext): AgentCompilerService {
	let service = servicesByDomainContext.get(context);
	if (!service) {
		service = new AgentCompilerService({ decisions: decisionServiceFor(context) });
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

function publishBuildFinished(
	context: OrchestrationContext,
	builderAgentId: string,
	outcome: { result?: string; error?: string },
): void {
	context.eventBus.publish(context.threadId, {
		type: 'agent-completed',
		runId: context.runId,
		agentId: builderAgentId,
		payload: {
			role: BUILDER_ROLE,
			result: (outcome.result ?? '').slice(0, 200),
			...(outcome.error ? { error: outcome.error } : {}),
		},
	});
}

function identity(target: AgentBuilderTarget): {
	agentId: string;
	agentRef?: string;
	agentName?: string;
} {
	return {
		agentId: target.agentId,
		...(target.ref ? { agentRef: target.ref } : {}),
		...(target.name ? { agentName: target.name } : {}),
	};
}

function failure(message: string, extra: Record<string, unknown> = {}) {
	return { ok: false, status: 'failed' as const, configUpdated: false, error: message, ...extra };
}

export function createBuildAgentTool(context: OrchestrationContext) {
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
		.handler(async (input: BuildAgentInput) => {
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
			const ref = target.ref ?? target.agentId;
			const builderAgentId = publishBuildStarted(context, target);
			const finished = <
				T extends { ok: boolean; message?: string; summary?: string; error?: string },
			>(
				output: T,
			): T => {
				publishBuildFinished(
					context,
					builderAgentId,
					output.ok
						? { result: output.summary ?? output.message ?? '' }
						: { error: output.error ?? output.message ?? 'The agent build did not complete.' },
				);
				return output;
			};
			const service = agentCompilerFor(domainContext);
			const catalog = await loadAgentCapabilityCatalog(delegate, {
				nodeRegistry: registryFor(domainContext),
				excludeAgentId: target.agentId,
			});
			const handoff = formatParentHandoffEnvelope(context);
			const requestText = [input.request ?? '', handoff ?? ''].filter(Boolean).join('\n\n');

			if (input.action === 'verify')
				return finished(await verify(delegate, service, target, input));

			const existing = await delegate.readAgentArtifact?.(target.agentId).catch(() => null);
			const isEdit =
				input.action === 'edit' ||
				(input.action === 'answer' &&
					(await service.getSession(input.sessionId ?? ''))?.intent === 'edit') ||
				(resolution.mode === 'edit' &&
					input.action !== 'create' &&
					existing?.config !== undefined &&
					existing.config.instructions.trim() !== '');
			let result: AgentCompilerResult;
			if (isEdit) {
				if (!existing)
					return finished(
						failure(
							`Agent ${target.agentId} has no configuration to edit yet; use action "create".`,
							identity(target),
						),
					);
				result = await service.edit({
					ref,
					agentId: target.agentId,
					request: requestText,
					config: existing.config,
					catalog,
					sessionId: input.sessionId,
					answers: input.answers,
					sessionWorkflows: input.workflowContext,
					abortSignal: context.abortSignal,
				});
			} else {
				result = await service.create({
					ref,
					request: requestText,
					catalog,
					sessionId: input.sessionId,
					answers: input.answers,
					name: input.name ?? target.name,
					sessionWorkflows: input.workflowContext,
					abortSignal: context.abortSignal,
				});
			}

			const diagnostics = {
				decisionCount: result.diagnostics.decisionCount,
				decisionWaves: result.diagnostics.decisionWaves,
				decisionLatencyMs: result.diagnostics.decisionLatencyMs,
				timings: result.diagnostics.timings,
			};
			switch (result.status) {
				case 'needs_clarification':
					return finished({
						ok: false,
						status: 'needs_clarification' as const,
						configUpdated: false,
						sessionId: result.sessionId,
						...identity(target),
						message: result.message,
						questions: result.questions,
						diagnostics,
						error: `Needs clarification: ${result.message}`,
					});
				case 'needs_artifacts': {
					const requiredArtifacts: BuilderRequiredArtifact[] = result.artifacts.map((artifact) => ({
						type: 'workflow',
						name: artifact.name,
						purpose: artifact.purpose,
						relationship: 'agent-tool',
						requirements: artifact.requirements,
					}));
					return finished({
						ok: false,
						status: 'needs_artifacts' as const,
						configUpdated: false,
						sessionId: result.sessionId,
						...identity(target),
						message: result.message,
						requiredArtifacts,
						diagnostics,
						error: `Needs artifacts: ${result.message}`,
					});
				}
				case 'failed':
					return finished({
						...failure(result.reason, identity(target)),
						sessionId: result.sessionId,
						...(result.report
							? { verification: levels(result.report), issues: result.report.issues }
							: {}),
						diagnostics,
					});
				case 'compiled':
					break;
			}

			if (!delegate.writeAgentArtifact)
				return finished(
					failure(
						'This instance cannot persist compiled agents (builder delegate is missing writeAgentArtifact).',
						identity(target),
					),
				);
			const written = await delegate.writeAgentArtifact(
				target.agentId,
				{ config: result.config, skills: result.skills, tasks: result.tasks },
				{ baseConfigHash: existing?.configHash ?? null },
			);
			if (!written.ok)
				return finished({
					...failure(`Saving the agent failed: ${written.errors.join(' ')}`, identity(target)),
					sessionId: result.sessionId,
					verification: levels(result.report),
					issues: result.report.issues,
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
				verification: levels(result.report),
				issues: result.report.issues,
				scenarios: result.scenarios.map(publicScenario),
				diagnostics,
			});
		})
		.build();
}

function validateInput(input: BuildAgentInput): string | undefined {
	switch (input.action) {
		case 'create':
		case 'edit':
			return input.request
				? undefined
				: `action "${input.action}" needs \`request\`: the user’s words.`;
		case 'answer':
			if (!input.sessionId) return 'action "answer" needs `sessionId` from the earlier call.';
			return input.request ? undefined : 'action "answer" needs `request`: the user’s reply.';
		case 'verify':
			return undefined;
	}
}

function describeNextSteps(result: Extract<AgentCompilerResult, { status: 'compiled' }>): string {
	const notes: string[] = [];
	if (result.report.issues.some((issue) => issue.code === 'model_unresolved'))
		notes.push(
			'The agent is a draft until a model and credential are chosen in the agent settings.',
		);
	if (result.report.issues.some((issue) => issue.code === 'channel_credential_unresolved'))
		notes.push('Connect the channel credential in the agent settings before publishing.');
	if (
		result.report.issues.some(
			(issue) => issue.code === 'compile_warning' && issue.message.includes('credential'),
		)
	)
		notes.push('Some tools still need credentials.');
	notes.push('Call action "verify" to run its behavior scenarios in Preview.');
	return notes.join(' ');
}

function levels(report: {
	schema: string;
	references: string;
	channels: string;
	runnable: string;
	previewScenarios: string;
	publication: string;
}) {
	const level = (value: string): 'pass' | 'fail' | 'warn' | 'not_run' =>
		value === 'pass' || value === 'fail' || value === 'warn' ? value : 'not_run';
	return {
		schema: level(report.schema),
		references: level(report.references),
		channels: level(report.channels),
		runnable: level(report.runnable),
		previewScenarios: level(report.previewScenarios),
		publication: level(report.publication),
	};
}

function publicScenario(scenario: AgentScenario) {
	return {
		id: scenario.id,
		kind: scenario.kind,
		message: scenario.message,
		expectedTools: scenario.expectedTools,
	};
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
		try {
			const outcome = await delegate.runAgentPreview(target.agentId, scenario.message);
			if (outcome.status === 'misconfigured') {
				runs.push({
					scenarioId: scenario.id,
					response: `Agent is not runnable: missing ${outcome.missing.join(', ')}.`,
					toolCalls: [],
					status: 'misconfigured',
				});
				break;
			}
			runs.push({
				scenarioId: scenario.id,
				response: outcome.response,
				toolCalls: outcome.toolCalls,
				status: outcome.status,
			});
		} catch (error) {
			runs.push({
				scenarioId: scenario.id,
				response: error instanceof Error ? error.message : String(error),
				toolCalls: [],
				status: 'failed',
			});
		}
	}
	const coverage = scenarioCoverage(scenarios, runs);
	if (session) {
		session.report = {
			...(session.report ?? {
				schema: 'not_run',
				references: 'not_run',
				channels: 'not_run',
				runnable: 'not_run',
				previewScenarios: 'not_run',
				publication: 'not_run',
				issues: [],
			}),
			previewScenarios:
				coverage.uncovered.length === 0 ? 'pass' : coverage.covered > 0 ? 'warn' : 'fail',
		};
		session.status = coverage.uncovered.length === 0 ? 'verified' : session.status;
	}
	return {
		ok: coverage.uncovered.length === 0,
		status: 'verified' as const,
		configUpdated: false,
		sessionId: input.sessionId,
		...identity(target),
		message: describeScenarioCoverage(coverage),
		scenarioCoverage: {
			total: coverage.total,
			covered: coverage.covered,
			note: describeScenarioCoverage(coverage),
			runs: runs.map((run) => ({
				scenarioId: run.scenarioId,
				status: run.status,
				toolCalls: run.toolCalls,
				response: run.response.slice(0, 600),
			})),
		},
	};
}
