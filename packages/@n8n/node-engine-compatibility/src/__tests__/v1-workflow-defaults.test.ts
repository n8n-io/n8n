import type { INode, INodeType, INodeTypes } from 'n8n-workflow';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import { NodeHelpers } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { toV1Workflow } from '../v1-adapters';

const withDefaults: INodeType = {
	description: {
		displayName: 'Defaults',
		name: 'test.defaults',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Defaults' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				default: 'a',
				options: [
					{ name: 'A', value: 'a' },
					{ name: 'B', value: 'b' },
				],
			},
			{
				displayName: 'Only A',
				name: 'onlyA',
				type: 'string',
				default: 'x',
				displayOptions: { show: { mode: ['a'] } },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [{ displayName: 'Size', name: 'size', type: 'number', default: 3 }],
			},
		],
	},
};

const nodeTypes: INodeTypes = {
	getByName: () => withDefaults,
	getByNameAndVersion: (type) => {
		if (type !== 'test.defaults') throw new UnrecognizedNodeTypeError('test', type);
		return withDefaults;
	},
	getKnownTypes: () => ({}),
};

const node = (type: string, parameters: INode['parameters']): INode => ({
	id: 'n1',
	name: 'Node',
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

const execution = { nodes: [], connections: {}, runData: {} };

describe('toV1Workflow parameter defaults', () => {
	it('gives the node the parameters that the Workflow constructor gives it', () => {
		const parameters = { mode: 'a', options: { size: 5 } };
		const expected = NodeHelpers.getNodeParameters(
			withDefaults.description.properties,
			structuredClone(parameters),
			true,
			false,
			{ typeVersion: 1 },
			withDefaults.description,
		);
		const first = toV1Workflow(
			'w',
			node('test.defaults', structuredClone(parameters)),
			execution,
			nodeTypes,
		);
		const second = toV1Workflow(
			'w',
			node('test.defaults', structuredClone(parameters)),
			execution,
			nodeTypes,
		);
		expect(first.getNode('Node')?.parameters).toEqual(expected);
		expect(second.getNode('Node')?.parameters).toEqual(expected);
	});

	it('gives each workflow its own copy of the parameters', () => {
		const parameters = { mode: 'b' };
		const first = toV1Workflow('w', node('test.defaults', { ...parameters }), execution, nodeTypes);
		const firstNode = first.getNode('Node');
		if (!firstNode) throw new Error('no node');
		firstNode.parameters.mode = 'changed';
		const second = toV1Workflow(
			'w',
			node('test.defaults', { ...parameters }),
			execution,
			nodeTypes,
		);
		expect(second.getNode('Node')?.parameters.mode).toBe('b');
	});

	it('keeps the parameters of a node of an unknown type, and the workflow has the node types', () => {
		const workflow = toV1Workflow('w', node('test.unknown', { a: 1 }), execution, nodeTypes);
		expect(workflow.getNode('Node')?.parameters).toEqual({ a: 1 });
		expect(workflow.nodeTypes.getByNameAndVersion('test.defaults', 1)).toBe(withDefaults);
	});
});
