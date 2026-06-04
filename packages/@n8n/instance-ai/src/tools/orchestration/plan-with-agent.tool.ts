/**
 * Plan-with-Agent Orchestration Tool
 *
 * Spawns an **inline** planner sub-agent that reads the conversation history,
 * discovers available nodes/credentials/tables, and produces a typed
 * solution blueprint. Blueprint items are emitted incrementally via the
 * `add-plan-item` tool — each call publishes a `tasks-update` event so the
 * task checklist populates progressively in the UI.
 *
 * The planner receives the last 5 messages from the thread as primary context,
 * plus an optional guidance string from the orchestrator for ambiguous cases.
 * It can also ask the user questions directly via the ask-user tool.
 */

import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { PlannerRunCoordinator, planToolSuspendSchema } from './planner-run-coordinator';
import type { OrchestrationContext } from '../../types';

const planToolResumeSchema = z.record(z.unknown());

export function createPlanWithAgentTool(context: OrchestrationContext) {
	return new Tool('plan')
		.description(
			'Design and execute a multi-step plan. Spawns a planner agent that reads ' +
				'the conversation history, discovers available credentials, data tables, ' +
				'and best practices, designs the architecture, and shows it to the user ' +
				'for approval. Use when the request requires 2 or more tasks with ' +
				'dependencies. When this tool returns, the plan is already approved ' +
				'and tasks are dispatched — just acknowledge briefly and end your turn.',
		)
		.input(
			z.object({
				guidance: z
					.string()
					.optional()
					.describe(
						'Optional steering note for the planner — use ONLY when the conversation ' +
							'history alone is ambiguous about what to build. The planner reads the ' +
							'last 5 messages directly, so do NOT rewrite the user request here.',
					),
			}),
		)
		.output(
			z.object({
				result: z.string(),
			}),
		)
		.suspend(planToolSuspendSchema)
		.resume(planToolResumeSchema)
		.handler(async (input: { guidance?: string }, ctx) => {
			const resumeData = ctx.resumeData;
			const isResume = resumeData !== undefined && resumeData !== null;

			// ── Same-turn denial guard ─────────────────────────────────────
			// If the user denied a plan earlier in this same message group, the
			// orchestrator must not silently spawn another planner. Without this
			// guard the LLM can ignore the "stop on denial" prompt and start a
			// fresh planner with a new accumulator, defeating the denial.
			// Only applies to first-call invocations — resume continues an
			// already-suspended planner and cannot be a fresh re-spawn.
			if (!isResume && context.plannedTaskService && context.messageGroupId) {
				const existing = await context.plannedTaskService.getGraph(context.threadId);
				if (
					existing?.status === 'cancelled' &&
					existing.messageGroupId === context.messageGroupId
				) {
					context.logger.info('plan tool blocked: user denied a plan earlier in this turn', {
						threadId: context.threadId,
						messageGroupId: context.messageGroupId,
					});
					return {
						result:
							'The user denied a plan earlier in this turn. Do not invoke the plan tool again — acknowledge briefly and wait for the next user message.',
					};
				}
			}

			if (!isResume) {
				context.trackTelemetry?.('instance_ai_workflow_build_routing', {
					thread_id: context.threadId,
					run_id: context.runId,
					route: 'planned',
					reason: input.guidance
						? 'guided_or_ambiguous_work'
						: 'complex_or_multi_artifact_work',
					has_guidance: Boolean(input.guidance),
				});
			}

			const coordinator = new PlannerRunCoordinator(context);
			try {
				const outcome =
					resumeData !== undefined && resumeData !== null
						? await coordinator.resume(resumeData)
						: await coordinator.startFirstRun(input.guidance);

				if (outcome.kind === 'lost-state') {
					return {
						result:
							'The planning step could not be resumed because its state was lost. Please send a new message to continue.',
					};
				}

				const { consumeResult } = outcome;
				if (consumeResult.status === 'suspended') {
					return await coordinator.cascadeSuspension(ctx, consumeResult);
				}

				return await coordinator.handleTerminalResult(consumeResult);
			} catch (error) {
				return await coordinator.handleError(error);
			}
		})
		.build();
}
