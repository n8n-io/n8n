import { OptionsRequestDto } from '../options-request.dto';

describe('OptionsRequestDto', () => {
	const baseValidRequest = {
		path: '/test/path',
		nodeTypeAndVersion: { name: 'TestNode', version: 1 },
		currentNodeParameters: {},
	};

	describe('Valid requests', () => {
		test.each([
			{
				name: 'minimal valid request',
				request: baseValidRequest,
			},
			{
				name: 'request with method name',
				request: {
					...baseValidRequest,
					methodName: 'testMethod',
				},
			},
			{
				name: 'request with load options',
				request: {
					...baseValidRequest,
					loadOptions: {
						routing: {
							operations: { someOperation: 'test' },
							output: { someOutput: 'test' },
							request: { someRequest: 'test' },
						},
					},
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
			const result = OptionsRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing path',
				request: {
					nodeTypeAndVersion: { name: 'TestNode', version: 1 },
				},
				expectedErrorPath: ['path'],
			},
			{
				name: 'missing node type and version',
				request: {
					path: '/test/path',
				},
				expectedErrorPath: ['nodeTypeAndVersion'],
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
			const result = OptionsRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
