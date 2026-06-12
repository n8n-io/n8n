/**
 * Structured self-report the one-shot agent files via its outcome tool as the
 * final action of a run. `success` is the model's assertion about the *task*
 * (a run can finish cleanly having declined to act); `title` doubles as the
 * suggested name when the task is promoted to a workflow.
 *
 * Clients read the outcome from the `report-desktop-task-outcome` tool-call
 * event on the thread event stream; nothing is persisted server-side.
 */
export interface DesktopAssistantTaskOutcome {
	success: boolean;
	/** Short human label for the task (3–8 words), suitable as a workflow name. Plain text, no emoji. */
	title: string;
	/** One-sentence description of what was done (or why nothing was). */
	summary: string;
	/**
	 * The task's actual output, as markdown, when the deliverable is information
	 * the user asked for — a summary, an answer, extracted data. Absent for
	 * pure-action tasks whose result is a side effect on the system.
	 */
	details?: string;
	/** Single emoji that captures the task; becomes the saved workflow's icon. */
	icon?: string;
	/** Present when `success` is false — a user-readable reason. */
	failureReason?: string;
}
