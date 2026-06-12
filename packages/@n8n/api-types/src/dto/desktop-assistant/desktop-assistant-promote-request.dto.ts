import { z } from 'zod';

import { desktopAssistantDescriptionPartSchema } from './desktop-assistant-task-detail-response.dto';
import { TimeZoneSchema } from '../../schemas/timezone.schema';
import { Z } from '../../zod-class';

/**
 * Request body for `POST /desktop-assistant/promote-thread` — materialises
 * an Instance AI thread into a real, editable workflow via the workflow
 * builder. Idempotent on the thread metadata (`promotedWorkflowId`).
 */
export class DesktopAssistantPromoteRequestDto extends Z.class({
	threadId: z.string().trim().min(1),
	name: z.string().trim().min(1).max(128).optional(),
	/** Single emoji shown as the saved task's icon (stored on workflow meta, not in the name). */
	icon: z.string().trim().min(1).max(16).optional(),
	/**
	 * Final segmented description as the user configured it in the draft view
	 * ("Set it up" on a proposed task plan). Self-contained: param parts carry
	 * the user's final values, so the server never reads the plan from thread
	 * metadata. Grounds the build and seeds the new workflow's detail cache.
	 * Absent for the classic executed-thread promote. Ignored on idempotent
	 * re-promotes: the first promote's parts ground the build.
	 */
	configuredParts: z
		.array(desktopAssistantDescriptionPartSchema)
		.min(1)
		.max(60)
		.optional()
		.refine(
			(parts) => {
				if (!parts) return true;
				const ids = parts.filter((part) => part.kind === 'param').map((part) => part.id);
				return new Set(ids).size === ids.length;
			},
			{ message: 'param part ids must be unique' },
		),
	/** The plan's minutes-saved estimate; stored as the workflow's `timeSavedPerExecution` setting. */
	estimatedMinutesSaved: z.number().positive().max(100_000).optional(),
	/**
	 * The requester's IANA time zone, pinned as the new workflow's
	 * `settings.timezone` so schedule triggers fire in the user's local time
	 * instead of the instance default (`GENERIC_TIMEZONE`, which defaults to
	 * America/New_York). Lenient: an invalid value is dropped, never failing
	 * the promote.
	 */
	timeZone: TimeZoneSchema,
}) {}

export type DesktopAssistantPromoteRequest = z.infer<
	typeof DesktopAssistantPromoteRequestDto.schema
>;

export type DesktopAssistantPromoteResponse =
	| {
			/** A build run is underway (just kicked off, or still running from an
			 * earlier promote). The desktop client watches the run on the thread's
			 * SSE stream and re-sends the promote request after `run-finish`; that
			 * confirming call finalizes the workflow the run reported and returns
			 * `done` — or `failed` when the run ended without reporting one. */
			status: 'building';
			threadId: string;
			runId: string;
	  }
	| {
			/** A promote produced a workflow: either finalized just now from the
			 * build run's completion report, or an idempotent hit on an earlier
			 * promote. The desktop client can deep-link to the workflow directly. */
			status: 'done';
			threadId: string;
			workflowId: string;
	  }
	| {
			/** The recorded build run ended without producing a working workflow.
			 * `reason` carries the run's self-reported, user-readable failure
			 * reason when it filed one. The run marker is cleared, so a later
			 * promote request starts a fresh build. */
			status: 'failed';
			threadId: string;
			reason?: string;
	  };
