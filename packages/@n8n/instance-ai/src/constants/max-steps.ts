/**
 * Maximum LLM steps (inference rounds) for each agent role.
 *
 * Mastra's Agent.stream() defaults to stepCountIs(5) which is too low
 * for most use cases. Each agent sets its own limit based on task complexity.
 *
 * @see https://github.com/mastra-ai/mastra/issues/2930
 */
export const MAX_STEPS = {
	/** Main orchestrator — coordinates all other agents and handles direct tool calls. */
	ORCHESTRATOR: 60,
	/** Browser automation sub-agent — needs many steps for multi-page flows. */
	BROWSER: 300,
	/** Workflow builder sub-agent — complex multi-tool build/verify loops. */
	BUILDER: 60,
	/** Data table management sub-agent. */
	DATA_TABLE: 35,
	/** Planning sub-agent — breaks down multi-step tasks. */
	PLANNER: 30,
	/** Research sub-agent — web search and synthesis. */
	RESEARCH: 25,
	/** Generic delegate fallback when no specific limit is configured. */
	DELEGATE_FALLBACK: 10,
} as const;
