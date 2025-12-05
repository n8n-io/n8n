import { mock } from 'jest-mock-extended';

import type { SimpleWorkflow } from '@/types';
import { validateCredentials } from '@/validation/checks/credentials';

describe('validateCredentials', () => {
	describe('HTTP Request node validation', () => {
		it('should flag hardcoded Authorization header', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {
							method: 'GET',
							url: 'https://api.example.com/data',
							sendHeaders: true,
							headerParameters: {
								parameters: [
									{
										name: 'Authorization',
										value: 'Bearer sk_test_1234567890abcdef',
									},
								],
							},
						},
						typeVersion: 4,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'http-request-hardcoded-credentials',
					type: 'major',
				}),
			);
			expect(violations[0].description).toContain('Authorization');
		});

		it('should flag hardcoded X-API-Key header', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {
							method: 'GET',
							url: 'https://api.example.com/data',
							sendHeaders: true,
							headerParameters: {
								parameters: [
									{
										name: 'X-API-Key',
										value: 'my-secret-api-key-12345',
									},
								],
							},
						},
						typeVersion: 4,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'http-request-hardcoded-credentials',
					type: 'major',
				}),
			);
			expect(violations[0].description).toContain('X-API-Key');
		});

		it('should allow Authorization header with expression', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {
							method: 'GET',
							url: 'https://api.example.com/data',
							sendHeaders: true,
							headerParameters: {
								parameters: [
									{
										name: 'Authorization',
										value: '={{ $json.token }}',
									},
								],
							},
						},
						typeVersion: 4,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});

		it('should allow non-sensitive headers with hardcoded values', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {
							method: 'GET',
							url: 'https://api.example.com/data',
							sendHeaders: true,
							headerParameters: {
								parameters: [
									{
										name: 'Content-Type',
										value: 'application/json',
									},
									{
										name: 'Accept',
										value: 'application/json',
									},
								],
							},
						},
						typeVersion: 4,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});

		it('should flag credential-like query parameters with hardcoded values', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {
							method: 'GET',
							url: 'https://api.example.com/data',
							sendQuery: true,
							queryParameters: {
								parameters: [
									{
										name: 'api_key',
										value: 'my-secret-key-12345',
									},
								],
							},
						},
						typeVersion: 4,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'http-request-hardcoded-credentials',
					type: 'major',
				}),
			);
			expect(violations[0].description).toContain('api_key');
		});

		it('should allow query parameters with expressions', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {
							method: 'GET',
							url: 'https://api.example.com/data',
							sendQuery: true,
							queryParameters: {
								parameters: [
									{
										name: 'api_key',
										value: '={{ $json.apiKey }}',
									},
								],
							},
						},
						typeVersion: 4,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});

		it('should handle HTTP Request node without parameters', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {},
						typeVersion: 4,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});
	});

	describe('Set node validation', () => {
		it('should flag field named "api_key"', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'api_key',
										value: 'sk_test_12345',
										type: 'string',
									},
								],
							},
						},
						typeVersion: 3,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'set-node-credential-field',
					type: 'major',
				}),
			);
			expect(violations[0].description).toContain('api_key');
		});

		it('should flag field named "access_token"', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Settings',
						type: 'n8n-nodes-base.set',
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'access_token',
										value: 'ya29.a0AfB_byC...',
										type: 'string',
									},
								],
							},
						},
						typeVersion: 3,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'set-node-credential-field',
					type: 'major',
				}),
			);
			expect(violations[0].description).toContain('access_token');
		});

		it('should flag field named "password"', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Config',
						type: 'n8n-nodes-base.set',
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'password',
										value: 'my-secret-password',
										type: 'string',
									},
								],
							},
						},
						typeVersion: 3,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'set-node-credential-field',
					type: 'major',
				}),
			);
			expect(violations[0].description).toContain('password');
		});

		it('should flag field named "secret"', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Variables',
						type: 'n8n-nodes-base.set',
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'secret',
										value: 'top-secret-value',
										type: 'string',
									},
								],
							},
						},
						typeVersion: 3,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'set-node-credential-field',
					type: 'major',
				}),
			);
			expect(violations[0].description).toContain('secret');
		});

		it('should allow normal field names', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'user_id',
										value: '12345',
										type: 'string',
									},
									{
										name: 'status',
										value: 'active',
										type: 'string',
									},
									{
										name: 'email',
										value: 'user@example.com',
										type: 'string',
									},
								],
							},
						},
						typeVersion: 3,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});

		it('should handle Set node without assignments', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						parameters: {},
						typeVersion: 3,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});
	});

	describe('mixed workflows', () => {
		it('should detect multiple violations across different nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Set API Config',
						type: 'n8n-nodes-base.set',
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'api_key',
										value: 'sk_test_12345',
										type: 'string',
									},
								],
							},
						},
						typeVersion: 3,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {
							method: 'GET',
							url: 'https://api.example.com/data',
							sendHeaders: true,
							headerParameters: {
								parameters: [
									{
										name: 'Authorization',
										value: 'Bearer hardcoded-token',
									},
								],
							},
						},
						typeVersion: 4,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toHaveLength(2);
			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'set-node-credential-field',
				}),
			);
			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'http-request-hardcoded-credentials',
				}),
			);
		});

		it('should pass for properly configured workflow', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Set User Data',
						type: 'n8n-nodes-base.set',
						parameters: {
							assignments: {
								assignments: [
									{
										name: 'user_id',
										value: '12345',
										type: 'string',
									},
								],
							},
						},
						typeVersion: 3,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {
							method: 'GET',
							url: 'https://api.example.com/data',
							authentication: 'genericCredentialType',
							genericAuthType: 'httpHeaderAuth',
							sendHeaders: true,
							headerParameters: {
								parameters: [
									{
										name: 'Content-Type',
										value: 'application/json',
									},
								],
							},
						},
						typeVersion: 4,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});
	});

	describe('edge cases', () => {
		it('should handle empty workflow', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Empty Workflow',
				nodes: [],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});

		it('should handle workflow with non-relevant node types', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Code',
						type: 'n8n-nodes-base.code',
						parameters: {
							jsCode: 'return items;',
						},
						typeVersion: 2,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const violations = validateCredentials(workflow);

			expect(violations).toEqual([]);
		});
	});
});
