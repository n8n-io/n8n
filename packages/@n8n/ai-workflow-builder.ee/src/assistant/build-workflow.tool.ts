import { z } from 'zod';

/**
 * Schema-only tool definition for the `build_workflow` tool.
 * Used by `TriageAgent` with `llm.bindTools()` — not a full LangChain tool.
 * The triage agent dispatches execution via `executeTool()`.
 */
export const BUILD_WORKFLOW_TOOL = {
	name: 'build_workflow',
	description:
		'Build or modify an n8n workflow. Use this when the user wants to create a new workflow, add or remove nodes, change connections, or modify an existing workflow. Do NOT use this for help questions, debugging, or credential setup.',
	schema: z.object({
		instructions: z.string().describe('Clear instructions for what to build or modify'),
	}),
};
