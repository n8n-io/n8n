import { getPathAsRegexPattern } from '@/utils/routeUtils';

export const projectsBaseRoute = '/projects';
export const projectsRoute = `${projectsBaseRoute}/:projectId`;

export const oldRoutesToRedirectToProjects = [
	'/credentials',
	'/workflows',
	'/workflow',
	'/workflow/new',
	'/workflow/:name/debug/:executionId',
	'/workflow/:name/executions',
	'/workflow/:name/executions/:executionId',
	'/workflow/:workflowId/history/:versionId?',
	'/workflows/templates/:id',
];

export const oldRoutesAsRegExps = oldRoutesToRedirectToProjects.map(getPathAsRegexPattern);
