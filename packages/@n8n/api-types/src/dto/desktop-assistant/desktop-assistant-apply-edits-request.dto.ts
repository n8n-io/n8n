import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Request body for `POST /desktop-assistant/tasks/:workflowId/edits` — applies
 * the user's chip edits from the task detail view to the real workflow via an
 * Instance AI run. Each change references a `param` part of the currently
 * displayed description by id and carries the displayed (`from`) and chosen
 * (`to`) values so the edit instruction is self-contained.
 */
export class DesktopAssistantApplyEditsRequestDto extends Z.class({
	changes: z
		.array(
			z.object({
				paramId: z.string().trim().min(1).max(64),
				from: z.string().trim().min(1).max(500),
				to: z.string().trim().min(1).max(500),
			}),
		)
		.min(1)
		.max(20),
}) {}

export type DesktopAssistantApplyEditsRequest = z.infer<
	typeof DesktopAssistantApplyEditsRequestDto.schema
>;

export interface DesktopAssistantApplyEditsResponse {
	threadId: string;
	runId: string;
}
