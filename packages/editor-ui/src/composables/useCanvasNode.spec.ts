import { useCanvasNode } from '@/composables/useCanvasNode';
import { inject, ref } from 'vue';
import type { CanvasNodeInjectionData } from '../types';

vi.mock('vue', async () => {
	const actual = await vi.importActual('vue');
	return {
		...actual,
		inject: vi.fn(),
	};
});

describe('useCanvasNode', () => {
	it('should return default values when node is not provided', () => {
		const result = useCanvasNode();

		expect(result.label.value).toBe('');
		expect(result.inputs.value).toEqual([]);
		expect(result.outputs.value).toEqual([]);
		expect(result.connections.value).toEqual({ input: {}, output: {} });
		expect(result.isDisabled.value).toBe(false);
		expect(result.isSelected.value).toBeUndefined();
		expect(result.pinnedDataCount.value).toBe(0);
		expect(result.hasPinnedData.value).toBe(false);
		expect(result.runDataCount.value).toBe(0);
		expect(result.hasRunData.value).toBe(false);
		expect(result.issues.value).toEqual([]);
		expect(result.hasIssues.value).toBe(false);
		expect(result.executionStatus.value).toBeUndefined();
		expect(result.executionWaiting.value).toBeUndefined();
		expect(result.executionRunning.value).toBe(false);
		expect(result.renderOptions.value).toEqual({});
	});

	it('should return node data when node is provided', () => {
		const node = {
			data: ref({
				id: 'node1',
				type: 'nodeType1',
				typeVersion: 1,
				disabled: true,
				inputs: [{ type: 'main', index: 0 }],
				outputs: [{ type: 'main', index: 0 }],
				connections: { input: { '0': [] }, output: {} },
				issues: { items: ['issue1'], visible: true },
				execution: { status: 'running', waiting: 'waiting', running: true },
				runData: { count: 1, visible: true },
				pinnedData: { count: 1, visible: true },
				render: {
					type: 'default',
					options: {
						configurable: false,
						configuration: false,
						trigger: false,
					},
				},
			}),
			id: ref('1'),
			label: ref('Node 1'),
			selected: ref(true),
		} satisfies Partial<CanvasNodeInjectionData>;

		vi.mocked(inject).mockReturnValue(node);

		const result = useCanvasNode();

		expect(result.label.value).toBe('Node 1');
		expect(result.inputs.value).toEqual([{ type: 'main', index: 0 }]);
		expect(result.outputs.value).toEqual([{ type: 'main', index: 0 }]);
		expect(result.connections.value).toEqual({ input: { '0': [] }, output: {} });
		expect(result.isDisabled.value).toBe(true);
		expect(result.isSelected.value).toBe(true);
		expect(result.pinnedDataCount.value).toBe(1);
		expect(result.hasPinnedData.value).toBe(true);
		expect(result.runDataCount.value).toBe(1);
		expect(result.hasRunData.value).toBe(true);
		expect(result.issues.value).toEqual(['issue1']);
		expect(result.hasIssues.value).toBe(true);
		expect(result.executionStatus.value).toBe('running');
		expect(result.executionWaiting.value).toBe('waiting');
		expect(result.executionRunning.value).toBe(true);
		expect(result.renderOptions.value).toBe(node.data.value.render.options);
	});
});
