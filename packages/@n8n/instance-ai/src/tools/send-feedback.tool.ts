import { Tool } from '@n8n/agents';
import {
	INSTANCE_AI_AGENT_FEEDBACK_CATEGORIES,
	INSTANCE_AI_AGENT_FEEDBACK_SEVERITIES,
} from '@n8n/api-types';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

/** One run can send a few distinct problems, but a loop must not flood the team. */
const MAX_REPORTS_PER_RUN = 3;

export const SEND_FEEDBACK_DESCRIPTION =
	'Sends a short report to the n8n team when you are not sure how to do something, a tool or n8n behaves wrong, or n8n cannot do what the user needs. ' +
	'No one replies. After you call it, continue: use your best attempt, or tell the user what blocks you. ' +
	'Do not call it for errors you can fix yourself, such as a validation error that names the fix, or for questions to the user. Use `ask_user` for those. ' +
	'Call it at most once for each problem.';

const inputSchema = z.object({
	category: z
		.enum(INSTANCE_AI_AGENT_FEEDBACK_CATEGORIES)
		.describe(
			'unsure = no source tells you how to do this. bug = a tool or n8n behaved wrong. missing_capability = n8n or a tool cannot do what the user needs. confusing_tool = a tool description or result misled you.',
		),
	severity: z
		.enum(INSTANCE_AI_AGENT_FEEDBACK_SEVERITIES)
		.describe(
			'blocked = you cannot complete the task. workaround = you continued another way. minor = small friction.',
		),
	summary: z
		.string()
		.min(1)
		.describe(
			'One to three sentences: the goal, what you tried, and where you got stuck. Do not include credentials, personal data, or data copied from the user.',
		),
	toolName: z.string().optional().describe('The tool that the report is about, if any'),
});

const outputSchema = z.object({ ok: z.boolean(), message: z.string() });

const SENT_MESSAGE =
	'Recorded for the n8n team. No reply will come. Continue the task, or tell the user what blocks you.';
const CAPPED_MESSAGE =
	'Feedback is already recorded for this turn. No reply will come. Do not send more feedback in this turn. Continue the task.';

export function createSendFeedbackTool(context: InstanceAiContext) {
	// Counts the reports of one agent build. A resume rebuilds the agent and starts a new
	// count, but a resume needs a user answer, so the cap still stops a loop from flooding.
	let reportsSent = 0;

	return new Tool(DOMAIN_TOOL_IDS.SEND_FEEDBACK)
		.description(SEND_FEEDBACK_DESCRIPTION)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async (input) => {
			if (reportsSent >= MAX_REPORTS_PER_RUN) return { ok: true, message: CAPPED_MESSAGE };
			reportsSent++;

			try {
				// The full summary goes to the host, which redacts it and then cuts it.
				// Cutting here first could split a secret so that redaction misses it.
				context.agentFeedbackService?.send({
					...input,
					threadId: context.threadId,
					runId: context.runId,
				});
			} catch (error) {
				// Best effort: a failed report must not change what the agent does next.
				context.logger.warn('Failed to send agent feedback', {
					error: error instanceof Error ? error.message : String(error),
				});
			}

			return { ok: true, message: SENT_MESSAGE };
		})
		.build();
}
