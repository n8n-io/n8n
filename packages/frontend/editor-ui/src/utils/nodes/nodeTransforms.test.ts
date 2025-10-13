import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { NodeHelpers } from 'n8n-workflow';
import type { INodePropertyOptions, INodeTypeDescription } from 'n8n-workflow';

import { getParameterDisplayableOptions } from './nodeTransforms';
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

vi.mock('n8n-workflow', () => ({
	NodeHelpers: {
		displayParameter: vi.fn(),
		getNodeParameters: vi.fn(),
	},
	traverseNodeParameters: vi.fn(),
}));

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(),
}));

describe('getParameterDisplayableOptions', () => {
	let mockGetNodeType: ReturnType<typeof vi.fn>;
	let mockNodeType: INodeTypeDescription;
	let mockNode: INodeUi;
	let testOptions: INodePropertyOptions[];

	beforeEach(() => {
		const pinia = createTestingPinia({});
		setActivePinia(pinia);

		vi.clearAllMocks();

		mockNodeType = {
			name: 'testNode',
			displayName: 'Test Node',
			version: 1,
			description: 'Test node description',
			defaults: { name: 'Test Node' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
			group: ['transform'],
		};

		mockNode = {
			id: 'test-node-id',
			name: 'Test Node',
			type: 'testNode',
			typeVersion: 1,
			position: [100, 100],
			parameters: {
				testParam: 'testValue',
			},
		};

		testOptions = [
			{
				name: 'Option 1',
				value: 'option1',
			},
			{
				name: 'Option 2',
				value: 'option2',
				displayOptions: {
					show: {
						testParam: ['showValue'],
					},
				},
			},
			{
				name: 'Option 3',
				value: 'option3',
			},
			{
				name: 'Option 4',
				value: 'option4',
				displayOptions: {
					hide: {
						testParam: ['hideValue'],
					},
				},
			},
		];

		mockGetNodeType = vi.fn().mockReturnValue(mockNodeType);
		const mockNodeTypesStore = {
			getNodeType: mockGetNodeType,
		};
		vi.mocked(useNodeTypesStore).mockReturnValue(
			mockNodeTypesStore as unknown as ReturnType<typeof useNodeTypesStore>,
		);

		vi.mocked(NodeHelpers.getNodeParameters).mockReturnValue({
			testParam: 'testValue',
		});
	});

	describe('when node is null', () => {
		it('should return all options unchanged', () => {
			const result = getParameterDisplayableOptions(testOptions, null);
			expect(result).toEqual(testOptions);
		});
	});

	describe('when node type is not found', () => {
		it('should return all options unchanged when node type is null', () => {
			mockGetNodeType.mockReturnValue(null);

			const result = getParameterDisplayableOptions(testOptions, mockNode);
			expect(result).toEqual(testOptions);
		});

		it('should return all options unchanged when node type is undefined', () => {
			mockGetNodeType.mockReturnValue(undefined);

			const result = getParameterDisplayableOptions(testOptions, mockNode);
			expect(result).toEqual(testOptions);
		});
	});

	describe('when node and node type are valid', () => {
		beforeEach(() => {
			vi.mocked(NodeHelpers.displayParameter).mockReturnValue(true);
		});

		it('should call getNodeType with correct parameters', () => {
			getParameterDisplayableOptions(testOptions, mockNode);

			expect(mockGetNodeType).toHaveBeenCalledWith(mockNode.type, mockNode.typeVersion);
		});

		it('should call getNodeParameters with correct parameters', () => {
			getParameterDisplayableOptions(testOptions, mockNode);

			expect(NodeHelpers.getNodeParameters).toHaveBeenCalledWith(
				mockNodeType.properties,
				mockNode.parameters,
				true,
				false,
				mockNode,
				mockNodeType,
			);
		});

		it('should return options without displayOptions unchanged', () => {
			const result = getParameterDisplayableOptions(testOptions, mockNode);

			// Option 1 has no displayOptions, so it should be included
			expect(result).toContainEqual(testOptions[0]);
		});

		it('should filter options based on displayOptions when displayParameter returns false', () => {
			// Mock displayParameter to return false for options with displayOptions
			vi.mocked(NodeHelpers.displayParameter).mockImplementation((_nodeParameters, option) => {
				return !option.displayOptions;
			});

			const result = getParameterDisplayableOptions(testOptions, mockNode);

			// Should include options without displayOptions
			expect(result).toContainEqual(testOptions[0]); // Option 1 - no displayOptions
			expect(result).toContainEqual(testOptions[2]); // Option 3 - no displayOptions

			// Should exclude options with displayOptions when displayParameter returns false
			expect(result).not.toContainEqual(testOptions[1]); // Option 2 - has displayOptions
			expect(result).not.toContainEqual(testOptions[3]); // Option 4 - has displayOptions
		});

		it('should call displayParameter with correct parameters for displayOptions', () => {
			getParameterDisplayableOptions(testOptions, mockNode);

			// Should be called for options with displayOptions
			expect(NodeHelpers.displayParameter).toHaveBeenCalledWith(
				{ testParam: 'testValue' },
				testOptions[1],
				mockNode,
				mockNodeType,
				undefined,
				'displayOptions',
			);

			expect(NodeHelpers.displayParameter).toHaveBeenCalledWith(
				{ testParam: 'testValue' },
				testOptions[3],
				mockNode,
				mockNodeType,
				undefined,
				'displayOptions',
			);
		});

		it('should use fallback parameters when getNodeParameters returns null', () => {
			vi.mocked(NodeHelpers.getNodeParameters).mockReturnValue(null);

			getParameterDisplayableOptions(testOptions, mockNode);

			// Should use node.parameters as fallback
			expect(NodeHelpers.displayParameter).toHaveBeenCalledWith(
				mockNode.parameters,
				expect.any(Object),
				mockNode,
				mockNodeType,
				undefined,
				expect.any(String),
			);
		});

		it('should handle empty options array', () => {
			const result = getParameterDisplayableOptions([], mockNode);
			expect(result).toEqual([]);
		});

		it('should preserve option order', () => {
			const result = getParameterDisplayableOptions(testOptions, mockNode);

			// Find indices of included options in the result
			const option1Index = result.findIndex((opt) => opt.value === 'option1');
			const option2Index = result.findIndex((opt) => opt.value === 'option2');
			const option3Index = result.findIndex((opt) => opt.value === 'option3');
			const option4Index = result.findIndex((opt) => opt.value === 'option4');

			// All options should be included when displayParameter returns true
			expect(option1Index).toBeLessThan(option2Index);
			expect(option2Index).toBeLessThan(option3Index);
			expect(option3Index).toBeLessThan(option4Index);
		});
	});

	describe('edge cases', () => {
		it('should handle complex node parameters', () => {
			const complexNode = {
				...mockNode,
				parameters: {
					simpleParam: 'value',
					objectParam: {
						nestedParam: 'nestedValue',
					},
					arrayParam: ['item1', 'item2'],
				},
			};

			vi.mocked(NodeHelpers.getNodeParameters).mockReturnValue(complexNode.parameters);

			getParameterDisplayableOptions(testOptions, complexNode);

			expect(NodeHelpers.getNodeParameters).toHaveBeenCalledWith(
				mockNodeType.properties,
				complexNode.parameters,
				true,
				false,
				complexNode,
				mockNodeType,
			);
		});
	});
});
