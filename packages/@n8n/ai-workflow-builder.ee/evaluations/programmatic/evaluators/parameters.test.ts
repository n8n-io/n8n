import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { validateParameters } from '@/validation/checks/parameters';

// Helper to create a node type
function createNodeType(
	type: string,
	properties: INodeTypeDescription['properties'] = [],
	version: number | number[] = 1,
): INodeTypeDescription {
	return {
		name: type,
		displayName: type.split('.').pop() ?? type,
		group: ['transform'],
		version,
		description: 'Test node',
		defaults: { name: type.split('.').pop() ?? type },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties,
	} as INodeTypeDescription;
}

// Helper to create a workflow node
function createNode(
	type: string,
	parameters: Record<string, unknown> = {},
	options: { name?: string; id?: string; typeVersion?: number } = {},
): SimpleWorkflow['nodes'][0] {
	const { name = 'Test Node', id = '1', typeVersion = 1 } = options;
	return {
		id,
		name,
		type,
		parameters: parameters as INodeParameters,
		typeVersion,
		position: [0, 0],
	};
}

// Helper to create a workflow (plain object, no mocks)
function createWorkflow(nodes: SimpleWorkflow['nodes']): SimpleWorkflow {
	return {
		name: 'Test Workflow',
		nodes,
		connections: {},
	};
}

describe('validateParameters', () => {
	describe('node-missing-required-parameter', () => {
		it('should flag missing required parameter with no default', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					default: '',
					required: true,
				},
			]);

			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {})]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					type: 'critical',
					pointsDeducted: 50,
				}),
			);
			expect(violations[0].description).toContain('API Key');
		});

		it('should flag missing required parameter with undefined default', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Query',
					name: 'query',
					type: 'string',
					default: undefined as unknown as string,
					required: true,
				},
			]);

			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {})]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
				}),
			);
		});

		it('should NOT flag required parameter with meaningful default', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					default: 'GET',
					required: true,
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
			]);

			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {})]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
				}),
			);
		});

		it('should NOT flag required parameter when value is provided', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					default: '',
					required: true,
				},
			]);

			const workflow = createWorkflow([
				createNode('n8n-nodes-base.test', { apiKey: 'my-api-key' }),
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
				}),
			);
		});

		it('should NOT flag required parameter hidden by resource displayOptions', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'user',
					options: [
						{ name: 'User', value: 'user' },
						{ name: 'Post', value: 'post' },
					],
				},
				{
					displayName: 'Post ID',
					name: 'postId',
					type: 'string',
					default: '',
					required: true,
					displayOptions: {
						show: {
							resource: ['post'],
						},
					},
				},
			]);

			// Resource is 'user', so postId should not be required
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { resource: 'user' })]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({ parameterName: 'postId' }),
				}),
			);
		});

		it('should flag required parameter when displayOptions condition is met', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'user',
					options: [
						{ name: 'User', value: 'user' },
						{ name: 'Post', value: 'post' },
					],
				},
				{
					displayName: 'Post ID',
					name: 'postId',
					type: 'string',
					default: '',
					required: true,
					displayOptions: {
						show: {
							resource: ['post'],
						},
					},
				},
			]);

			// Resource is 'post', so postId IS required
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { resource: 'post' })]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({ parameterName: 'postId' }),
				}),
			);
		});

		it('should NOT flag required parameter hidden by operation displayOptions', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'get',
					options: [
						{ name: 'Get', value: 'get' },
						{ name: 'Create', value: 'create' },
					],
				},
				{
					displayName: 'Data',
					name: 'data',
					type: 'string',
					default: '',
					required: true,
					displayOptions: {
						show: {
							operation: ['create'],
						},
					},
				},
			]);

			// Operation is 'get', so data should not be required
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { operation: 'get' })]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({ parameterName: 'data' }),
				}),
			);
		});

		it('should skip collection type parameters', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					required: true,
					options: [],
				},
			]);

			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {})]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
				}),
			);
		});

		it('should skip fixedCollection type parameters', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Fields',
					name: 'fields',
					type: 'fixedCollection',
					default: {},
					required: true,
					options: [],
				},
			]);

			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {})]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
				}),
			);
		});

		it('should include metadata with node and parameter info', () => {
			const nodeType = createNodeType('n8n-nodes-base.slack', [
				{
					displayName: 'Channel',
					name: 'channel',
					type: 'string',
					default: '',
					required: true,
				},
			]);

			const workflow = createWorkflow([
				createNode('n8n-nodes-base.slack', {}, { name: 'Send Slack Message' }),
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations[0].metadata).toEqual({
				nodeName: 'Send Slack Message',
				nodeType: 'n8n-nodes-base.slack',
				parameterName: 'channel',
				parameterDisplayName: 'Channel',
			});
		});
	});

	describe('node-invalid-options-value', () => {
		it('should flag invalid options value', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					default: 'GET',
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
						{ name: 'PUT', value: 'PUT' },
					],
				},
			]);

			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { method: 'INVALID' })]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
					type: 'critical',
					pointsDeducted: 50,
				}),
			);
			expect(violations[0].description).toContain('INVALID');
			expect(violations[0].description).toContain('Method');
		});

		it('should NOT flag valid options value', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					default: 'GET',
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
			]);

			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { method: 'POST' })]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
				}),
			);
		});

		it('should skip validation for dynamic loadOptionsMethod', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Channel',
					name: 'channel',
					type: 'options',
					default: '',
					typeOptions: {
						loadOptionsMethod: 'getChannels',
					},
					options: [], // Empty because options are loaded dynamically
				},
			]);

			const workflow = createWorkflow([
				createNode('n8n-nodes-base.test', { channel: 'any-value-should-be-ok' }),
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
				}),
			);
		});

		it('should skip validation for expression values', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					default: 'GET',
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
			]);

			const workflow = createWorkflow([
				createNode('n8n-nodes-base.test', { method: '={{ $json.method }}' }),
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
				}),
			);
		});

		it('should skip validation for undefined/null values', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					default: 'GET',
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
			]);

			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {})]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
				}),
			);
		});

		it('should NOT flag options hidden by displayOptions', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'user',
					options: [
						{ name: 'User', value: 'user' },
						{ name: 'Post', value: 'post' },
					],
				},
				{
					displayName: 'User Action',
					name: 'userAction',
					type: 'options',
					default: 'get',
					displayOptions: {
						show: {
							resource: ['user'],
						},
					},
					options: [
						{ name: 'Get', value: 'get' },
						{ name: 'Create', value: 'create' },
					],
				},
			]);

			// Resource is 'post', so userAction is hidden and shouldn't be validated
			const workflow = createWorkflow([
				createNode('n8n-nodes-base.test', { resource: 'post', userAction: 'invalid' }),
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
					metadata: expect.objectContaining({ parameterName: 'userAction' }),
				}),
			);
		});

		it('should handle numeric option values', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Priority',
					name: 'priority',
					type: 'options',
					default: 1,
					options: [
						{ name: 'Low', value: 1 },
						{ name: 'Medium', value: 2 },
						{ name: 'High', value: 3 },
					],
				},
			]);

			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { priority: 5 })]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
				}),
			);
		});

		it('should handle boolean option values', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Enabled',
					name: 'enabled',
					type: 'options',
					default: true,
					options: [
						{ name: 'Yes', value: true },
						{ name: 'No', value: false },
					],
				},
			]);

			// 'maybe' is not true or false
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { enabled: 'maybe' })]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
				}),
			);
		});

		it('should include metadata with invalid value info', () => {
			const nodeType = createNodeType('n8n-nodes-base.httpRequest', [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					default: 'GET',
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
			]);

			const workflow = createWorkflow([
				createNode('n8n-nodes-base.httpRequest', { method: 'PATCH' }, { name: 'HTTP Request' }),
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations[0].metadata).toEqual({
				nodeName: 'HTTP Request',
				nodeType: 'n8n-nodes-base.httpRequest',
				parameterName: 'method',
				parameterDisplayName: 'Method',
				invalidValue: 'PATCH',
			});
		});
	});

	describe('edge cases', () => {
		it('should handle empty workflow', () => {
			const violations = validateParameters({ name: 'Test', nodes: [], connections: {} }, []);

			expect(violations).toHaveLength(0);
		});

		it('should handle workflow with no nodes array', () => {
			const violations = validateParameters(
				{ name: 'Test', connections: {} } as SimpleWorkflow,
				[],
			);

			expect(violations).toHaveLength(0);
		});

		it('should handle unknown node types gracefully', () => {
			const workflow = createWorkflow([createNode('n8n-nodes-base.unknown', { foo: 'bar' })]);

			const violations = validateParameters(workflow, []);

			// Should not throw, just return empty (unknown types handled by other validators)
			expect(violations).toHaveLength(0);
		});

		it('should handle nodes without parameters', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Optional',
					name: 'optional',
					type: 'string',
					default: 'default-value',
				},
			]);

			const node = createNode('n8n-nodes-base.test');
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete (node as unknown as Record<string, unknown>).parameters;
			const workflow = createWorkflow([node]);

			const violations = validateParameters(workflow, [nodeType]);

			// Should not throw
			expect(violations).toHaveLength(0);
		});

		it('should validate multiple nodes independently', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Required Field',
					name: 'requiredField',
					type: 'string',
					default: '',
					required: true,
				},
			]);

			const workflow = createWorkflow([
				createNode('n8n-nodes-base.test', { requiredField: 'valid' }, { id: '1', name: 'Node 1' }),
				createNode('n8n-nodes-base.test', {}, { id: '2', name: 'Node 2' }), // Missing required
				createNode(
					'n8n-nodes-base.test',
					{ requiredField: 'also-valid' },
					{ id: '3', name: 'Node 3' },
				),
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toHaveLength(1);
			expect(violations[0].metadata?.nodeName).toBe('Node 2');
		});

		it('should handle node with different version', () => {
			const nodeTypeV1 = createNodeType(
				'n8n-nodes-base.test',
				[
					{
						displayName: 'V1 Field',
						name: 'v1Field',
						type: 'string',
						default: '',
						required: true,
						displayOptions: {
							show: {
								'@version': [1],
							},
						},
					},
				],
				1,
			);

			// Node is version 2, so v1Field should be hidden
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {}, { typeVersion: 2 })]);

			const violations = validateParameters(workflow, [nodeTypeV1]);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({ parameterName: 'v1Field' }),
				}),
			);
		});
	});
});
