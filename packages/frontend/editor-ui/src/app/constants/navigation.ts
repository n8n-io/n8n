// `VIEWS` moved to `@n8n/frontend-constants/views` so package-level code can key
// state by view without an app back-dependency. Re-exported here for existing importers.
import { VIEWS } from '@n8n/frontend-constants/views';

export { VIEWS };

export const EDITABLE_CANVAS_VIEWS = [VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW, VIEWS.EXECUTION_DEBUG];

export const enum MAIN_HEADER_TABS {
	WORKFLOW = 'workflow',
	EXECUTIONS = 'executions',
	SETTINGS = 'settings',
	EVALUATION = 'evaluation',
}

/** Query parameter value used to deep-link to the publish timeline tab in workflow history */
export const WORKFLOW_HISTORY_PUBLISH_TIMELINE_TAB = 'publishTimeline';
