import { publicApiRouteKey } from '../shared/public-api-scope-lookup';

describe('publicApiRouteKey', () => {
	test.each([
		['GET', '/workflows/{id}/history', 'get /workflows/{}/history'],
		['GET', '/workflows/:workflowId/history', 'get /workflows/{}/history'],
		['Post', '/tags/', 'post /tags'],
		['get', '/', 'get /'],
		['GET', '', 'get /'],
		['PATCH', '/workflows//{id}//versions', 'patch /workflows/{}/versions'],
	])('normalizes %s %s', (method, pathStr, expected) => {
		expect(publicApiRouteKey(method, pathStr)).toBe(expected);
	});

	test('OpenAPI and Express param styles produce the same key', () => {
		expect(publicApiRouteKey('GET', '/workflows/{id}/history')).toBe(
			publicApiRouteKey('GET', '/workflows/:workflowId/history'),
		);
	});
});
