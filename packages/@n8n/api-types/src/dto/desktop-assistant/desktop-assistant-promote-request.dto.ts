import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Request body for `POST /desktop-assistant/promote-thread` — materialises
 * an Instance AI thread into a real, editable workflow via the workflow
 * builder. Idempotent on the thread metadata (`promotedWorkflowId`).
 */
export class DesktopAssistantPromoteRequestDto extends Z.class({
	threadId: z.string().trim().min(1),
	name: z.string().trim().min(1).max(128).optional(),
}) {}

export type DesktopAssistantPromoteRequest = z.infer<
	typeof DesktopAssistantPromoteRequestDto.schema
>;

export type DesktopAssistantPromoteResponse =
	| {
			/** First-time promote: a build run was kicked off. The desktop client
			 * subscribes to `/instance-ai/events/:threadId` and waits for the
			 * workflow.created signal carried on that SSE stream. */
			status: 'building';
			threadId: string;
			runId: string;
	  }
	| {
			/** Idempotent hit: a previous promote already produced a workflow
			 * for this thread and the workflow is still accessible to the
			 * caller. The desktop client can deep-link to the workflow directly. */
			status: 'done';
			threadId: string;
			workflowId: string;
	  };
