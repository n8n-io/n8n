import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Query for `GET /desktop-assistant/task-run/events` — the desktop client's
 * realtime view of a single one-shot or promote run, translated by the BFF
 * into the small event vocabulary below so the client never consumes the raw
 * Instance AI streaming protocol.
 */
export class DesktopAssistantTaskRunQueryDto extends Z.class({
	threadId: z.string().trim().min(1),
	runId: z.string().trim().min(1),
}) {}

export type DesktopAssistantTaskRunQuery = z.infer<typeof DesktopAssistantTaskRunQueryDto.schema>;

/**
 * Structured self-report the one-shot agent files via its outcome tool as the
 * final action of a run. `success` is the model's assertion about the *task*
 * (a run can finish cleanly having declined to act); `title` doubles as the
 * suggested name when the task is promoted to a workflow.
 */
export interface DesktopAssistantTaskOutcome {
	success: boolean;
	/** Short human label for the task (3–8 words), suitable as a workflow name. */
	title: string;
	/** One-sentence description of what was done (or why nothing was). */
	summary: string;
	/** Present when `success` is false — a user-readable reason. */
	failureReason?: string;
}

export type DesktopAssistantTaskRunStatus = 'success' | 'error' | 'canceled';

/**
 * Events on the `GET /desktop-assistant/task-run/events` SSE stream.
 * `acting` fires once, on the run's first tool call. `finished` is terminal —
 * the server emits it and closes the stream.
 */
export type DesktopAssistantTaskRunEvent =
	| { type: 'acting' }
	| {
			type: 'finished';
			status: DesktopAssistantTaskRunStatus;
			/** Whether the run made any tool calls (fallback signal when the agent skipped its outcome report). */
			tookAction: boolean;
			outcome?: DesktopAssistantTaskOutcome;
			/** Set when this was a promote run that produced a workflow. */
			workflowId?: string;
	  };
