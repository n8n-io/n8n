import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { validateParameters } from '@/validation/checks/parameters';

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

function createWorkflow(nodes: SimpleWorkflow['nodes']): SimpleWorkflow {
	return { name: 'Test Workflow', nodes, connections: {} };
}

describe('validateParameters', () => {
	describe('node-missing-required-parameter', () => {
		it.each([
			['empty string default', ''],
			['undefined default', undefined],
		])('should flag missing required parameter with %s', (_, defaultValue) => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					default: defaultValue as string,
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
					metadata: expect.objectContaining({
						nodeName: 'Test Node',
						nodeType: 'n8n-nodes-base.test',
						parameterName: 'apiKey',
					}),
				}),
			);
		});

		it('should NOT flag required parameter with meaningful default or when value is provided', () => {
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
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					default: '',
					required: true,
				},
			]);
			const workflow = createWorkflow([
				createNode('n8n-nodes-base.test', { apiKey: 'my-key' }), // method uses default, apiKey provided
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toHaveLength(0);
		});

		it('should respect displayOptions for resource/operation', () => {
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
					displayOptions: { show: { resource: ['post'] } },
				},
			]);

			// Resource is 'user', so postId should not be required
			const workflowUser = createWorkflow([
				createNode('n8n-nodes-base.test', { resource: 'user' }),
			]);
			expect(validateParameters(workflowUser, [nodeType])).toHaveLength(0);

			// Resource is 'post', so postId IS required
			const workflowPost = createWorkflow([
				createNode('n8n-nodes-base.test', { resource: 'post' }),
			]);
			expect(validateParameters(workflowPost, [nodeType])).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({ parameterName: 'postId' }),
				}),
			);
		});

		it.each(['collection', 'fixedCollection', 'credentialsSelect'] as const)(
			'should skip %s type parameters',
			(type) => {
				const nodeType = createNodeType('n8n-nodes-base.test', [
					{
						displayName: 'Options',
						name: 'options',
						type,
						default: {},
						required: true,
						options: [],
					},
				]);
				const workflow = createWorkflow([createNode('n8n-nodes-base.test', {})]);

				expect(validateParameters(workflow, [nodeType])).toHaveLength(0);
			},
		);
	});

	describe('node-invalid-options-value', () => {
		it('should flag invalid options value with metadata', () => {
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
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { method: 'INVALID' })]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
					type: 'critical',
					pointsDeducted: 50,
					metadata: expect.objectContaining({
						parameterName: 'method',
						invalidValue: 'INVALID',
					}),
				}),
			);
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

			expect(validateParameters(workflow, [nodeType])).toHaveLength(0);
		});

		it.each([
			['dynamic loadOptionsMethod', { channel: 'any-value' }, { loadOptionsMethod: 'getChannels' }],
			['expression values', { method: '={{ $json.method }}' }, undefined],
			['undefined values', {}, undefined],
		])('should skip validation for %s', (_, params, typeOptions) => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Field',
					name: Object.keys(params)[0] ?? 'method',
					type: 'options',
					default: 'GET',
					typeOptions,
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
			]);
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', params)]);

			expect(validateParameters(workflow, [nodeType])).toHaveLength(0);
		});

		it('should handle non-string option values (numeric, boolean)', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Priority',
					name: 'priority',
					type: 'options',
					default: 1,
					options: [
						{ name: 'Low', value: 1 },
						{ name: 'High', value: 3 },
					],
				},
			]);
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { priority: 5 })]);

			expect(validateParameters(workflow, [nodeType])).toContainEqual(
				expect.objectContaining({ name: 'node-invalid-options-value' }),
			);
		});
	});

	describe('edge cases', () => {
		it('should validate multiple nodes independently', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{ displayName: 'Field', name: 'field', type: 'string', default: '', required: true },
			]);
			const workflow = createWorkflow([
				createNode('n8n-nodes-base.test', { field: 'valid' }, { id: '1', name: 'Node 1' }),
				createNode('n8n-nodes-base.test', {}, { id: '2', name: 'Node 2' }),
				createNode('n8n-nodes-base.test', { field: 'valid' }, { id: '3', name: 'Node 3' }),
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toHaveLength(1);
			expect(violations[0].metadata?.nodeName).toBe('Node 2');
		});

		it('should handle node with different version via @version displayOptions', () => {
			const nodeType = createNodeType(
				'n8n-nodes-base.test',
				[
					{
						displayName: 'V1 Field',
						name: 'v1Field',
						type: 'string',
						default: '',
						required: true,
						displayOptions: { show: { '@version': [1] } },
					},
				],
				[1, 2],
			);
			// Node is version 2, so v1Field should be hidden
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {}, { typeVersion: 2 })]);

			expect(validateParameters(workflow, [nodeType])).toHaveLength(0);
		});
	});
});
