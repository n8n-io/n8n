import type { INodeTypeDescription } from 'n8n-workflow';

import { hasResourceLocatorParameters } from '../utils';

// Mock node type definition
const mockSetNodeDefinition: INodeTypeDescription = {
	displayName: 'Set',
	name: 'n8n-nodes-base.set',
	group: ['transform'],
	version: 1,
	description: 'Set values',
	defaults: { name: 'Set' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Assignments',
			name: 'assignments',
			type: 'fixedCollection',
			default: {},
			typeOptions: { multipleValues: true },
			options: [],
		},
	],
};

describe('hasResourceLocatorParameters', () => {
	it('should detect resource locator parameters', () => {
		const nodeWithResourceLocator: INodeTypeDescription = {
			...mockSetNodeDefinition,
			properties: [
				{
					displayName: 'Channel',
					name: 'channelId',
					type: 'resourceLocator',
					default: { mode: 'list', value: '' },
				},
			],
		};

		const hasResourceLocator = hasResourceLocatorParameters(nodeWithResourceLocator);
		expect(hasResourceLocator).toBe(true);

		const noResourceLocator = hasResourceLocatorParameters(mockSetNodeDefinition);
		expect(noResourceLocator).toBe(true); // mockSetNodeDefinition has fixedCollection which returns true
	});

	it('should return false for node without resource locator or fixedCollection', () => {
		const nodeWithoutResourceLocator: INodeTypeDescription = {
			...mockSetNodeDefinition,
			properties: [
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
		};

		const hasResourceLocator = hasResourceLocatorParameters(nodeWithoutResourceLocator);
		expect(hasResourceLocator).toBe(false);
	});
});
