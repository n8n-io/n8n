import { createPinia, setActivePinia } from 'pinia';
import { mock, mockClear } from 'vitest-mock-extended';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import {
	NodeConnectionType,
	type INode,
	type INodeTypeDescription,
	type Workflow,
} from 'n8n-workflow';

import { useNodeBase } from '@/composables/useNodeBase';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';

describe('useNodeBase', () => {
	let pinia: ReturnType<typeof createPinia>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let emit: (event: string, ...args: unknown[]) => void;
	let nodeBase: ReturnType<typeof useNodeBase>;

	const jsPlumbInstance = mock<BrowserJsPlumbInstance>();
	const nodeTypeDescription = mock<INodeTypeDescription>({
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
	});
	const workflowObject = mock<Workflow>();
	const node = mock<INode>();

	beforeEach(() => {
		mockClear(jsPlumbInstance);

		pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		uiStore = useUIStore();
		emit = vi.fn();

		nodeBase = useNodeBase({
			instance: jsPlumbInstance,
			name: node.name,
			workflowObject,
			isReadOnly: false,
			emit,
		});
	});

	it('should initialize correctly', () => {
		const { inputs, outputs } = nodeBase;

		expect(inputs.value).toEqual([]);
		expect(outputs.value).toEqual([]);
	});

	describe('addInputEndpoints', () => {
		it('should add input endpoints correctly', () => {
			jsPlumbInstance.addEndpoint.mockReturnValue(mock());
			vi.spyOn(workflowsStore, 'getNodeByName').mockReturnValue(node);

			nodeBase.addInputEndpoints(node, nodeTypeDescription);

			expect(workflowsStore.getNodeByName).toHaveBeenCalledWith(node.name);
			expect(jsPlumbInstance.addEndpoint).toHaveBeenCalledWith(undefined, {
				anchor: [0.01, 0.5, -1, 0],
				maxConnections: -1,
				endpoint: 'Rectangle',
				paintStyle: {
					width: 8,
					height: 20,
					fill: 'var(--node-type-main-color)',
					stroke: 'var(--node-type-main-color)',
					lineWidth: 0,
				},
				hoverPaintStyle: {
					width: 8,
					height: 20,
					fill: 'var(--color-primary)',
					stroke: 'var(--color-primary)',
					lineWidth: 0,
				},
				source: false,
				target: false,
				parameters: {
					connection: 'target',
					nodeId: node.id,
					type: 'main',
					index: 0,
				},
				enabled: true,
				cssClass: 'rect-input-endpoint',
				dragAllowedWhenFull: true,
				hoverClass: 'rect-input-endpoint-hover',
				uuid: `${node.id}-input0`,
			});
		});
	});

	describe('addOutputEndpoints', () => {
		it('should add output endpoints correctly', () => {
			const getNodeByNameSpy = vi.spyOn(workflowsStore, 'getNodeByName').mockReturnValue(node);

			nodeBase.addOutputEndpoints(node, nodeTypeDescription);

			expect(getNodeByNameSpy).toHaveBeenCalledWith(node.name);
			expect(jsPlumbInstance.addEndpoint).toHaveBeenCalledWith(undefined, {
				anchor: [0.99, 0.5, 1, 0],
				connectionsDirected: true,
				cssClass: 'dot-output-endpoint',
				dragAllowedWhenFull: false,
				enabled: true,
				endpoint: {
					options: {
						radius: 9,
					},
					type: 'Dot',
				},
				hoverClass: 'dot-output-endpoint-hover',
				hoverPaintStyle: {
					fill: 'var(--color-primary)',
					outlineStroke: 'none',
					strokeWidth: 9,
				},
				maxConnections: -1,
				paintStyle: {
					fill: 'var(--node-type-main-color)',
					outlineStroke: 'none',
					strokeWidth: 9,
				},
				parameters: {
					connection: 'source',
					index: 0,
					nodeId: node.id,
					type: 'main',
				},
				scope: undefined,
				source: true,
				target: false,
				uuid: `${node.id}-output0`,
			});
		});
	});

	describe('mouseLeftClick', () => {
		it('should handle mouse left click correctly', () => {
			const { mouseLeftClick } = nodeBase;

			const event = new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			});

			uiStore.addActiveAction('notDragActive');

			mouseLeftClick(event);

			expect(emit).toHaveBeenCalledWith('deselectAllNodes');
			expect(emit).toHaveBeenCalledWith('nodeSelected', node.name);
		});
	});

	describe('getSpacerIndexes', () => {
		it('should return spacer indexes when left and right group have items and spacer between groups is true', () => {
			const { getSpacerIndexes } = nodeBase;
			const result = getSpacerIndexes(3, 3, true);
			expect(result).toEqual([3]);
		});

		it('should return spacer indexes to meet the min items count if there are less items in both groups', () => {
			const { getSpacerIndexes } = nodeBase;
			const result = getSpacerIndexes(1, 1, false, 5);
			expect(result).toEqual([1, 2, 3]);
		});

		it('should return spacer indexes for left group when only left group has items and less than min items count', () => {
			const { getSpacerIndexes } = nodeBase;
			const result = getSpacerIndexes(2, 0, false, 4);
			expect(result).toEqual([2, 3]);
		});

		it('should return spacer indexes for right group when only right group has items and less than min items count', () => {
			const { getSpacerIndexes } = nodeBase;
			const result = getSpacerIndexes(0, 3, false, 5);
			expect(result).toEqual([0, 1]);
		});

		it('should return empty array when both groups have items more than min items count and spacer between groups is false', () => {
			const { getSpacerIndexes } = nodeBase;
			const result = getSpacerIndexes(3, 3, false, 5);
			expect(result).toEqual([]);
		});

		it('should return empty array when left and right group have items and spacer between groups is false', () => {
			const { getSpacerIndexes } = nodeBase;
			const result = getSpacerIndexes(2, 2, false, 4);
			expect(result).toEqual([]);
		});
	});
});
