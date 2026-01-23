import { mock } from 'jest-mock-extended';
import type { INodeParameters } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { validateCredentials } from '@/validation/checks/credentials';

// Helper types
interface HeaderParam {
	name: string;
	value: string;
}

interface QueryParam {
	name: string;
	value: string;
}

interface Assignment {
	name: string;
	value: string;
	type?: string;
}

interface HttpRequestNodeOptions {
	name?: string;
	id?: string;
	headers?: HeaderParam[];
	queryParams?: QueryParam[];
	extraParams?: Record<string, unknown>;
}

interface SetNodeOptions {
	name?: string;
	id?: string;
	assignments?: Assignment[];
}

// Helper functions
function createHttpRequestNode(options: HttpRequestNodeOptions = {}): SimpleWorkflow['nodes'][0] {
	const { name = 'HTTP Request', id = '1', headers, queryParams, extraParams = {} } = options;

	const parameters: Record<string, unknown> = {
		method: 'GET',
		url: 'https://api.example.com/data',
		...extraParams,
	};

	if (headers) {
		parameters.sendHeaders = true;
		parameters.headerParameters = { parameters: headers };
	}

	if (queryParams) {
		parameters.sendQuery = true;
		parameters.queryParameters = { parameters: queryParams };
	}

	return {
		id,
		name,
		type: 'n8n-nodes-base.httpRequest',
		parameters: parameters as INodeParameters,
		typeVersion: 4,
		position: [0, 0],
	};
}

function createSetNode(options: SetNodeOptions = {}): SimpleWorkflow['nodes'][0] {
	const { name = 'Set', id = '1', assignments = [] } = options;

	const parameters: Record<string, unknown> =
		assignments.length > 0
			? {
					assignments: {
						assignments: assignments.map((a) => ({ ...a, type: a.type ?? 'string' })),
					},
				}
			: {};

	return {
		id,
		name,
		type: 'n8n-nodes-base.set',
		parameters: parameters as INodeParameters,
		typeVersion: 3,
		position: [0, 0],
	};
}

function createWorkflow(nodes: SimpleWorkflow['nodes']): SimpleWorkflow {
	return mock<SimpleWorkflow>({
		name: 'Test Workflow',
		nodes,
		connections: {},
	});
}

describe('validateCredentials', () => {
	describe('HTTP Request node validation', () => {
		it('should flag hardcoded Authorization header', () => {
			const workflow = createWorkflow([
				createHttpRequestNode({
					headers: [{ name: 'Authorization', value: 'Bearer sk_test_1234567890abcdef' }],
				}),
			]);

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'http-request-hardcoded-credentials',
					type: 'minor',
				}),
			);
			expect(violations[0].description).toContain('Authorization');
		});

		it('should flag hardcoded X-API-Key header', () => {
			const workflow = createWorkflow([
				createHttpRequestNode({
					headers: [{ name: 'X-API-Key', value: 'my-secret-api-key-12345' }],
				}),
			]);

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'http-request-hardcoded-credentials',
					type: 'minor',
				}),
			);
			expect(violations[0].description).toContain('X-API-Key');
		});

		it('should allow Authorization header with expression', () => {
			const workflow = createWorkflow([
				createHttpRequestNode({
					headers: [{ name: 'Authorization', value: '={{ $json.token }}' }],
				}),
			]);

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});

		it('should allow non-sensitive headers with hardcoded values', () => {
			const workflow = createWorkflow([
				createHttpRequestNode({
					headers: [
						{ name: 'Content-Type', value: 'application/json' },
						{ name: 'Accept', value: 'application/json' },
					],
				}),
			]);

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});

		it('should flag credential-like query parameters with hardcoded values', () => {
			const workflow = createWorkflow([
				createHttpRequestNode({
					queryParams: [{ name: 'api_key', value: 'my-secret-key-12345' }],
				}),
			]);

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'http-request-hardcoded-credentials',
					type: 'minor',
				}),
			);
			expect(violations[0].description).toContain('api_key');
		});

		it('should allow query parameters with expressions', () => {
			const workflow = createWorkflow([
				createHttpRequestNode({
					queryParams: [{ name: 'api_key', value: '={{ $json.apiKey }}' }],
				}),
			]);

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});

		it('should handle HTTP Request node without parameters', () => {
			const workflow = createWorkflow([createHttpRequestNode()]);

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});
	});

	describe('Set node validation', () => {
		it.each([
			['api_key', 'sk_test_12345'],
			['access_token', 'ya29.a0AfB_byC...'],
			['password', 'my-secret-password'],
			['secret', 'top-secret-value'],
		])('should flag field named "%s"', (fieldName, fieldValue) => {
			const workflow = createWorkflow([
				createSetNode({
					assignments: [{ name: fieldName, value: fieldValue }],
				}),
			]);

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'set-node-credential-field',
					type: 'minor',
				}),
			);
			expect(violations[0].description).toContain(fieldName);
		});

		it('should allow normal field names', () => {
			const workflow = createWorkflow([
				createSetNode({
					assignments: [
						{ name: 'user_id', value: '12345' },
						{ name: 'status', value: 'active' },
						{ name: 'email', value: 'user@example.com' },
					],
				}),
			]);

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});
	});
});
