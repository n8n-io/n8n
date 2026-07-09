import { ResourceLocatorRequestDto } from '../resource-locator-request.dto';

describe('ResourceLocatorRequestDto', () => {
	const baseValidRequest = {
		path: '/test/path',
		nodeTypeAndVersion: { name: 'TestNode', version: 1 },
		methodName: 'testMethod',
		currentNodeParameters: {},
	};

	describe('Valid requests', () => {
		test.each([
			{
				name: 'minimal valid request',
				request: baseValidRequest,
			},
			{
				name: 'request with filter',
				request: {
					...baseValidRequest,
					filter: 'testFilter',
				},
			},
			{
				name: 'request with pagination token',
				request: {
					...baseValidRequest,
					paginationToken: 'token123',
				},
			},
			{
				name: 'request with credentials',
				request: {
					...baseValidRequest,
					credentials: { testCredential: { id: 'cred1', name: 'Test Cred' } },
				},
			},
			{
				name: 'request with current node parameters',
				request: {
					...baseValidRequest,
					currentNodeParameters: { param1: 'value1' },
				},
			},
			{
				name: 'request with a semver node version',
				request: {
					...baseValidRequest,
					nodeTypeAndVersion: { name: 'TestNode', version: 1.1 },
				},
			},
		])('should validate $name', ({ request }) => {
			const result = ResourceLocatorRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing path',
				request: {
					nodeTypeAndVersion: { name: 'TestNode', version: 1 },
					methodName: 'testMethod',
				},
				expectedErrorPath: ['path'],
			},
			{
				name: 'missing method name',
				request: {
					path: '/test/path',
					nodeTypeAndVersion: { name: 'TestNode', version: 1 },
					currentNodeParameters: {},
				},
				expectedErrorPath: ['methodName'],
			},
			{
				name: 'invalid node version',
				request: {
					...baseValidRequest,
					nodeTypeAndVersion: { name: 'TestNode', version: 0 },
				},
				expectedErrorPath: ['nodeTypeAndVersion', 'version'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = ResourceLocatorRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
