import { describe, it, expect } from '@jest/globals';
import type { INode, INodeTypeDescription } from 'n8n-workflow';

import { filterNodeParameters, formatFilteredParameters } from './parameter-filter.utils';

describe('parameter-filter.utils', () => {
	describe('filterNodeParameters', () => {
		it('should filter parameters based on display conditions', () => {
			// Create a mock node type with conditional parameters
			const nodeType: INodeTypeDescription = {
				displayName: 'Test Node',
				name: 'testNode',
				group: ['transform'],
				version: 1,
				description: 'Test node with conditional parameters',
				defaults: {
					name: 'Test Node',
				},
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Simple', value: 'simple' },
							{ name: 'Advanced', value: 'advanced' },
						],
						default: 'simple',
					},
					{
						displayName: 'Basic Field',
						name: 'basicField',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								mode: ['simple'],
							},
						},
					},
					{
						displayName: 'Advanced Field',
						name: 'advancedField',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								mode: ['advanced'],
							},
						},
					},
					{
						displayName: 'Always Visible',
						name: 'alwaysVisible',
						type: 'string',
						default: '',
					},
				],
			};

			// Test with mode = simple
			const nodeSimple: INode = {
				id: '1',
				name: 'Test Node',
				type: 'testNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					mode: 'simple',
				},
			};

			const resultSimple = filterNodeParameters(nodeSimple, nodeType);

			// Should show mode, basicField, and alwaysVisible
			expect(resultSimple.parameters).toHaveLength(4);
			expect(resultSimple.parameters.find((p) => p.name === 'mode')?.isVisible).toBe(true);
			expect(resultSimple.parameters.find((p) => p.name === 'basicField')?.isVisible).toBe(true);
			expect(resultSimple.parameters.find((p) => p.name === 'advancedField')?.isVisible).toBe(
				false,
			);
			expect(resultSimple.parameters.find((p) => p.name === 'alwaysVisible')?.isVisible).toBe(true);

			// Test control parameters
			expect(resultSimple.controlParameters).toContain('mode');
		});

		it('should handle nested collection parameters', () => {
			const nodeType: INodeTypeDescription = {
				displayName: 'Collection Node',
				name: 'collectionNode',
				group: ['transform'],
				version: 1,
				description: 'Test node with collection parameters',
				defaults: {
					name: 'Collection Node',
				},
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Enable Collection',
						name: 'enableCollection',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Collection',
						name: 'collection',
						type: 'collection',
						placeholder: 'Add Field',
						default: {},
						displayOptions: {
							show: {
								enableCollection: [true],
							},
						},
						options: [
							{
								displayName: 'Field 1',
								name: 'field1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Field 2',
								name: 'field2',
								type: 'number',
								default: 0,
							},
						],
					},
				],
			};

			// Test with collection disabled
			const nodeDisabled: INode = {
				id: '1',
				name: 'Collection Node',
				type: 'collectionNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					enableCollection: false,
				},
			};

			const resultDisabled = filterNodeParameters(nodeDisabled, nodeType);
			expect(resultDisabled.parameters.find((p) => p.name === 'collection')?.isVisible).toBe(false);

			// Test with collection enabled
			const nodeEnabled: INode = {
				id: '2',
				name: 'Collection Node',
				type: 'collectionNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					enableCollection: true,
				},
			};

			const resultEnabled = filterNodeParameters(nodeEnabled, nodeType);
			expect(resultEnabled.parameters.find((p) => p.name === 'collection')?.isVisible).toBe(true);
		});

		it('should extract parameter dependencies correctly', () => {
			const nodeType: INodeTypeDescription = {
				displayName: 'Dependency Node',
				name: 'dependencyNode',
				group: ['transform'],
				version: 1,
				description: 'Test node with parameter dependencies',
				defaults: {
					name: 'Dependency Node',
				},
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Master Switch',
						name: 'masterSwitch',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Sub Option',
						name: 'subOption',
						type: 'options',
						options: [
							{ name: 'Option A', value: 'a' },
							{ name: 'Option B', value: 'b' },
						],
						default: 'a',
						displayOptions: {
							show: {
								masterSwitch: [true],
							},
						},
					},
					{
						displayName: 'Detail Field',
						name: 'detailField',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								masterSwitch: [true],
								subOption: ['b'],
							},
						},
					},
				],
			};

			const node: INode = {
				id: '1',
				name: 'Dependency Node',
				type: 'dependencyNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					masterSwitch: true,
					subOption: 'b',
				},
			};

			const result = filterNodeParameters(node, nodeType, { includeDependencies: true });

			// Check dependencies
			const subOption = result.parameters.find((p) => p.name === 'subOption');
			expect(subOption?.dependencies).toContain('masterSwitch');

			const detailField = result.parameters.find((p) => p.name === 'detailField');
			expect(detailField?.dependencies).toContain('masterSwitch');
			expect(detailField?.dependencies).toContain('subOption');

			// Check dependents (reverse dependencies)
			const masterSwitch = result.parameters.find((p) => p.name === 'masterSwitch');
			expect(masterSwitch?.dependents).toContain('subOption');
			expect(masterSwitch?.dependents).toContain('detailField');
		});
	});

	describe('formatFilteredParameters', () => {
		it('should format filtered parameters for LLM consumption', () => {
			const filteredResult = {
				parameters: [
					{
						name: 'url',
						displayName: 'URL',
						type: 'string' as const,
						description: 'The URL to make the request to',
						isVisible: true,
						default: '',
					},
					{
						name: 'method',
						displayName: 'Method',
						type: 'options' as const,
						options: [
							{ name: 'GET', value: 'GET' },
							{ name: 'POST', value: 'POST' },
						],
						isVisible: true,
						default: 'GET',
						dependents: ['sendBody'],
					},
					{
						name: 'sendBody',
						displayName: 'Send Body',
						type: 'boolean' as const,
						isVisible: false,
						dependencies: ['method'],
						default: false,
					},
				],
				controlParameters: ['method'],
			};

			const formatted = formatFilteredParameters(filteredResult, {
				includeInvisible: true,
				includeMetadata: true,
			});

			expect(formatted.controlParameters).toEqual(['method']);
			expect(formatted.hint).toContain('control the visibility');
			expect(formatted.parameters).toHaveLength(3);

			const methodParam = formatted.parameters.find((p) => p.name === 'method');
			expect(methodParam?.controls).toContain('sendBody');

			const sendBodyParam = formatted.parameters.find((p) => p.name === 'sendBody');
			expect(sendBodyParam?.isVisible).toBe(false);
			expect(sendBodyParam?.dependsOn).toContain('method');
		});

		it('should exclude invisible parameters when requested', () => {
			const filteredResult = {
				parameters: [
					{
						name: 'visible',
						displayName: 'Visible',
						type: 'string' as const,
						isVisible: true,
						default: '',
					},
					{
						name: 'hidden',
						displayName: 'Hidden',
						type: 'string' as const,
						isVisible: false,
						default: '',
					},
				],
			};

			const formatted = formatFilteredParameters(filteredResult, {
				includeInvisible: false,
			});

			expect(formatted.parameters).toHaveLength(1);
			expect(formatted.parameters[0]?.name).toBe('visible');
		});
	});
});
