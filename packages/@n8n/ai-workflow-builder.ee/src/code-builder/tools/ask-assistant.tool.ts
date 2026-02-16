import { z } from 'zod';

/**
 * Schema-only tool definition for the `ask_assistant` tool.
 * Used by `TriageAgent` with `llm.bindTools()` — not a full LangChain tool.
 * The triage agent dispatches execution via `executeTool()`.
 */
export const ASK_ASSISTANT_TOOL = {
	name: 'ask_assistant',
	description:
		'Ask the n8n assistant a question. Use this when the user needs help understanding n8n concepts, learning how something works, getting guidance on setting up credentials, or diagnosing workflow errors. After diagnosis, use build_workflow to apply any needed fix.',
	schema: z.object({
		query: z.string().describe('The user question to send to the assistant'),
	}),
};
