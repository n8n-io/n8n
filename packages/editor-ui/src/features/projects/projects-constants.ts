export const projectsBaseRoute = '/projects';
export const projectsRoute = `${projectsBaseRoute}/:projectId`;

export const oldRoutesToProjectMap = {
	'/credentials': `${projectsRoute}/credentials`,
	'/workflows': `${projectsRoute}/workflows`,
	'/workflow': `${projectsRoute}/workflow/new`,
	'/workflow/new': `${projectsRoute}/workflow/new`,
	'/workflow/:name/debug/:executionId': `${projectsRoute}/workflow/:name/debug/:executionId`,
	'/workflow/:name/executions': `${projectsRoute}/workflow/:name/executions`,
	'/workflow/:workflowId/history/:versionId?': `${projectsRoute}/workflow/:workflowId/history/:versionId?`,
};
