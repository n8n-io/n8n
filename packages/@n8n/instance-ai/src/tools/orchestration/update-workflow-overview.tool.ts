/**
 * update-workflow-overview — publishes the three-pane plan abstraction
 * (Triggers / Steps / Results) rendered as a read-only panel in the chat UI.
 *
 * PoC scope: single workflow per thread, replace-on-update semantics, no
 * dedicated storage — the event is durable (persisted + replayed) and the
 * shared agent-run reducer folds it into agent-tree snapshots.
 */
import { Tool } from '@n8n/agents';
import { workflowOverviewSchema } from '@n8n/api-types';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

const inputSchema = z.object({
	triggers: workflowOverviewSchema.shape.triggers.describe(
		'What sets the workflow off, and when/how often — plan tense, one short sentence in the ' +
			'user\'s conversation language (e.g. "Runs every Monday at 9:00", "When someone submits ' +
			'the intake form"). Empty string when not known yet.',
	),
	steps: workflowOverviewSchema.shape.steps.describe(
		'One plain sentence saying what happens in between — no node names or technical jargon. ' +
			'Empty string when not known yet.',
	),
	results: workflowOverviewSchema.shape.results.describe(
		'What the user ends up with, described concretely (e.g. "An email to the person who ' +
			'filled in the form", "A new row in the Leads sheet"). Empty string when not known yet.',
	),
});

const outputSchema = z.object({
	result: z.string(),
});

export function createUpdateWorkflowOverviewTool(context: OrchestrationContext) {
	return new Tool('update-workflow-overview')
		.description(
			'Update the read-only workflow overview panel the user sees while a single workflow is ' +
				'being planned: Triggers (what sets it off), Steps (what happens in between), Results ' +
				'(what the user ends up with). Call it once the planned workflow shape is clear — before ' +
				'the first build-workflow call — and again whenever the plan materially changes a pane ' +
				'(user iteration, an ask-user answer, or a requested edit to an existing workflow). ' +
				'Send the full overview each time; it replaces the previous one. Do NOT call it while a ' +
				'build is in progress (after build-workflow has been called this turn), during ' +
				'repair/verification/setup turns, when nothing changed, or for multi-workflow plans. ' +
				'This tool only updates the panel — it does not create or modify any workflow.',
		)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async (input: z.infer<typeof inputSchema>) => {
			context.eventBus.publish(context.threadId, {
				type: 'workflow-overview-update',
				runId: context.runId,
				agentId: context.orchestratorAgentId,
				payload: {
					overview: {
						triggers: input.triggers,
						steps: input.steps,
						results: input.results,
					},
				},
			});
			return await Promise.resolve({
				result:
					'Workflow overview updated. Continue with the task; do not repeat the overview as text.',
			});
		})
		.build();
}
