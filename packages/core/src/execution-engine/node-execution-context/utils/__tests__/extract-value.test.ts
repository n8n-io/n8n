import type { INode, INodeProperties, INodeType } from 'n8n-workflow';

import { extractValue } from '../extract-value';

const node: INode = {
	id: 'node-id',
	name: 'Test Node',
	type: 'test.node',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const nodeTypeWith = (property: INodeProperties): INodeType => ({
	description: {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'Test node',
		defaults: { name: 'Test Node' },
		inputs: [],
		outputs: [],
		properties: [property],
	},
});

describe('extractValue', () => {
	it('returns a plain value unchanged when the property has no extractValue', () => {
		const nodeType = nodeTypeWith({
			displayName: 'Field',
			name: 'field',
			type: 'string',
			default: '',
		});

		expect(extractValue('some-value', 'field', node, nodeType)).toBe('some-value');
	});

	it('returns the inner value of a resource locator whose mode has no extractValue', () => {
		const nodeType = nodeTypeWith({
			displayName: 'Field',
			name: 'field',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			modes: [
				{ displayName: 'List', name: 'list', type: 'list' },
				{ displayName: 'ID', name: 'id', type: 'string' },
			],
		});

		expect(
			extractValue({ __rl: true, mode: 'list', value: 'some-value' }, 'field', node, nodeType),
		).toBe('some-value');
	});

	it('extracts resource locator values with regex metadata', () => {
		const node: INode = {
			id: 'node-id',
			name: 'Test Node',
			type: 'test.node',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const nodeType: INodeType = {
			description: {
				displayName: 'Test Node',
				name: 'testNode',
				group: ['transform'],
				version: 1,
				description: 'Test node',
				defaults: { name: 'Test Node' },
				inputs: [],
				outputs: [],
				properties: [
					{
						displayName: 'Document',
						name: 'document',
						type: 'resourceLocator',
						default: { mode: 'url', value: '' },
						modes: [
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								extractValue: {
									type: 'regex',
									regex: 'document-id:(\\d+)',
								},
							},
						],
					},
				],
			},
		};

		const result = extractValue(
			{ mode: 'url', value: 'document-id:123', __rl: true },
			'document',
			node,
			nodeType,
		);

		expect(result).toBe('123');
	});
});
