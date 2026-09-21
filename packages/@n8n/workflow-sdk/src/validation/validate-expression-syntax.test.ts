import { NodeVersionNotFoundError, type INodeTypes, type INodeType } from 'n8n-workflow';

import { validateWorkflowExpressionSyntax } from './validate-expression-syntax';
import type { WorkflowJSON } from '../types/base';

function createNodeTypes(): INodeTypes {
	const nodeType: INodeType = {
		description: {
			displayName: 'Request',
			name: 'request',
			description: 'Test request',
			version: 1,
			group: ['transform'],
			defaults: { name: 'Request' },
			inputs: [],
			outputs: [],
			properties: [
				{ displayName: 'Body', name: 'jsonBody', type: 'json', default: '' },
				{ displayName: 'Mode', name: 'mode', type: 'string', default: 'body' },
				{
					displayName: 'Hidden',
					name: 'hidden',
					type: 'string',
					default: '',
					displayOptions: { show: { mode: ['other'] } },
				},
				{
					displayName: 'Literal',
					name: 'literal',
					type: 'string',
					default: '',
					noDataExpression: true,
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					options: [
						{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						{
							displayName: 'Literal',
							name: 'literal',
							type: 'string',
							default: '',
							noDataExpression: true,
						},
					],
				},
			],
		},
	};
	return {
		getByName: () => nodeType,
		getByNameAndVersion: () => nodeType,
		getKnownTypes: () => ({}),
	};
}

function createWorkflow(parameters: WorkflowJSON['nodes'][number]['parameters']): WorkflowJSON {
	return {
		name: 'Candidate booking',
		nodes: [
			{
				id: 'request',
				name: 'Create Interview Event',
				type: 'test.request',
				typeVersion: 1,
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
	};
}

describe('validateWorkflowExpressionSyntax', () => {
	it('reports the node and parameter path for malformed expression bodies', async () => {
		const workflow = createWorkflow({
			jsonBody: '={{ {candidate: {status: "ready"}} }}',
			options: { value: '={{ $json. }}' },
		});
		const original = structuredClone(workflow);
		const errors = await validateWorkflowExpressionSyntax(workflow, createNodeTypes());
		expect(errors).toEqual([
			expect.objectContaining({
				code: 'INVALID_EXPRESSION',
				nodeName: 'Create Interview Event',
				parameterName: 'jsonBody',
			}),
			expect.objectContaining({
				code: 'INVALID_EXPRESSION',
				nodeName: 'Create Interview Event',
				parameterName: 'options.value',
			}),
		]);
		expect(workflow).toEqual(original);
	});

	it('accepts nested objects and templates without evaluating them', async () => {
		const workflow = createWorkflow({
			jsonBody: '={{ {candidate: {status: "ready"} } }}',
			options: { value: '=Hello {{ $json.candidate?.name ?? "candidate" }}' },
		});
		await expect(validateWorkflowExpressionSyntax(workflow, createNodeTypes())).resolves.toEqual(
			[],
		);
	});

	it('ignores hidden and literal parameters at every schema level', async () => {
		const invalid = '={{ $json. }}';
		const workflow = createWorkflow({
			hidden: invalid,
			literal: invalid,
			options: { literal: invalid },
		});
		const original = structuredClone(workflow);
		await expect(validateWorkflowExpressionSyntax(workflow, createNodeTypes())).resolves.toEqual(
			[],
		);
		expect(workflow).toEqual(original);
	});

	it('checks a parameter when its display condition is active', async () => {
		const workflow = createWorkflow({ mode: 'other', hidden: '={{ $json. }}' });
		await expect(validateWorkflowExpressionSyntax(workflow, createNodeTypes())).resolves.toEqual([
			expect.objectContaining({ code: 'INVALID_EXPRESSION', parameterName: 'hidden' }),
		]);
	});

	it('ignores placeholders and text without the expression prefix', async () => {
		const workflow = createWorkflow({
			jsonBody: '=<__PLACEHOLDER_VALUE__JSON body__>',
			options: { value: 'SELECT {{ $json. }}' },
		});
		await expect(validateWorkflowExpressionSyntax(workflow, createNodeTypes())).resolves.toEqual(
			[],
		);
	});

	it('ignores disabled nodes without looking up their schemas', async () => {
		const workflow = createWorkflow({ jsonBody: '={{ $json. }}' });
		workflow.nodes[0].disabled = true;
		const nodeTypes = createNodeTypes();
		const getNode = vi.spyOn(nodeTypes, 'getByNameAndVersion');
		await expect(validateWorkflowExpressionSyntax(workflow, nodeTypes)).resolves.toEqual([]);
		expect(getNode).not.toHaveBeenCalled();
	});

	it('leaves unsupported node versions to the node validator', async () => {
		const nodeTypes = createNodeTypes();
		vi.spyOn(nodeTypes, 'getByNameAndVersion').mockImplementation(() => {
			throw new NodeVersionNotFoundError('test.request', 2, [1]);
		});
		await expect(
			validateWorkflowExpressionSyntax(createWorkflow({ jsonBody: '={{ $json. }}' }), nodeTypes),
		).resolves.toEqual([]);
	});

	it('does not hide unexpected schema provider errors', async () => {
		const nodeTypes = createNodeTypes();
		const error = new Error('Registry unavailable');
		vi.spyOn(nodeTypes, 'getByNameAndVersion').mockImplementation(() => {
			throw error;
		});
		await expect(
			validateWorkflowExpressionSyntax(createWorkflow({ jsonBody: '={{ $json. }}' }), nodeTypes),
		).rejects.toBe(error);
	});
});
