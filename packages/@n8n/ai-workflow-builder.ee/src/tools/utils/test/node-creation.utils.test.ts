import type { INode, INodeTypeDescription } from 'n8n-workflow';

import {
	extractDefaultParameters,
	createNodeInstance,
	generateUniqueName,
} from '../node-creation.utils';

describe('node-creation.utils', () => {
	describe('extractDefaultParameters', () => {
		it('should extract default values from node type properties', () => {
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [
					{
						displayName: 'String Property',
						name: 'stringProp',
						type: 'string',
						default: 'default-value',
					},
					{
						displayName: 'Number Property',
						name: 'numberProp',
						type: 'number',
						default: 42,
					},
					{
						displayName: 'Boolean Property',
						name: 'boolProp',
						type: 'boolean',
						default: true,
					},
				],
			};

			const result = extractDefaultParameters(nodeType);

			expect(result).toEqual({
				stringProp: 'default-value',
				numberProp: 42,
				boolProp: true,
			});
		});

		it('should include empty string as a valid default', () => {
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [
					{
						displayName: 'Empty String',
						name: 'emptyString',
						type: 'string',
						default: '',
					},
				],
			};

			const result = extractDefaultParameters(nodeType);

			expect(result).toEqual({
				emptyString: '',
			});
		});

		it('should include false as a valid default', () => {
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [
					{
						displayName: 'False Boolean',
						name: 'falseBool',
						type: 'boolean',
						default: false,
					},
				],
			};

			const result = extractDefaultParameters(nodeType);

			expect(result).toEqual({
				falseBool: false,
			});
		});

		it('should skip properties without defaults', () => {
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [
					{
						displayName: 'Has Default',
						name: 'hasDefault',
						type: 'string',
						default: 'value',
					},
					{
						displayName: 'No Default',
						name: 'noDefault',
						type: 'string',
						// No default property
					} as unknown as INodeTypeDescription['properties'][0],
				],
			};

			const result = extractDefaultParameters(nodeType);

			expect(result).toEqual({
				hasDefault: 'value',
			});
			expect(result).not.toHaveProperty('noDefault');
		});

		it('should skip properties with displayOptions that depend on other parameters', () => {
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [
					{
						displayName: 'Always Shown',
						name: 'alwaysShown',
						type: 'string',
						default: 'always',
					},
					{
						displayName: 'Conditional Property',
						name: 'conditionalProp',
						type: 'string',
						default: 'conditional',
						displayOptions: {
							show: {
								resource: ['users'],
							},
						},
					},
					{
						displayName: 'Hidden Property',
						name: 'hiddenProp',
						type: 'string',
						default: 'hidden',
						displayOptions: {
							hide: {
								operation: ['delete'],
							},
						},
					},
				],
			};

			const result = extractDefaultParameters(nodeType);

			// Only the unconditional property should be included
			expect(result).toEqual({
				alwaysShown: 'always',
			});
			expect(result).not.toHaveProperty('conditionalProp');
			expect(result).not.toHaveProperty('hiddenProp');
		});

		it('should include properties with version-only displayOptions (@version)', () => {
			// This test documents that @version displayOptions are NOT considered
			// parameter dependencies. The model parameter in lmChatOpenAi uses this
			// pattern to show different options for different versions.
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: [1, 1.1, 1.2],
				defaults: {},
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [
					{
						displayName: 'Model',
						name: 'model',
						type: 'options',
						default: 'gpt-4',
						// Version-based displayOptions should NOT prevent default extraction
						displayOptions: {
							show: {
								'@version': [1.1, 1.2],
							},
						},
					},
					{
						displayName: 'Always Shown',
						name: 'alwaysShown',
						type: 'string',
						default: 'value',
					},
				],
			};

			const result = extractDefaultParameters(nodeType);

			// Both properties should be included - @version is not a parameter dependency
			expect(result).toEqual({
				model: 'gpt-4',
				alwaysShown: 'value',
			});
		});

		it('should skip properties that combine @version with parameter dependencies', () => {
			// If a property has BOTH @version and a parameter dependency,
			// it should still be skipped because of the parameter dependency
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: [1, 1.1],
				defaults: {},
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [
					{
						displayName: 'Mixed Condition',
						name: 'mixedCondition',
						type: 'string',
						default: 'mixed',
						displayOptions: {
							show: {
								'@version': [1.1], // System condition (OK)
								resource: ['users'], // Parameter dependency (causes skip)
							},
						},
					},
				],
			};

			const result = extractDefaultParameters(nodeType);

			// Should be skipped because of the 'resource' dependency
			expect(result).toEqual({});
			expect(result).not.toHaveProperty('mixedCondition');
		});

		it('should return empty object for node type with no properties', () => {
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [],
			};

			const result = extractDefaultParameters(nodeType);

			expect(result).toEqual({});
		});

		it('should return empty object for node type with undefined properties', () => {
			// Intentionally missing properties to test edge case
			const nodeType = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				group: ['transform'],
				// properties intentionally omitted
			} as unknown as INodeTypeDescription;

			const result = extractDefaultParameters(nodeType);

			expect(result).toEqual({});
		});
	});

	describe('createNodeInstance', () => {
		it('should apply default parameters from node type', () => {
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: { name: 'Test' },
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [
					{
						displayName: 'Model',
						name: 'model',
						type: 'string',
						default: 'gpt-4',
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
					},
				],
			};

			const node = createNodeInstance(nodeType, 1, 'My Node', [100, 200], {});

			expect(node.parameters).toEqual({
				model: 'gpt-4',
				temperature: 0.7,
			});
		});

		it('should allow explicit parameters to override defaults', () => {
			const nodeType: INodeTypeDescription = {
				name: 'test-node',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: { name: 'Test' },
				inputs: [],
				outputs: [],
				group: ['transform'],
				properties: [
					{
						displayName: 'Model',
						name: 'model',
						type: 'string',
						default: 'gpt-4',
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
					},
				],
			};

			const node = createNodeInstance(nodeType, 1, 'My Node', [100, 200], {
				model: 'gpt-3.5-turbo',
				customParam: 'custom-value',
			});

			expect(node.parameters).toEqual({
				model: 'gpt-3.5-turbo', // Overridden
				temperature: 0.7, // Default preserved
				customParam: 'custom-value', // Extra param added
			});
		});
	});

	describe('generateUniqueName', () => {
		it('should return base name if no duplicates exist', () => {
			const existingNodes: INode[] = [
				{
					id: '1',
					name: 'Other Node',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];

			const result = generateUniqueName('My Node', existingNodes);

			expect(result).toBe('My Node');
		});

		it('should append number if duplicate exists', () => {
			const existingNodes: INode[] = [
				{
					id: '1',
					name: 'My Node',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];

			const result = generateUniqueName('My Node', existingNodes);

			expect(result).toBe('My Node1');
		});

		it('should increment number until unique', () => {
			const existingNodes: INode[] = [
				{
					id: '1',
					name: 'My Node',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'My Node1',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '3',
					name: 'My Node2',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];

			const result = generateUniqueName('My Node', existingNodes);

			expect(result).toBe('My Node3');
		});
	});
});
