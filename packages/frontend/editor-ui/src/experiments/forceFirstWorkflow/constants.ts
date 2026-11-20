/** Persisted in the user's `dismissedCallouts` once the user publishes or skips. Never prompt again. */
export const FORCE_FIRST_WORKFLOW_FINISHED_CALLOUT = '151_force_first_workflow_finished';

/** Only new accounts see the flow. Same window as the ready-to-run workflows experiment. */
export const FORCE_FIRST_WORKFLOW_NEW_USER_DAYS = 14;

export const FORCE_FIRST_WORKFLOW_ROUTE = '/get-started';
export const FORCE_FIRST_WORKFLOW_ROUTE_NAME = 'ForceFirstWorkflow';

/** The canvas reads these from the route: no zoom controls, and the dotted background. */
export const FORCE_FIRST_WORKFLOW_QUERY = {
	hideControls: 'true',
	canvasBackground: 'dots',
} as const;

export const FORCE_FIRST_WORKFLOW_STEPS = [
	'summary',
	'schedule',
	'email',
	'connect',
	'test',
	'publish',
] as const;

export type ForceFirstWorkflowStep = (typeof FORCE_FIRST_WORKFLOW_STEPS)[number];
