/**
 * Maximum LLM steps (inference rounds) for each agent role.
 *
 * Native agent iteration limits for each role. Each agent sets its own limit
 * based on task complexity.
 */
export const MAX_STEPS = {
	/** Main orchestrator — coordinates tools and planned-task follow-ups. */
	ORCHESTRATOR: 100,
	/** Legacy limit retained for compatibility; browser work runs in the orchestrator. */
	BROWSER: 300,
	/** Legacy limit retained for compatibility; workflow builds run in the orchestrator. */
	BUILDER: 60,
	/** Eval setup background agent — patches eval nodes into an existing workflow. */
	EVAL_SETUP: 30,
	/** Legacy limit retained for compatibility; research runs in the orchestrator. */
	RESEARCH: 25,
} as const;
