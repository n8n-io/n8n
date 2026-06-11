import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowRef } from 'vue';
import type { INodeExecutionData, IPinData } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import {
	useWorkflowDocumentPinData,
	getPinDataSize,
	pinDataToExecutionData,
} from './useWorkflowDocumentPinData';
import { CHANGE_ACTION } from './types';
import type { NodesChangeEvent } from './useWorkflowDocumentNodes';

function createPinData() {
	return useWorkflowDocumentPinData({
		nodesById: shallowRef(new Map<string, INodeUi>()),
		onNodesChange: () => {},
	});
}

function createPinDataWithNodesChange() {
	const subscribers: Array<(event: NodesChangeEvent) => void> = [];
	const pinData = useWorkflowDocumentPinData({
		nodesById: shallowRef(new Map<string, INodeUi>()),
		onNodesChange: (cb) => {
			subscribers.push(cb);
		},
	});
	const fire = (event: NodesChangeEvent) => subscribers.forEach((cb) => cb(event));
	return { pinData, fire };
}

describe('useWorkflowDocumentPinData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('initial state', () => {
		it('should start with empty pin data', () => {
			const { pinnedDataByNodeName } = createPinData();
			expect(pinnedDataByNodeName.value).toEqual({});
		});
	});

	describe('setPinData', () => {
		it('should set pin data with json-key objects', () => {
			const { pinnedDataByNodeName, setPinData } = createPinData();
			const data: IPinData = {
				Node1: [{ json: { key: 'value' } }],
			};

			setPinData(data);

			expect(pinnedDataByNodeName.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});

		it('should fire event hook with bulk payload', () => {
			const { setPinData, onPinnedDataChange } = createPinData();
			const hookSpy = vi.fn();
			onPinnedDataChange(hookSpy);
			const data: IPinData = { Node1: [{ json: { key: 'value' } }] };

			setPinData(data);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { pinData: { Node1: [{ json: { key: 'value' } }] } },
			});
		});

		it('should normalize items without json key wrapper', () => {
			const { pinnedDataByNodeName, setPinData } = createPinData();
			const data = {
				Node1: [{ key: 'value' } as unknown as INodeExecutionData],
			};

			setPinData(data);

			expect(pinnedDataByNodeName.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});

		it('should replace existing pin data entirely', () => {
			const { pinnedDataByNodeName, setPinData } = createPinData();
			setPinData({ Node1: [{ json: { a: 1 } }] });
			setPinData({ Node2: [{ json: { b: 2 } }] });

			expect(pinnedDataByNodeName.value).toEqual({ Node2: [{ json: { b: 2 } }] });
			expect(pinnedDataByNodeName.value).not.toHaveProperty('Node1');
		});
	});

	describe('pinNodeData', () => {
		it('should pin data for a specific node', () => {
			const { pinnedDataByNodeName, pinNodeData } = createPinData();

			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			expect(pinnedDataByNodeName.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});

		it('should fire event hook with add action for new node', () => {
			const { pinNodeData, onPinnedDataChange } = createPinData();
			const hookSpy = vi.fn();
			onPinnedDataChange(hookSpy);

			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'add',
				payload: { nodeName: 'Node1', data: [{ json: { key: 'value' } }] },
			});
		});

		it('should fire event hook with update action for existing node', () => {
			const { pinNodeData, onPinnedDataChange } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			const hookSpy = vi.fn();
			onPinnedDataChange(hookSpy);

			pinNodeData('Node1', [{ json: { a: 2 } }]);

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { nodeName: 'Node1', data: [{ json: { a: 2 } }] },
			});
		});

		it('should normalize data by stripping runtime properties', () => {
			const { pinnedDataByNodeName, pinNodeData } = createPinData();
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

			expect(pinnedDataByNodeName.value.Node1[0]).toEqual({
				json: { key: 'value' },
				binary: { file: { mimeType: 'text/plain', data: 'abc' } },
				pairedItem: { item: 0 },
			});
			expect(pinnedDataByNodeName.value.Node1[0]).not.toHaveProperty('index');
			expect(pinnedDataByNodeName.value.Node1[0]).not.toHaveProperty('executionIndex');
		});

		it('should wrap items without json key in { json: item }', () => {
			const { pinnedDataByNodeName, pinNodeData } = createPinData();
			const data = [{ key: 'value' } as unknown as INodeExecutionData];

			pinNodeData('Node1', data);

			expect(pinnedDataByNodeName.value).toEqual({
				Node1: [{ json: { key: 'value' } }],
			});
		});

		it('should preserve existing nodes when pinning a new one', () => {
			const { pinnedDataByNodeName, pinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			pinNodeData('Node2', [{ json: { b: 2 } }]);

			expect(pinnedDataByNodeName.value).toEqual({
				Node1: [{ json: { a: 1 } }],
				Node2: [{ json: { b: 2 } }],
			});
		});

		it('should overwrite existing pin data for the same node', () => {
			const { pinnedDataByNodeName, pinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			pinNodeData('Node1', [{ json: { a: 2 } }]);

			expect(pinnedDataByNodeName.value).toEqual({ Node1: [{ json: { a: 2 } }] });
		});

		it('should handle non-array input by wrapping in array', () => {
			const { pinnedDataByNodeName, pinNodeData } = createPinData();
			const data = { json: { key: 'value' } } as unknown as INodeExecutionData[];

			pinNodeData('Node1', data);

			expect(pinnedDataByNodeName.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
		});
	});

	describe('unpinNodeData', () => {
		it('should remove pin data for a specific node', () => {
			const { pinnedDataByNodeName, pinNodeData, unpinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			pinNodeData('Node2', [{ json: { b: 2 } }]);

			unpinNodeData('Node1');

			expect(pinnedDataByNodeName.value).toEqual({ Node2: [{ json: { b: 2 } }] });
		});

		it('should fire event hook with delete action', () => {
			const { pinNodeData, unpinNodeData, onPinnedDataChange } = createPinData();
			pinNodeData('Node1', [{ json: { a: 1 } }]);
			const hookSpy = vi.fn();
			onPinnedDataChange(hookSpy);

			unpinNodeData('Node1');

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'delete',
				payload: { nodeName: 'Node1', data: undefined },
			});
		});

		it('should handle unpinning a non-existent node gracefully', () => {
			const { pinnedDataByNodeName, unpinNodeData } = createPinData();

			unpinNodeData('NonExistent');

			expect(pinnedDataByNodeName.value).toEqual({});
		});
	});

	describe('renamePinDataNode', () => {
		it('should rename a node key in pin data and fire event hook', () => {
			const { pinnedDataByNodeName, pinNodeData, renamePinDataNode, onPinnedDataChange } =
				createPinData();
			pinNodeData('OldName', [{ json: { key: 'value' } }]);
			const hookSpy = vi.fn();
			onPinnedDataChange(hookSpy);

			renamePinDataNode('OldName', 'NewName');

			expect(pinnedDataByNodeName.value).not.toHaveProperty('OldName');
			expect(pinnedDataByNodeName.value).toEqual({ NewName: [{ json: { key: 'value' } }] });
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { nodeName: 'NewName', data: [{ json: { key: 'value' } }] },
			});
		});

		it('should not modify pin data if old name does not exist', () => {
			const { pinnedDataByNodeName, pinNodeData, renamePinDataNode } = createPinData();
			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			renamePinDataNode('NonExistent', 'NewName');

			expect(pinnedDataByNodeName.value).toEqual({ Node1: [{ json: { key: 'value' } }] });
			expect(pinnedDataByNodeName.value).not.toHaveProperty('NewName');
		});

		it('should update pairedItem sourceOverwrite references', () => {
			const { pinnedDataByNodeName, setPinData, renamePinDataNode } = createPinData();
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

			const pairedItem = pinnedDataByNodeName.value.Node2[0].pairedItem as unknown as {
				sourceOverwrite: { previousNode: string };
			};
			expect(pairedItem.sourceOverwrite.previousNode).toBe('NewName');
		});

		it('should update pairedItem array sourceOverwrite references', () => {
			const { pinnedDataByNodeName, setPinData, renamePinDataNode } = createPinData();
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

			const pairedItems = pinnedDataByNodeName.value.Node2[0].pairedItem as unknown as Array<{
				sourceOverwrite: { previousNode: string };
			}>;
			expect(pairedItems[0].sourceOverwrite.previousNode).toBe('NewName');
			expect(pairedItems[1].sourceOverwrite.previousNode).toBe('OtherNode');
		});

		it('should skip numeric pairedItem values', () => {
			const { pinnedDataByNodeName, setPinData, renamePinDataNode } = createPinData();
			setPinData({
				Node2: [
					{
						json: { data: 'test' },
						pairedItem: 0,
					},
				],
			});

			expect(() => renamePinDataNode('OldName', 'NewName')).not.toThrow();
			expect(pinnedDataByNodeName.value.Node2[0].pairedItem).toBe(0);
		});
	});

	describe('pinDataToExecutionData', () => {
		it('should return empty object for empty pin data', () => {
			expect(pinDataToExecutionData({})).toEqual({});
		});

		it('should return undefined when indexing a non-existent node', () => {
			const { pinnedDataByNodeName } = createPinData();

			expect(pinDataToExecutionData(pinnedDataByNodeName.value).NonExistent).toBeUndefined();
		});

		it('should return unwrapped json values for all nodes', () => {
			const { pinnedDataByNodeName, pinNodeData } = createPinData();
			pinNodeData('Node1', [{ json: { key: 'value1' } }, { json: { key: 'value2' } }]);
			pinNodeData('Node2', [{ json: { key: 'value3' } }]);

			const result = pinDataToExecutionData(pinnedDataByNodeName.value);

			expect(result).toEqual({
				Node1: [{ key: 'value1' }, { key: 'value2' }],
				Node2: [{ key: 'value3' }],
			});
		});
	});

	describe('getPinDataSnapshot', () => {
		it('should return a mutable shallow copy disconnected from later mutations', () => {
			const { pinnedDataByNodeName, pinNodeData, getPinDataSnapshot } = createPinData();
			pinNodeData('Node1', [{ json: { key: 'value' } }]);

			const snapshot = getPinDataSnapshot();

			expect(snapshot).toEqual(pinnedDataByNodeName.value);
			snapshot.Node2 = [{ json: { key: 'new' } }];
			expect(pinnedDataByNodeName.value).not.toHaveProperty('Node2');

			pinNodeData('Node3', [{ json: { key: 'later' } }]);
			expect(snapshot).not.toHaveProperty('Node3');
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

	describe('orphan pin cleanup on node removal', () => {
		it('clears pinned data when a DELETE event names the node', () => {
			const { pinData, fire } = createPinDataWithNodesChange();
			pinData.pinNodeData('Target', [{ json: { x: 1 } }] as INodeExecutionData[]);
			expect(pinData.pinnedDataByNodeName.value.Target).toBeDefined();

			fire({ action: CHANGE_ACTION.DELETE, payload: { id: 'node-id-1', name: 'Target' } });

			expect(pinData.pinnedDataByNodeName.value.Target).toBeUndefined();
		});

		it('leaves unrelated pinned data untouched', () => {
			const { pinData, fire } = createPinDataWithNodesChange();
			pinData.pinNodeData('Target', [{ json: { x: 1 } }] as INodeExecutionData[]);
			pinData.pinNodeData('Other', [{ json: { y: 2 } }] as INodeExecutionData[]);

			fire({ action: CHANGE_ACTION.DELETE, payload: { id: 'node-id-1', name: 'Target' } });

			expect(pinData.pinnedDataByNodeName.value.Target).toBeUndefined();
			expect(pinData.pinnedDataByNodeName.value.Other).toBeDefined();
		});

		it('does nothing when DELETE has no node name (removeAllNodes)', () => {
			const { pinData, fire } = createPinDataWithNodesChange();
			pinData.pinNodeData('Target', [{ json: { x: 1 } }] as INodeExecutionData[]);

			fire({ action: CHANGE_ACTION.DELETE, payload: {} });

			// `removeAllNodes` clears pin data via the store-level `removeAllNodes`
			// orchestration, not via this subscriber — so this individual subscription
			// is a no-op for the bulk case.
			expect(pinData.pinnedDataByNodeName.value.Target).toBeDefined();
		});
	});
});
