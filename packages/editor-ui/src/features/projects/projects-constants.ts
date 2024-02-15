export const projectsBaseRoute = '/projects';
export const projectsRoute = `${projectsBaseRoute}/:projectId`;

export const oldRoutesToRedirectToProjects = [
	'/credentials',
	'/workflows',
	'/workflow',
	'/workflow/new',
	'/workflow/:name/debug/:executionId',
	'/workflow/:name/executions',
	'/workflow/:workflowId/history/:versionId?',
	'/workflows/templates/:id',
];
