import type { INode, INodeType } from 'n8n-workflow';

import { extractValue } from '../extract-value';

describe('extractValue', () => {
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
