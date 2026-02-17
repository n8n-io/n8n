import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { INodeExecutionData, IPinData } from 'n8n-workflow';
import { useWorkflowDocumentPinData, getPinDataSize } from './useWorkflowDocumentPinData';
import { dataPinningEventBus } from '@/app/event-bus';

vi.mock('@/app/event-bus', () => ({
	dataPinningEventBus: {
		emit: vi.fn(),
	},
}));

describe('useWorkflowDocumentPinData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('initial state', () => {
		it('should start with empty pin data', () => {
			const { pinData } = useWorkflowDocumentPinData();
			expect(pinData.value).toEqual({});
		});
	});

	describe('setPinData', () => {
		it('should set pin data with json-key objects', () => {
			const { pinData, setPinData } = useWorkflowDocumentPinData();
			const data: IPinData = {
				Node1: [{ json: { key: 'value' } }],
			};

			setPinData(data);

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});

		it('should normalize items without json key wrapper', () => {
			const { pinData, setPinData } = useWorkflowDocumentPinData();
			const data = {
				Node1: [{ key: 'value' } as unknown as INodeExecutionData],
			};

			setPinData(data);

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});

		it('should emit pin-data event', () => {
			const { setPinData } = useWorkflowDocumentPinData();
			const data: IPinData = {
				Node1: [{ json: { key: 'value' } }],
			};

			setPinData(data);

			expect(dataPinningEventBus.emit).toHaveBeenCalledWith('pin-data', {
				Node1: [{ json: { key: 'value' } }],
			});
		});

		it('should replace existing pin data entirely', () => {
			const { pinData, setPinData } = useWorkflowDocumentPinData();
			setPinData({ Node1: [{ json: { a: 1 } }] });
			setPinData({ Node2: [{ json: { b: 2 } }] });

			expect(pinData.value).toEqual({ Node2: [{ json: { b: 2 } }] });
			expect(pinData.value).not.toHaveProperty('Node1');
		});
	});

	describe('pinNodeData', () => {
		it('should pin data for a specific node', () => {
			const { pinData, pinNodeData } = useWorkflowDocumentPinData();

			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});

		it('should normalize data by stripping runtime properties', () => {
			const { pinData, pinNodeData } = useWorkflowDocumentPinData();
			const data = [
				{
					json: { key: 'value' },
					binary: { file: { mimeType: 'text/plain', data: 'abc' } },
					pairedItem: { item: 0 },
					// runtime properties that should be stripped
					index: 0,
					executionIndex: 5,
				} as unknown as INodeExecutionData,
			];

			pinNodeData('Node1', data);

			expect(pinData.value.Node1[0]).toEqual({
				json: { key: 'value' },
				binary: { file: { mimeType: 'text/plain', data: 'abc' } },
				pairedItem: { item: 0 },
			});
			expect(pinData.value.Node1[0]).not.toHaveProperty('index');
			expect(pinData.value.Node1[0]).not.toHaveProperty('executionIndex');
		});

		it('should wrap items without json key in { json: item }', () => {
			const { pinData, pinNodeData } = useWorkflowDocumentPinData();
			const data = [{ key: 'value' } as unknown as INodeExecutionData];

			pinNodeData('Node1', data);

			expect(pinData.value).toEqual({
				Node1: [{ json: { key: 'value' } }],
			});
		});

		it('should preserve existing nodes when pinning a new one', () => {
			const { pinData, pinNodeData } = useWorkflowDocumentPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			pinNodeData('Node2', [{ json: { b: 2 } }]);

			expect(pinData.value).toEqual({
				Node1: [{ json: { a: 1 } }],
				Node2: [{ json: { b: 2 } }],
			});
		});

		it('should overwrite existing pin data for the same node', () => {
			const { pinData, pinNodeData } = useWorkflowDocumentPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			pinNodeData('Node1', [{ json: { a: 2 } }]);

			expect(pinData.value).toEqual({ Node1: [{ json: { a: 2 } }] });
		});

		it('should emit pin-data event with normalized data', () => {
			const { pinNodeData } = useWorkflowDocumentPinData();
			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			expect(dataPinningEventBus.emit).toHaveBeenCalledWith('pin-data', {
				Node1: [{ json: { key: 'value' } }],
			});
		});

		it('should handle non-array input by wrapping in array', () => {
			const { pinData, pinNodeData } = useWorkflowDocumentPinData();
			const data = { json: { key: 'value' } } as unknown as INodeExecutionData[];

			pinNodeData('Node1', data);

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});
	});

	describe('unpinNodeData', () => {
		it('should remove pin data for a specific node', () => {
			const { pinData, pinNodeData, unpinNodeData } = useWorkflowDocumentPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			pinNodeData('Node2', [{ json: { b: 2 } }]);

			unpinNodeData('Node1');

			expect(pinData.value).toEqual({ Node2: [{ json: { b: 2 } }] });
		});

		it('should emit unpin-data event', () => {
			const { pinNodeData, unpinNodeData } = useWorkflowDocumentPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			vi.mocked(dataPinningEventBus.emit).mockClear();

			unpinNodeData('Node1');

			expect(dataPinningEventBus.emit).toHaveBeenCalledWith('unpin-data', {
				nodeNames: ['Node1'],
			});
		});

		it('should handle unpinning a non-existent node gracefully', () => {
			const { pinData, unpinNodeData } = useWorkflowDocumentPinData();

			unpinNodeData('NonExistent');

			expect(pinData.value).toEqual({});
		});
	});

	describe('renamePinDataNode', () => {
		it('should rename a node key in pin data', () => {
			const { pinData, pinNodeData, renamePinDataNode } = useWorkflowDocumentPinData();
			pinNodeData('OldName', [{ json: { key: 'value' } }]);

			renamePinDataNode('OldName', 'NewName');

			expect(pinData.value).not.toHaveProperty('OldName');
			expect(pinData.value).toEqual({ NewName: [{ json: { key: 'value' } }] });
		});

		it('should not modify pin data if old name does not exist', () => {
			const { pinData, pinNodeData, renamePinDataNode } = useWorkflowDocumentPinData();
			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			renamePinDataNode('NonExistent', 'NewName');

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
			expect(pinData.value).not.toHaveProperty('NewName');
		});

		it('should update pairedItem sourceOverwrite references', () => {
			const { pinData, setPinData, renamePinDataNode } = useWorkflowDocumentPinData();
			setPinData({
				Node2: [
					{
						json: { data: 'test' },
						pairedItem: {
							item: 0,
							sourceOverwrite: { previousNode: 'OldName', previousNodeOutput: 0 },
						},
					},
				],
			});

			renamePinDataNode('OldName', 'NewName');

			const pairedItem = pinData.value.Node2[0].pairedItem as {
				sourceOverwrite: { previousNode: string };
			};
			expect(pairedItem.sourceOverwrite.previousNode).toBe('NewName');
		});

		it('should update pairedItem array sourceOverwrite references', () => {
			const { pinData, setPinData, renamePinDataNode } = useWorkflowDocumentPinData();
			setPinData({
				Node2: [
					{
						json: { data: 'test' },
						pairedItem: [
							{
								item: 0,
								sourceOverwrite: { previousNode: 'OldName', previousNodeOutput: 0 },
							},
							{
								item: 1,
								sourceOverwrite: { previousNode: 'OtherNode', previousNodeOutput: 0 },
							},
						],
					},
				],
			});

			renamePinDataNode('OldName', 'NewName');

			const pairedItems = pinData.value.Node2[0].pairedItem as Array<{
				sourceOverwrite: { previousNode: string };
			}>;
			expect(pairedItems[0].sourceOverwrite.previousNode).toBe('NewName');
			expect(pairedItems[1].sourceOverwrite.previousNode).toBe('OtherNode');
		});

		it('should skip numeric pairedItem values', () => {
			const { pinData, setPinData, renamePinDataNode } = useWorkflowDocumentPinData();
			setPinData({
				Node2: [
					{
						json: { data: 'test' },
						pairedItem: 0,
					},
				],
			});

			expect(() => renamePinDataNode('OldName', 'NewName')).not.toThrow();
			expect(pinData.value.Node2[0].pairedItem).toBe(0);
		});
	});

	describe('pinDataByNodeName', () => {
		it('should return undefined for non-existent node', () => {
			const { pinDataByNodeName } = useWorkflowDocumentPinData();

			expect(pinDataByNodeName('NonExistent')).toBeUndefined();
		});

		it('should return unwrapped json values', () => {
			const { pinNodeData, pinDataByNodeName } = useWorkflowDocumentPinData();
			pinNodeData('Node1', [{ json: { key: 'value1' } }, { json: { key: 'value2' } }]);

			const result = pinDataByNodeName('Node1');

			expect(result).toEqual([{ key: 'value1' }, { key: 'value2' }]);
		});
	});

	describe('getPinDataSnapshot', () => {
		it('should return a mutable shallow copy', () => {
			const { pinData, pinNodeData, getPinDataSnapshot } = useWorkflowDocumentPinData();
			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			const snapshot = getPinDataSnapshot();

			expect(snapshot).toEqual(pinData.value);
			// Should be a different object reference
			snapshot.Node2 = [{ json: { key: 'new' } }];
			expect(pinData.value).not.toHaveProperty('Node2');
		});
	});

	describe('getNodePinData', () => {
		it('should return undefined for non-existent node', () => {
			const { getNodePinData } = useWorkflowDocumentPinData();

			expect(getNodePinData('NonExistent')).toBeUndefined();
		});

		it('should return raw pin data for a node', () => {
			const { pinNodeData, getNodePinData } = useWorkflowDocumentPinData();
			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			const result = getNodePinData('Node1');

			expect(result).toEqual([{ json: { key: 'value' } }]);
		});
	});
});

describe('getPinDataSize', () => {
	it('should return 0 for empty pin data', () => {
		expect(getPinDataSize({})).toBe(0);
	});

	it('should return 0 when called without arguments', () => {
		expect(getPinDataSize()).toBe(0);
	});

	it('should calculate size for string values', () => {
		const result = getPinDataSize({ Node1: 'test' });
		expect(result).toBeGreaterThan(0);
	});

	it('should calculate size for INodeExecutionData array values', () => {
		const result = getPinDataSize({
			Node1: [{ json: { key: 'value' } }] as INodeExecutionData[],
		});
		expect(result).toBeGreaterThan(0);
	});

	it('should sum sizes across all nodes', () => {
		const singleNode = getPinDataSize({
			Node1: [{ json: { key: 'value' } }] as INodeExecutionData[],
		});
		const twoNodes = getPinDataSize({
			Node1: [{ json: { key: 'value' } }] as INodeExecutionData[],
			Node2: [{ json: { key: 'value' } }] as INodeExecutionData[],
		});

		expect(twoNodes).toBeGreaterThan(singleNode);
	});
});
