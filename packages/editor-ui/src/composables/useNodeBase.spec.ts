import { useNodeBase } from '@/composables/useNodeBase';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import { createTestNode, createTestWorkflowObject } from '@/__tests__/mocks';
import { createPinia, setActivePinia } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { findNodeTypeDescriptionByName } from '@/__tests__/defaults';
import { SET_NODE_TYPE } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import type { INodeTypeDescription, Workflow } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { Mock } from '@vitest/spy';

describe('useNodeBase', () => {
	let pinia: ReturnType<typeof createPinia>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let instance: Record<string, Mock>;
	let workflowObject: Workflow;
	let emit: (event: string, ...args: unknown[]) => void;
	let node: INodeUi;
	let nodeTypeDescription: INodeTypeDescription;
	let nodeBase: ReturnType<typeof useNodeBase>;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		uiStore = useUIStore();

		instance = {
			addEndpoint: vi.fn().mockReturnValue({}),
		};
		workflowObject = createTestWorkflowObject({ nodes: [], connections: {} });
		node = createTestNode();
		nodeTypeDescription = findNodeTypeDescriptionByName(SET_NODE_TYPE);
		emit = vi.fn();

		nodeBase = useNodeBase({
			instance: instance as unknown as BrowserJsPlumbInstance,
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
			const { addInputEndpoints } = nodeBase;

			vi.spyOn(workflowsStore, 'getNodeByName').mockReturnValue(node);

			addInputEndpoints(node, nodeTypeDescription);

			const addEndpointCall = instance.addEndpoint.mock.calls[0][1];

			expect(workflowsStore.getNodeByName).toHaveBeenCalledWith(node.name);
			expect(addEndpointCall.anchor).toEqual([0.01, 0.5, -1, 0]);
			expect(addEndpointCall.cssClass).toEqual('rect-input-endpoint');
			expect(addEndpointCall.dragAllowedWhenFull).toEqual(true);
			expect(addEndpointCall.enabled).toEqual(true);
			expect(addEndpointCall.endpoint).toEqual('Rectangle');
			expect(addEndpointCall.hoverClass).toEqual('rect-input-endpoint-hover');
			expect(addEndpointCall.hoverPaintStyle).toMatchObject({
				fill: 'var(--color-primary)',
				height: 20,
				lineWidth: 0,
				stroke: 'var(--color-primary)',
				width: 8,
			});
			expect(addEndpointCall.maxConnections).toEqual(-1);
			expect(addEndpointCall.paintStyle).toMatchObject({
				fill: 'var(--node-type-main-color)',
				height: 20,
				lineWidth: 0,
				stroke: 'var(--node-type-main-color)',
				width: 8,
			});
			expect(addEndpointCall.parameters).toMatchObject({
				connection: 'target',
				index: 0,
				type: 'main',
			});
			expect(addEndpointCall.scope).toBeUndefined();
			expect(addEndpointCall.source).toBeFalsy();
			expect(addEndpointCall.target).toBeFalsy();
		});
	});

	describe('addOutputEndpoints', () => {
		it('should add output endpoints correctly', () => {
			const { addOutputEndpoints } = nodeBase;
			const getNodeByNameSpy = vi.spyOn(workflowsStore, 'getNodeByName').mockReturnValue(node);

			addOutputEndpoints(node, nodeTypeDescription);

			const addEndpointCall = instance.addEndpoint.mock.calls[0][1];

			expect(getNodeByNameSpy).toHaveBeenCalledWith(node.name);
			expect(addEndpointCall.anchor).toEqual([0.99, 0.5, 1, 0]);
			expect(addEndpointCall.cssClass).toEqual('dot-output-endpoint');
			expect(addEndpointCall.dragAllowedWhenFull).toEqual(false);
			expect(addEndpointCall.enabled).toEqual(true);
			expect(addEndpointCall.endpoint).toEqual({
				options: {
					radius: 9,
				},
				type: 'Dot',
			});
			expect(addEndpointCall.hoverClass).toEqual('dot-output-endpoint-hover');
			expect(addEndpointCall.hoverPaintStyle).toMatchObject({
				fill: 'var(--color-primary)',
			});
			expect(addEndpointCall.maxConnections).toEqual(-1);
			expect(addEndpointCall.paintStyle).toMatchObject({
				fill: 'var(--node-type-main-color)',
			});
			expect(addEndpointCall.parameters).toMatchObject({
				connection: 'source',
				index: 0,
				type: 'main',
			});
			expect(addEndpointCall.scope).toBeUndefined();
			expect(addEndpointCall.source).toBeTruthy();
			expect(addEndpointCall.target).toBeFalsy();
		});
	});

	describe('mouseLeftClick', () => {
		it('should handle mouse left click correctly', () => {
			const { mouseLeftClick } = nodeBase;

			const isActionActiveFn = vi.fn().mockReturnValue(false);

			// @ts-expect-error Pinia has a known issue when mocking getters, will be solved when migrating the uiStore to composition api
			vi.spyOn(uiStore, 'isActionActive', 'get').mockReturnValue(isActionActiveFn);
			// @ts-expect-error Pinia has a known issue when mocking getters, will be solved when migrating the uiStore to composition api
			vi.spyOn(uiStore, 'isNodeSelected', 'get').mockReturnValue(() => false);

			const event = new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			});

			mouseLeftClick(event);

			expect(isActionActiveFn).toHaveBeenCalledWith('dragActive');
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
