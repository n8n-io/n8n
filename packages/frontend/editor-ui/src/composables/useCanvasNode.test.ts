import { useCanvasNode } from '@/composables/useCanvasNode';
import { inject, ref } from 'vue';
import type { CanvasNodeData, CanvasNodeInjectionData } from '../types';
import { CanvasConnectionMode, CanvasNodeRenderType } from '../types';
import { NodeConnectionTypes } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

vi.mock('vue', async () => {
	const actual = await vi.importActual('vue');
	return {
		...actual,
		inject: vi.fn(),
	};
});

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeVersions: vi.fn(() => []),
	})),
}));

describe('useCanvasNode', () => {
	it('should return default values when node is not provided', () => {
		const result = useCanvasNode();

		expect(result.label.value).toBe('');
		expect(result.inputs.value).toEqual([]);
		expect(result.outputs.value).toEqual([]);
		expect(result.connections.value).toEqual({
			[CanvasConnectionMode.Input]: {},
			[CanvasConnectionMode.Output]: {},
		});
		expect(result.isDisabled.value).toBe(false);
		expect(result.isSelected.value).toBeUndefined();
		expect(result.pinnedDataCount.value).toBe(0);
		expect(result.hasPinnedData.value).toBe(false);
		expect(result.runDataOutputMap.value).toEqual({});
		expect(result.runDataIterations.value).toBe(0);
		expect(result.hasRunData.value).toBe(false);
		expect(result.issues.value).toEqual([]);
		expect(result.hasIssues.value).toBe(false);
		expect(result.executionStatus.value).toBeUndefined();
		expect(result.executionWaiting.value).toBeUndefined();
		expect(result.executionRunning.value).toBe(false);
		expect(result.render.value).toEqual({ type: CanvasNodeRenderType.Default, options: {} });
		expect(result.nodeType.value).toBe('');
		expect(result.nodeTypeVersion.value).toBe(1);
		expect(result.isOutdated.value).toBe(false);
	});

	it('should return node data when node is provided', () => {
		const node = {
			data: ref({
				id: 'node1',
				name: 'Node 1',
				subtitle: '',
				type: 'nodeType1',
				typeVersion: 1,
				disabled: true,
				inputs: [{ type: NodeConnectionTypes.Main, index: 0 }],
				outputs: [{ type: NodeConnectionTypes.Main, index: 0 }],
				connections: {
					[CanvasConnectionMode.Input]: { '0': [] },
					[CanvasConnectionMode.Output]: {},
				},
				issues: { items: ['issue1'], visible: true },
				execution: { status: 'running', waiting: 'waiting', running: true },
				runData: { outputMap: {}, iterations: 1, visible: true },
				pinnedData: { count: 1, visible: true },
				render: {
					type: CanvasNodeRenderType.Default,
					options: {
						configurable: false,
						configuration: false,
						trigger: false,
					},
				},
			} satisfies CanvasNodeData),
			id: ref('1'),
			label: ref('Node 1'),
			selected: ref(true),
		} satisfies Partial<CanvasNodeInjectionData>;

		vi.mocked(inject).mockReturnValue(node);

		const result = useCanvasNode();

		expect(result.label.value).toBe('Node 1');
		expect(result.name.value).toBe('Node 1');
		expect(result.inputs.value).toEqual([{ type: NodeConnectionTypes.Main, index: 0 }]);
		expect(result.outputs.value).toEqual([{ type: NodeConnectionTypes.Main, index: 0 }]);
		expect(result.connections.value).toEqual({
			[CanvasConnectionMode.Input]: { '0': [] },
			[CanvasConnectionMode.Output]: {},
		});
		expect(result.isDisabled.value).toBe(true);
		expect(result.isSelected.value).toBe(true);
		expect(result.pinnedDataCount.value).toBe(1);
		expect(result.hasPinnedData.value).toBe(true);
		expect(result.runDataOutputMap.value).toEqual({});
		expect(result.runDataIterations.value).toBe(1);
		expect(result.hasRunData.value).toBe(true);
		expect(result.issues.value).toEqual(['issue1']);
		expect(result.hasIssues.value).toBe(true);
		expect(result.executionStatus.value).toBe('running');
		expect(result.executionWaiting.value).toBe('waiting');
		expect(result.executionRunning.value).toBe(true);
		expect(result.render.value).toBe(node.data.value.render);
		expect(result.nodeType.value).toBe('nodeType1');
		expect(result.nodeTypeVersion.value).toBe(1);
		expect(result.isOutdated.value).toBe(false);
	});

	it('should detect when node version is outdated', () => {
		const mockStore = {
			getNodeVersions: vi.fn(() => [1, 2, 3]), // Latest version is 3
		};
		vi.mocked(useNodeTypesStore).mockReturnValue(mockStore as any);

		const node = {
			data: ref({
				id: 'node1',
				name: 'Node 1',
				subtitle: '',
				type: 'nodeType1',
				typeVersion: 1, // Using version 1, but latest is 3
				disabled: false,
				inputs: [],
				outputs: [],
				connections: {
					[CanvasConnectionMode.Input]: {},
					[CanvasConnectionMode.Output]: {},
				},
				issues: { items: [], visible: false },
				execution: { running: false },
				runData: { outputMap: {}, iterations: 0, visible: false },
				pinnedData: { count: 0, visible: false },
				render: {
					type: CanvasNodeRenderType.Default,
					options: {},
				},
			} satisfies CanvasNodeData),
			id: ref('1'),
			label: ref('Node 1'),
			selected: ref(false),
		} satisfies Partial<CanvasNodeInjectionData>;

		vi.mocked(inject).mockReturnValue(node);

		const result = useCanvasNode();

		expect(result.nodeType.value).toBe('nodeType1');
		expect(result.nodeTypeVersion.value).toBe(1);
		expect(result.isOutdated.value).toBe(true);
		expect(mockStore.getNodeVersions).toHaveBeenCalledWith('nodeType1');
	});

	it('should not be outdated when using latest version', () => {
		const mockStore = {
			getNodeVersions: vi.fn(() => [1, 2, 3]), // Latest version is 3
		};
		vi.mocked(useNodeTypesStore).mockReturnValue(mockStore as any);

		const node = {
			data: ref({
				id: 'node1',
				name: 'Node 1',
				subtitle: '',
				type: 'nodeType1',
				typeVersion: 3, // Using latest version 3
				disabled: false,
				inputs: [],
				outputs: [],
				connections: {
					[CanvasConnectionMode.Input]: {},
					[CanvasConnectionMode.Output]: {},
				},
				issues: { items: [], visible: false },
				execution: { running: false },
				runData: { outputMap: {}, iterations: 0, visible: false },
				pinnedData: { count: 0, visible: false },
				render: {
					type: CanvasNodeRenderType.Default,
					options: {},
				},
			} satisfies CanvasNodeData),
			id: ref('1'),
			label: ref('Node 1'),
			selected: ref(false),
		} satisfies Partial<CanvasNodeInjectionData>;

		vi.mocked(inject).mockReturnValue(node);

		const result = useCanvasNode();

		expect(result.nodeType.value).toBe('nodeType1');
		expect(result.nodeTypeVersion.value).toBe(3);
		expect(result.isOutdated.value).toBe(false);
	});
});
