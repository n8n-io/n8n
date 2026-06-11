/**
 * Plan proposal filed by desktop one-shot runs that imply a non-manual trigger
 * (a schedule or an event), instead of executing the task. The desktop client
 * reads the normalized plan straight from this tool-result event on the thread
 * event stream and renders the draft view; the plan is also persisted on the
 * thread metadata best-effort, for recovery only — the promote request's
 * configured parts are the source of truth for what gets built.
 */
import { Tool } from '@n8n/agents';
import type { DesktopAssistantTaskPlan } from '@n8n/api-types';
import { desktopAssistantTaskPlanTriggerKinds } from '@n8n/api-types';
import { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import { normalizeDescriptionParts } from '../../desktop-assistant/description-parts';
import { patchThread, type PatchableThreadMemory } from '../../storage/thread-patch';

/** Thread-metadata key the proposed plan is persisted under. */
export const TASK_PLAN_METADATA_KEY = 'desktopAssistantTaskPlan';

const inputSchema = sanitizeInputSchema(
	z.object({
		title: z
			.string()
			.describe(
				'Short human label naming the task as a repeatable action, 3-8 words, present tense ("Send weekly sales digest"), suitable as a workflow name. Plain text — no emoji',
			),
		icon: z
			.string()
			.optional()
			.describe('A single emoji that captures the task, e.g. "🍌". No text, just the emoji'),
		parts: z
			.array(
				z.object({
					kind: z
						.enum(['text', 'param'])
						.describe('"text" for static prose, "param" for a tweakable concrete value'),
					text: z
						.string()
						.optional()
						.describe(
							'For text parts: the static prose. Carries ALL spacing and punctuation — param values have no surrounding spaces',
						),
					value: z
						.string()
						.optional()
						.describe(
							'For param parts: the concrete value the user may want to tweak — a schedule ("every Friday at 9am"), a service (Gmail, Slack), a folder. Short, 1-4 words',
						),
					options: z
						.array(z.string())
						.optional()
						.describe(
							'For param parts: 2-3 realistic alternatives the user could switch to (do not repeat the current value)',
						),
				}),
			)
			.describe(
				'Segmented one-sentence description of the planned task. Concatenated parts must read as one fluent sentence describing the user\'s intent, not mechanics — e.g. text "Send me a short news brief " + param "every weekday morning" + text ".". Never mention nodes, triggers, or n8n internals. Mark as params ONLY clearly tweakable concrete values; at most 4 params, prefer fewer',
			),
		trigger: z
			.enum(desktopAssistantTaskPlanTriggerKinds)
			.describe(
				'What starts the task: "schedule" for time-based recurrence, "webhook" for incoming events, "poll" for watching a service for changes',
			),
		connectionsNeeded: z
			.array(z.string())
			.max(10)
			.describe(
				'n8n credential type names the task will need, e.g. "gmailOAuth2", "slackOAuth2Api". Empty array when none',
			),
		estimatedMinutesSaved: z
			.number()
			.positive()
			.optional()
			.describe('Minutes of manual work one run of the task saves, when estimable'),
	}),
);

export function createProposeTaskPlanTool(deps: { memory?: PatchableThreadMemory }) {
	return new Tool('propose-task-plan')
		.description(
			'Propose a task plan instead of executing, for requests that imply a non-manual trigger (a schedule/recurrence or reacting to events). Call exactly once, as the first and only tool call of the run, then end the run — never call another tool after it.',
		)
		.input(inputSchema)
		.handler(async (input, ctx) => {
			const parts = normalizeDescriptionParts(input.parts);
			if (parts.length === 0) {
				return 'Error: the plan description was empty after normalization. Retry with real "parts" — text parts carrying the prose and at most 4 param parts with concrete values.';
			}

			const plan: DesktopAssistantTaskPlan = {
				title: input.title.trim(),
				...(input.icon?.trim() ? { icon: input.icon.trim() } : {}),
				parts,
				trigger: input.trigger,
				connectionsNeeded: input.connectionsNeeded,
				...(input.estimatedMinutesSaved !== undefined
					? { estimatedMinutesSaved: input.estimatedMinutesSaved }
					: {}),
			};

			// Best-effort persistence for recovery; the client reads the plan from
			// the tool-result event, so a failed write must never fail the call.
			const threadId = ctx.persistence?.threadId;
			if (deps.memory && threadId) {
				try {
					await patchThread(deps.memory, {
						threadId,
						update: ({ metadata = {} }) => ({
							metadata: {
								...metadata,
								[TASK_PLAN_METADATA_KEY]: {
									runId: ctx.runId,
									proposedAt: new Date().toISOString(),
									plan,
								},
							},
						}),
					});
				} catch {
					// intentional: plan persistence is advisory
				}
			}

			return {
				result:
					'Plan recorded. End the run now — do not call report-desktop-task-outcome or any other tool.',
				plan,
			};
		})
		.build();
}
