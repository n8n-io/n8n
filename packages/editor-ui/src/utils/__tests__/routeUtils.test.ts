import { getPathAsRegexPattern } from '../routeUtils';

const routes = [
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

const routesAsRegExps = routes.map(getPathAsRegexPattern);

test('should match the routes', () => {
	expect(routesAsRegExps).toMatchSnapshot();
});
