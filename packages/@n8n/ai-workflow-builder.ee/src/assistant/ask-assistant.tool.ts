import { z } from 'zod';

/**
 * Schema-only tool definition for the `ask_assistant` tool.
 * Used by `TriageAgent` with `llm.bindTools()` — not a full LangChain tool.
 * The triage agent dispatches execution via `executeTool()`.
 */
export const ASK_ASSISTANT_TOOL = {
	name: 'ask_assistant',
	description:
		'Ask the n8n assistant a question. Use this when the user needs help understanding n8n concepts, troubleshooting node errors, debugging workflow executions, setting up credentials, or asking "how does X work?" questions. Do NOT use this for requests to create, modify, or build workflows.',
	schema: z.object({
		query: z.string().describe('The user question to send to the assistant'),
	}),
};
