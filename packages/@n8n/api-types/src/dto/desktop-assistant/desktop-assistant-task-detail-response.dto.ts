import { z } from 'zod';

/**
 * One segment of the natural-language description of a task shown in the
 * desktop assistant's task detail view. `text` parts are static prose;
 * `param` parts are user-tweakable values (a schedule, a service, a folder…)
 * rendered emphasized in read mode and as an inline dropdown in edit mode.
 *
 * `param.id` is stable within one generated description and is used to
 * reference edits; `param.options` are the alternatives offered in the
 * dropdown (excluding `value`).
 */
export const desktopAssistantDescriptionPartSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('text'),
		text: z.string().min(1).max(500),
	}),
	z.object({
		kind: z.literal('param'),
		id: z.string().trim().min(1).max(64),
		value: z.string().trim().min(1).max(500),
		options: z.array(z.string().trim().min(1).max(500)).max(8),
	}),
]);

export type DesktopAssistantDescriptionPart = z.infer<typeof desktopAssistantDescriptionPartSchema>;

/**
 * Response shape for `GET /desktop-assistant/tasks/:workflowId/detail`.
 * The description is LLM-generated from the workflow JSON and cached in the
 * workflow's meta until `versionId` changes.
 */
export interface DesktopAssistantTaskDetailResponse {
	workflowId: string;
	/** Workflow version the description was generated from. */
	versionId: string;
	parts: DesktopAssistantDescriptionPart[];
	/** Credential types still missing for the workflow to run, in node order. */
	connectionsNeeded: Array<{ credentialType: string; displayName: string }>;
}
