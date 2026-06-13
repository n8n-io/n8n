import { mock } from 'jest-mock-extended';
import type {
	IExecuteData,
	INodeExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import { WorkflowExecute } from '../workflow-execute';

/**
 * These tests verify that pairedItem assignment mutates items in-place
 * rather than cloning them. This is a performance optimization that
 * eliminates O(N) object allocations per node execution.
 *
 * The tests validate:
 * 1. Correctness — pairedItem values are set correctly
 * 2. In-place mutation — item object identity is preserved (no cloning)
 * 3. Edge cases — null inputs, multi-input, tool execution sourceOverwrite
 */

// Helper: Access the private execution loop's pairedItem assignment by
// constructing executionData and inspecting items after mutation.
// Since the pairedItem block runs inside processRunExecutionData's loop,
// we test it indirectly by checking items passed to runNode or directly
// by calling the relevant code path.

function createExecutionData(
	inputs: Array<INodeExecutionData[] | null>,
	metadata?: Record<string, unknown>,
): IExecuteData {
	const data: ITaskDataConnections = {
		main: inputs,
	};
	return {
		node: {
			name: 'TestNode',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			id: 'test-id',
			position: [0, 0] as [number, number],
			parameters: {},
		},
		data,
		source: null,
		metadata,
	} as IExecuteData;
}

function createItems(count: number): INodeExecutionData[] {
	return Array.from({ length: count }, (_, i) => ({
		json: { index: i, data: `value-${i}` },
	}));
}

describe('pairedItem in-place mutation', () => {
	describe('correctness', () => {
		test('should set pairedItem on all items with correct indices', () => {
			const items = createItems(100);
			const execData = createExecutionData([items]);

			// Simulate the in-place mutation block from workflow-execute.ts
			applyPairedItems(execData);

			for (let i = 0; i < items.length; i++) {
				expect(items[i].pairedItem).toEqual({
					item: i,
					input: undefined, // inputIndex 0 → falsy → undefined
				});
			}
		});

		test('should set correct input index for multi-input nodes', () => {
			const input0 = createItems(3);
			const input1 = createItems(2);
			const input2 = createItems(4);
			const execData = createExecutionData([input0, input1, input2]);

			applyPairedItems(execData);

			// inputIndex 0 → undefined (falsy)
			for (let i = 0; i < input0.length; i++) {
				expect(input0[i].pairedItem).toEqual({ item: i, input: undefined });
			}
			// inputIndex 1
			for (let i = 0; i < input1.length; i++) {
				expect(input1[i].pairedItem).toEqual({ item: i, input: 1 });
			}
			// inputIndex 2
			for (let i = 0; i < input2.length; i++) {
				expect(input2[i].pairedItem).toEqual({ item: i, input: 2 });
			}
		});

		test('should skip null input connections', () => {
			const items = createItems(2);
			const execData = createExecutionData([null, items]);

			applyPairedItems(execData);

			// Null connection unchanged
			expect(execData.data.main[0]).toBeNull();
			// Non-null items get pairedItem
			for (let i = 0; i < items.length; i++) {
				expect(items[i].pairedItem).toEqual({ item: i, input: 1 });
			}
		});

		test('should overwrite existing pairedItem', () => {
			const items: INodeExecutionData[] = [
				{ json: { a: 1 }, pairedItem: { item: 99 } },
				{ json: { b: 2 }, pairedItem: { item: 88, input: 5 } },
			];
			const execData = createExecutionData([items]);

			applyPairedItems(execData);

			expect(items[0].pairedItem).toEqual({ item: 0, input: undefined });
			expect(items[1].pairedItem).toEqual({ item: 1, input: undefined });
		});
	});

	describe('in-place mutation (no cloning)', () => {
		test('should preserve item object identity — no new objects created', () => {
			const items = createItems(1000);
			const originalRefs = items.map((item) => item);
			const execData = createExecutionData([items]);

			applyPairedItems(execData);

			// Every item should be the same object reference — not a clone
			for (let i = 0; i < items.length; i++) {
				expect(items[i]).toBe(originalRefs[i]);
			}
		});

		test('should preserve item json reference — no shallow copy', () => {
			const items = createItems(100);
			const originalJsonRefs = items.map((item) => item.json);
			const execData = createExecutionData([items]);

			applyPairedItems(execData);

			// json property should still point to the exact same object
			for (let i = 0; i < items.length; i++) {
				expect(items[i].json).toBe(originalJsonRefs[i]);
			}
		});

		test('should not replace the connection arrays', () => {
			const items = createItems(5);
			const execData = createExecutionData([items]);
			const originalMainArray = execData.data.main;
			const originalItemsArray = execData.data.main[0];

			applyPairedItems(execData);

			expect(execData.data.main).toBe(originalMainArray);
			expect(execData.data.main[0]).toBe(originalItemsArray);
		});
	});

	describe('tool execution sourceOverwrite', () => {
		test('should preserve sourceOverwrite from item.pairedItem', () => {
			const sourceOverwrite = { nodeName: 'Agent', runIndex: 0, outputIndex: 0 };
			const items: INodeExecutionData[] = [
				{
					json: { result: 'tool output' },
					pairedItem: { item: 0, sourceOverwrite },
				},
			];
			const execData = createExecutionData([items], {
				preserveSourceOverwrite: true,
			});

			applyPairedItems(execData);

			expect(items[0].pairedItem).toEqual({
				item: 0,
				input: undefined,
				sourceOverwrite,
			});
		});

		test('should use preservedSourceOverwrite from metadata over item pairedItem', () => {
			const metadataOverwrite = { nodeName: 'MetaAgent', runIndex: 1, outputIndex: 0 };
			const itemOverwrite = { nodeName: 'ItemAgent', runIndex: 0, outputIndex: 0 };
			const items: INodeExecutionData[] = [
				{
					json: { result: 'tool output' },
					pairedItem: { item: 0, sourceOverwrite: itemOverwrite },
				},
			];
			const execData = createExecutionData([items], {
				preserveSourceOverwrite: true,
				preservedSourceOverwrite: metadataOverwrite,
			});

			applyPairedItems(execData);

			// metadata-level preservedSourceOverwrite takes precedence
			expect(items[0].pairedItem).toEqual({
				item: 0,
				input: undefined,
				sourceOverwrite: metadataOverwrite,
			});
		});

		test('should not set sourceOverwrite when not a tool execution', () => {
			const items: INodeExecutionData[] = [
				{
					json: { data: 'normal' },
					pairedItem: { item: 0, sourceOverwrite: { nodeName: 'Stale' } },
				},
			];
			// No preserveSourceOverwrite in metadata → not a tool execution
			const execData = createExecutionData([items]);

			applyPairedItems(execData);

			expect(items[0].pairedItem).toEqual({ item: 0, input: undefined });
			expect((items[0].pairedItem as Record<string, unknown>).sourceOverwrite).toBeUndefined();
		});
	});

	describe('performance', () => {
		test('should handle 50,000 items efficiently', () => {
			const itemCount = 50_000;
			const items = createItems(itemCount);
			const execData = createExecutionData([items]);

			const start = performance.now();
			applyPairedItems(execData);
			const elapsed = performance.now() - start;

			// Verify correctness on a sample
			expect(items[0].pairedItem).toEqual({ item: 0, input: undefined });
			expect(items[itemCount - 1].pairedItem).toEqual({
				item: itemCount - 1,
				input: undefined,
			});

			// Should complete well under 100ms for 50K items
			// (typically <10ms on modern hardware)
			expect(elapsed).toBeLessThan(100);
		});

		test('should handle multiple connection types', () => {
			const mainItems = createItems(10_000);
			const execData = createExecutionData([mainItems]);
			// Add a second connection type
			execData.data['ai_agent'] = [createItems(5_000)];

			const start = performance.now();
			applyPairedItems(execData);
			const elapsed = performance.now() - start;

			expect(mainItems[9999].pairedItem).toEqual({ item: 9999, input: undefined });
			expect((execData.data['ai_agent'][0] as INodeExecutionData[])[4999].pairedItem).toEqual({
				item: 4999,
				input: undefined,
			});
			expect(elapsed).toBeLessThan(100);
		});
	});
});

/**
 * Replicates the exact pairedItem assignment block from workflow-execute.ts
 * (lines ~1526-1547). This mirrors the production code so we can test it
 * in isolation without running the full execution loop.
 *
 * IMPORTANT: If the production code changes, this must be updated to match.
 */
function applyPairedItems(executionData: IExecuteData): void {
	// Inline import to match what workflow-execute.ts uses
	const { resolveSourceOverwrite } = require('../node-execution-context');

	for (const connectionType of Object.keys(executionData.data)) {
		const connections = executionData.data[connectionType];
		for (let inputIndex = 0; inputIndex < connections.length; inputIndex++) {
			const input = connections[inputIndex];
			if (input === null) continue;

			for (let itemIndex = 0; itemIndex < input.length; itemIndex++) {
				const item = input[itemIndex];
				const sourceOverwrite = resolveSourceOverwrite(item, executionData);
				item.pairedItem = sourceOverwrite
					? { item: itemIndex, input: inputIndex || undefined, sourceOverwrite }
					: { item: itemIndex, input: inputIndex || undefined };
			}
		}
	}
}
