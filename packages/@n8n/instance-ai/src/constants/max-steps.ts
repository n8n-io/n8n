/**
 * Maximum LLM steps (inference rounds) for each agent role.
 *
 * Native agent iteration limits for each role. Each agent sets its own limit
 * based on task complexity.
 */
export const MAX_STEPS = {
	/** Main orchestrator — coordinates all other agents and handles direct tool calls. */
	ORCHESTRATOR: 100,
	/** Browser automation sub-agent — needs many steps for multi-page flows. */
	BROWSER: 300,
	/** Eval setup sub-agent — reads workflow, creates DataTable, patches eval nodes + validates. */
	EVAL_SETUP: 30,
	/** Planning sub-agent — breaks down multi-step tasks. */
	PLANNER: 30,
	/** Research sub-agent — web search and synthesis. */
	RESEARCH: 25,
	/** Generic delegate fallback when no specific limit is configured. */
	DELEGATE_FALLBACK: 10,
} as const;
