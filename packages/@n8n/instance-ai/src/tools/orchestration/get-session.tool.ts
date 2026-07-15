/**
 * get-session — read-only orchestration tool that returns the transcript of the
 * agent-preview session referenced in this Instance AI thread.
 *
 * The agent-preview handoff injects only a *reference* block into the prompt
 * (not the transcript). The orchestrator calls this tool to read the transcript
 * on demand, so it can review or assess the agent's behavior without modifying
 * it. Edits go through `build-agent`, which the orchestrator must only call when
 * the user explicitly asks to update/improve the agent.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

const getSessionInputSchema = z.object({
	executionId: z
		.string()
		.optional()
		.describe('Scope the transcript to a single turn (execution). Omit for the whole session.'),
});

const getSessionOutputSchema = z.object({
	ok: z.boolean(),
	title: z.string().optional(),
	sessionNumber: z.number().optional(),
	transcript: z.string().optional(),
	error: z.string().optional(),
});

type GetSessionOutput = z.infer<typeof getSessionOutputSchema>;

export function createGetSessionTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.GET_SESSION)
		.description(
			'Read the full transcript of the agent-preview session referenced in this thread. ' +
				'Use it to review or assess the agent before answering. Does NOT modify the agent — ' +
				'call build-agent only when the user explicitly asks to edit the agent.',
		)
		.input(getSessionInputSchema)
		.output(getSessionOutputSchema)
		.handler(async (input: z.infer<typeof getSessionInputSchema>): Promise<GetSessionOutput> => {
			const domain = context.domainContext;
			const ref = domain?.agentPreviewSession;
			if (!ref || !domain?.resolvePreviewSession) {
				return { ok: false, error: 'No preview session is referenced in this conversation.' };
			}

			const scoped = input.executionId ? { ...ref, executionId: input.executionId } : ref;
			const result = await domain.resolvePreviewSession(scoped);
			if (!result) {
				return { ok: false, error: 'Preview session not found.' };
			}

			return { ok: true, ...result };
		})
		.build();
}
