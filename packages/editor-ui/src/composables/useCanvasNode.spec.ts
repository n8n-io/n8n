import { useCanvasNode } from '@/composables/useCanvasNode';
import { inject, ref } from 'vue';

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
	});

	it('should return node data when node is provided', () => {
		const node = {
			data: {
				value: {
					id: 'node1',
					type: 'nodeType1',
					typeVersion: 1,
					disabled: true,
					inputs: ['input1'],
					outputs: ['output1'],
					connections: { input: { '0': ['node2'] }, output: {} },
					issues: { items: ['issue1'], visible: true },
					execution: { status: 'running', waiting: false },
					runData: { count: 1, visible: true },
					pinnedData: { count: 1, visible: true },
					renderType: 'default',
				},
			},
			label: ref('Node 1'),
			selected: ref(true),
		};

		vi.mocked(inject).mockReturnValue(node);

		const result = useCanvasNode();

		expect(result.label.value).toBe('Node 1');
		expect(result.inputs.value).toEqual(['input1']);
		expect(result.outputs.value).toEqual(['output1']);
		expect(result.connections.value).toEqual({ input: { '0': ['node2'] }, output: {} });
		expect(result.isDisabled.value).toBe(true);
		expect(result.isSelected.value).toBe(true);
		expect(result.pinnedDataCount.value).toBe(1);
		expect(result.hasPinnedData.value).toBe(true);
		expect(result.runDataCount.value).toBe(1);
		expect(result.hasRunData.value).toBe(true);
		expect(result.issues.value).toEqual(['issue1']);
		expect(result.hasIssues.value).toBe(true);
		expect(result.executionStatus.value).toBe('running');
		expect(result.executionWaiting.value).toBe(false);
	});
});
