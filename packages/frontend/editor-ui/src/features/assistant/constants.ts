import { EDITABLE_CANVAS_VIEWS, VIEWS } from '@/constants';

/**
 * Views where the Assistant chat panel can be shown
 */
export const ASSISTANT_ENABLED_VIEWS = [
	...EDITABLE_CANVAS_VIEWS,
	VIEWS.EXECUTION_PREVIEW,
	VIEWS.WORKFLOWS,
	VIEWS.CREDENTIALS,
	VIEWS.PROJECTS_CREDENTIALS,
	VIEWS.PROJECTS_WORKFLOWS,
	VIEWS.PROJECT_SETTINGS,
	VIEWS.TEMPLATE_SETUP,
];

/**
 * Views where the Builder chat panel can be shown
 */
export const BUILDER_ENABLED_VIEWS = [...EDITABLE_CANVAS_VIEWS];
