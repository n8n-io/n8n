import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { INodeExecutionData, IPinData } from 'n8n-workflow';
import {
	useWorkflowDocumentPinData,
	getPinDataSize,
	pinDataToExecutionData,
	type PinDataAction,
} from './useWorkflowDocumentPinData';
import { dataPinningEventBus } from '@/app/event-bus';

vi.mock('@/app/event-bus', () => ({
	dataPinningEventBus: {
		emit: vi.fn(),
	},
}));

/**
 * Creates the composable wired through a spy onChange.
 * The spy calls handleAction, simulating the store's unified dispatcher.
 */
function createPinData() {
	const onChangeSpy = vi.fn<(action: PinDataAction) => void>();
	const composable = useWorkflowDocumentPinData(onChangeSpy);

	// Wire the spy to call handleAction, simulating the store's onChange dispatcher
	onChangeSpy.mockImplementation(composable.handleAction);

	return { ...composable, onChangeSpy };
}

describe('useWorkflowDocumentPinData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('initial state', () => {
		it('should start with empty pin data', () => {
			const { pinData } = createPinData();
			expect(pinData.value).toEqual({});
		});
	});

	describe('setPinData', () => {
		it('should set pin data with json-key objects', () => {
			const { pinData, setPinData } = createPinData();
			const data: IPinData = {
				Node1: [{ json: { key: 'value' } }],
			};

			setPinData(data);

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});

		it('should route through onChange', () => {
			const { setPinData, onChangeSpy } = createPinData();
			const data: IPinData = { Node1: [{ json: { key: 'value' } }] };

			setPinData(data);

			expect(onChangeSpy).toHaveBeenCalledWith({
				name: 'setPinData',
				payload: { pinData: data },
			});
		});

		it('should normalize items without json key wrapper', () => {
			const { pinData, setPinData } = createPinData();
			const data = {
				Node1: [{ key: 'value' } as unknown as INodeExecutionData],
			};

			setPinData(data);

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});

		it('should emit pin-data event', () => {
			const { setPinData } = createPinData();
			const data: IPinData = {
				Node1: [{ json: { key: 'value' } }],
			};

			setPinData(data);

			expect(dataPinningEventBus.emit).toHaveBeenCalledWith('pin-data', {
				Node1: [{ json: { key: 'value' } }],
			});
		});

		it('should replace existing pin data entirely', () => {
			const { pinData, setPinData } = createPinData();
			setPinData({ Node1: [{ json: { a: 1 } }] });
			setPinData({ Node2: [{ json: { b: 2 } }] });

			expect(pinData.value).toEqual({ Node2: [{ json: { b: 2 } }] });
			expect(pinData.value).not.toHaveProperty('Node1');
		});
	});

	describe('pinNodeData', () => {
		it('should pin data for a specific node', () => {
			const { pinData, pinNodeData } = createPinData();

			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});

		it('should route through onChange', () => {
			const { pinNodeData, onChangeSpy } = createPinData();
			const data = [{ json: { key: 'value' } }];

			pinNodeData('Node1', data);

			expect(onChangeSpy).toHaveBeenCalledWith({
				name: 'pinNodeData',
				payload: { nodeName: 'Node1', data },
			});
		});

		it('should normalize data by stripping runtime properties', () => {
			const { pinData, pinNodeData } = createPinData();
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
			const { pinData, pinNodeData } = createPinData();
			const data = [{ key: 'value' } as unknown as INodeExecutionData];

			pinNodeData('Node1', data);

			expect(pinData.value).toEqual({
				Node1: [{ json: { key: 'value' } }],
			});
		});

		it('should preserve existing nodes when pinning a new one', () => {
			const { pinData, pinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			pinNodeData('Node2', [{ json: { b: 2 } }]);

			expect(pinData.value).toEqual({
				Node1: [{ json: { a: 1 } }],
				Node2: [{ json: { b: 2 } }],
			});
		});

		it('should overwrite existing pin data for the same node', () => {
			const { pinData, pinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			pinNodeData('Node1', [{ json: { a: 2 } }]);

			expect(pinData.value).toEqual({ Node1: [{ json: { a: 2 } }] });
		});

		it('should emit pin-data event with normalized data', () => {
			const { pinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			expect(dataPinningEventBus.emit).toHaveBeenCalledWith('pin-data', {
				Node1: [{ json: { key: 'value' } }],
			});
		});

		it('should handle non-array input by wrapping in array', () => {
			const { pinData, pinNodeData } = createPinData();
			const data = { json: { key: 'value' } } as unknown as INodeExecutionData[];

			pinNodeData('Node1', data);

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});
	});

	describe('unpinNodeData', () => {
		it('should remove pin data for a specific node', () => {
			const { pinData, pinNodeData, unpinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			pinNodeData('Node2', [{ json: { b: 2 } }]);

			unpinNodeData('Node1');

			expect(pinData.value).toEqual({ Node2: [{ json: { b: 2 } }] });
		});

		it('should route through onChange', () => {
			const { pinNodeData, unpinNodeData, onChangeSpy } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			onChangeSpy.mockClear();

			unpinNodeData('Node1');

			expect(onChangeSpy).toHaveBeenCalledWith({
				name: 'unpinNodeData',
				payload: { nodeName: 'Node1' },
			});
		});

		it('should emit unpin-data event', () => {
			const { pinNodeData, unpinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			vi.mocked(dataPinningEventBus.emit).mockClear();

			unpinNodeData('Node1');

			expect(dataPinningEventBus.emit).toHaveBeenCalledWith('unpin-data', {
				nodeNames: ['Node1'],
			});
		});

		it('should handle unpinning a non-existent node gracefully', () => {
			const { pinData, unpinNodeData } = createPinData();

			unpinNodeData('NonExistent');

			expect(pinData.value).toEqual({});
		});
	});

	describe('renamePinDataNode', () => {
		it('should rename a node key in pin data', () => {
			const { pinData, pinNodeData, renamePinDataNode } = createPinData();
			pinNodeData('OldName', [{ json: { key: 'value' } }]);

			renamePinDataNode('OldName', 'NewName');

			expect(pinData.value).not.toHaveProperty('OldName');
			expect(pinData.value).toEqual({ NewName: [{ json: { key: 'value' } }] });
		});

		it('should route through onChange', () => {
			const { renamePinDataNode, onChangeSpy } = createPinData();

			renamePinDataNode('OldName', 'NewName');

			expect(onChangeSpy).toHaveBeenCalledWith({
				name: 'renamePinDataNode',
				payload: { oldName: 'OldName', newName: 'NewName' },
			});
		});

		it('should not modify pin data if old name does not exist', () => {
			const { pinData, pinNodeData, renamePinDataNode } = createPinData();
			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			renamePinDataNode('NonExistent', 'NewName');

			expect(pinData.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
			expect(pinData.value).not.toHaveProperty('NewName');
		});

		it('should update pairedItem sourceOverwrite references', () => {
			const { pinData, setPinData, renamePinDataNode } = createPinData();
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

			const pairedItem = pinData.value.Node2[0].pairedItem as unknown as {
				sourceOverwrite: { previousNode: string };
			};
			expect(pairedItem.sourceOverwrite.previousNode).toBe('NewName');
		});

		it('should update pairedItem array sourceOverwrite references', () => {
			const { pinData, setPinData, renamePinDataNode } = createPinData();
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

			const pairedItems = pinData.value.Node2[0].pairedItem as unknown as Array<{
				sourceOverwrite: { previousNode: string };
			}>;
			expect(pairedItems[0].sourceOverwrite.previousNode).toBe('NewName');
			expect(pairedItems[1].sourceOverwrite.previousNode).toBe('OtherNode');
		});

		it('should skip numeric pairedItem values', () => {
			const { pinData, setPinData, renamePinDataNode } = createPinData();
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

	describe('pinDataToExecutionData', () => {
		it('should return empty object for empty pin data', () => {
			expect(pinDataToExecutionData({})).toEqual({});
		});

		it('should return undefined when indexing a non-existent node', () => {
			const { pinData } = createPinData();

			expect(pinDataToExecutionData(pinData.value).NonExistent).toBeUndefined();
		});

		it('should return unwrapped json values for all nodes', () => {
			const { pinData, pinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { key: 'value1' } }, { json: { key: 'value2' } }]);
			pinNodeData('Node2', [{ json: { key: 'value3' } }]);

			const result = pinDataToExecutionData(pinData.value);

			expect(result).toEqual({
				Node1: [{ key: 'value1' }, { key: 'value2' }],
				Node2: [{ key: 'value3' }],
			});
		});
	});

	describe('getPinDataSnapshot', () => {
		it('should return a mutable shallow copy', () => {
			const { pinData, pinNodeData, getPinDataSnapshot } = createPinData();
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
			const { getNodePinData } = createPinData();

			expect(getNodePinData('NonExistent')).toBeUndefined();
		});

		it('should return raw pin data for a node', () => {
			const { pinNodeData, getNodePinData } = createPinData();
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
