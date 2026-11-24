import { z } from 'zod';

/**
 * Schema-only tool definition for the `build_workflow` tool.
 * Used by `TriageAgent` with `llm.bindTools()` — not a full LangChain tool.
 * The triage agent dispatches execution via `executeTool()`.
 */
export const BUILD_WORKFLOW_TOOL = {
	name: 'build_workflow',
	description:
		'Build or modify an n8n workflow. Use this when the user wants to create, modify, configure, ' +
		'fix, or set up a workflow. This includes adding/removing nodes, changing connections, ' +
		'configuring node parameters, setting up credentials on nodes, fixing workflow issues, ' +
		'or any action request on the workflow. ' +
		'IMPORTANT: "fix this", "make it work", "set up X", "help me configure" are all action requests — use this tool.',
	schema: z.object({
		instructions: z.string().describe('Clear instructions for what to build or modify'),
	}),
};
