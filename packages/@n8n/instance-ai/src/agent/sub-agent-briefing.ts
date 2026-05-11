import { formatPreviousAttempts, type IterationLog } from '../storage/iteration-log';

// ── Types ───────────────────────────────────────────────────────────────────

export interface RunningTaskSummary {
	taskId: string;
	role: string;
	goal?: string;
}

export interface SubAgentBriefingInput {
	/** The core task description. */
	task: string;
	/** Brief summary of the conversation so far. */
	conversationContext?: string;
	/** Structured artifacts (IDs, data). */
	artifacts?: Record<string, unknown>;
	/** Additional context blocks (e.g., sandbox instructions, workflowId notes). */
	additionalContext?: string;
	/** Requirements block (e.g., DETACHED_BUILDER_REQUIREMENTS). */
	requirements?: string;
	/** Iteration log + task key for retry context. */
	iteration?: {
		log: IterationLog;
		threadId: string;
		taskKey: string;
	};
	/** Currently running background tasks in this thread. */
	runningTasks?: RunningTaskSummary[];
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build a structured XML-formatted briefing for a sub-agent.
 *
 * All sub-agent spawn sites (delegate, builder, research, data-table) use this
 * instead of ad-hoc string concatenation. The XML structure gives the LLM
 * clear section boundaries and makes the briefing parseable.
 */
export async function buildSubAgentBriefing(input: SubAgentBriefingInput): Promise<string> {
	const parts: string[] = [];

	// Core task — always present
	parts.push(`<task>\n${input.task}\n</task>`);

	// Conversation context — what the user discussed, decisions made
	if (input.conversationContext) {
		parts.push(`<conversation-context>\n${input.conversationContext}\n</conversation-context>`);
	}

	// Structured artifacts — IDs, data, references
	if (input.artifacts && Object.keys(input.artifacts).length > 0) {
		parts.push(`<artifacts>\n${JSON.stringify(input.artifacts)}\n</artifacts>`);
	}

	// Additional context — sandbox paths, workflowId notes, etc.
	if (input.additionalContext) {
		parts.push(input.additionalContext);
	}

	// Requirements block — e.g., DETACHED_BUILDER_REQUIREMENTS
	if (input.requirements) {
		parts.push(input.requirements);
	}

	// Thread state — what else is happening in parallel
	if (input.runningTasks && input.runningTasks.length > 0) {
		const taskLines = input.runningTasks
			.map(
				(t) =>
					`  <running-task taskId="${t.taskId}" role="${t.role}">${t.goal ?? ''}</running-task>`,
			)
			.join('\n');
		parts.push(`<thread-state>\n${taskLines}\n</thread-state>`);
	}

	// Iteration context — previous attempt history
	if (input.iteration) {
		try {
			const entries = await input.iteration.log.getForTask(
				input.iteration.threadId,
				input.iteration.taskKey,
			);
			const formatted = formatPreviousAttempts(entries);
			if (formatted) {
				parts.push(formatted);
			}
		} catch {
			// Non-fatal — iteration log is best-effort
		}
	}

	return parts.join('\n\n');
}
