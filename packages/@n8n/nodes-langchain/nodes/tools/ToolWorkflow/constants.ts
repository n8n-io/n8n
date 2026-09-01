import type { IDataObject } from 'n8n-workflow';

/**
 * Tool observation returned when the sub-workflow parked in a waiting state (e.g. HITL
 * approval). On the in-process agent paths (v1/v2 `supplyData`) this value goes straight
 * to the LLM while the parent parks, so it must be self-describing: a bare `{}` reads as
 * "the workflow returned nothing", which invites a wrong final answer or a duplicate tool
 * call (spawning a second child execution and approval message). On the v3 engine path the
 * model never sees it — the parked run is re-run with the child's real output on resume.
 */
export const SUB_WORKFLOW_WAITING_PLACEHOLDER: IDataObject = {
	status:
		'Sub-workflow is waiting for a human response; this run will resume automatically with the result. Do not call this tool again.',
};
