import { z } from 'zod';

const PART_VALUE_MAX_LENGTH = 500;
/** Cap on a param's dropdown alternatives, shared with the normalizer in
 *  `@n8n/instance-ai` so it can't drift from the schema. */
export const DESKTOP_ASSISTANT_PART_MAX_OPTIONS = 8;

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
		text: z.string().min(1).max(PART_VALUE_MAX_LENGTH),
	}),
	z.object({
		kind: z.literal('param'),
		id: z.string().trim().min(1).max(64),
		value: z.string().trim().min(1).max(PART_VALUE_MAX_LENGTH),
		options: z
			.array(z.string().trim().min(1).max(PART_VALUE_MAX_LENGTH))
			.max(DESKTOP_ASSISTANT_PART_MAX_OPTIONS),
	}),
]);

export type DesktopAssistantDescriptionPart = z.infer<typeof desktopAssistantDescriptionPartSchema>;

/**
 * Response shape for `GET /desktop-assistant/tasks/:workflowId/detail`.
 * The description is stored on the workflow's meta at creation (the configured
 * plan for draft-built tasks, generated once otherwise) and kept in sync when
 * edits are applied — reading it is never a long-running call.
 */
export interface DesktopAssistantTaskDetailResponse {
	workflowId: string;
	/** Current workflow version; bumps when an edit run changes the workflow. */
	versionId: string;
	parts: DesktopAssistantDescriptionPart[];
	/** Credential types still missing for the workflow to run, in node order. */
	connectionsNeeded: Array<{ credentialType: string; displayName: string }>;
	/** The workflow's `timeSavedPerExecution` setting; absent when unset. */
	timeSavedMin?: number;
}
