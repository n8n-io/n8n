/**
 * One segment of the natural-language description of a task shown in the
 * desktop assistant's task detail view. `text` parts are static prose;
 * `param` parts are user-tweakable values (a schedule, a service, a folder…)
 * rendered emphasized in read mode and as an inline dropdown in edit mode.
 */
export type DesktopAssistantDescriptionPart =
	| { kind: 'text'; text: string }
	| {
			kind: 'param';
			/** Stable within one generated description; used to reference edits. */
			id: string;
			value: string;
			/** Alternatives offered in the dropdown (excluding `value`). */
			options: string[];
	  };

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
