// `VIEWS` moved to `@n8n/stores/views` so package-level stores can key state by
// view without an app back-dependency. Re-exported here for existing importers.
import { VIEWS } from '@n8n/stores/views';

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
