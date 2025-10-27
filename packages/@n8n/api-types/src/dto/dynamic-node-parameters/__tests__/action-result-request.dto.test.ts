import { ActionResultRequestDto } from '../action-result-request.dto';

describe('ActionResultRequestDto', () => {
	const baseValidRequest = {
		path: '/test/path',
		nodeTypeAndVersion: { name: 'TestNode', version: 1 },
		handler: 'testHandler',
		currentNodeParameters: {},
	};

	describe('Valid requests', () => {
		test.each([
			{
				name: 'minimal valid request',
				request: baseValidRequest,
			},
			{
				name: 'request with payload',
				request: {
					...baseValidRequest,
					payload: { key: 'value' },
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
		])('should validate $name', ({ request }) => {
			const result = ActionResultRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing path',
				request: {
					nodeTypeAndVersion: { name: 'TestNode', version: 1 },
					handler: 'testHandler',
				},
				expectedErrorPath: ['path'],
			},
			{
				name: 'missing handler',
				request: {
					path: '/test/path',
					currentNodeParameters: {},
					nodeTypeAndVersion: { name: 'TestNode', version: 1 },
				},
				expectedErrorPath: ['handler'],
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
			const result = ActionResultRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
