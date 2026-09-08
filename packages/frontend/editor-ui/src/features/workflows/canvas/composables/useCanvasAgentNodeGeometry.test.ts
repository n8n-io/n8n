import type { NodeChange } from '@vue-flow/core';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import { createTestNode } from '@/__tests__/mocks';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useAgentNodeCanvasGeometryStore } from '@/features/agents/agentNodeCanvasGeometry.store';
import type { CanvasNodeMoveEvent } from '../canvas.types';
import { useCanvasAgentNodeGeometry } from './useCanvasAgentNodeGeometry';

const canvasId = 'canvas';

function createAgent(position: [number, number] = [112, 112]) {
	return createTestNode({
		id: 'agent',
		name: 'Agent',
		position,
		type: MESSAGE_AN_AGENT_NODE_TYPE,
		typeVersion: 2,
	});
}

function setupGeometry({
	loaded = true,
	agentPosition = [112, 112] as [number, number],
	renderedPosition = { x: 112, y: 112 },
} = {}) {
	const agent = createAgent(agentPosition);
	if (loaded) useAgentNodeCanvasGeometryStore().setNodeContentKey(canvasId, agent.id, 'summary');
	let nodesChangeHandler: (changes: NodeChange[]) => void = () => {};
	const off = vi.fn();
	const setNodePosition = vi.fn((id: string, position: { x: number; y: number }) => {
		if (id === agent.id) agent.position = [position.x, position.y];
	});
	const setRenderedPosition = vi.fn();
	const scope = effectScope();
	const geometry = scope.run(() =>
		useCanvasAgentNodeGeometry({
			canvasId,
			getNodeById: (id) => (id === agent.id ? agent : undefined),
			setNodePosition,
			onNodesChange: (handler) => {
				nodesChangeHandler = handler;
				return { off };
			},
			getSourcePosition: (id) =>
				id === agent.id ? { x: agent.position[0], y: agent.position[1] } : undefined,
			getRenderedNode: (id) =>
				id === agent.id ? { position: renderedPosition, dragging: false } : undefined,
			setRenderedPosition,
		}),
	);

	return {
		geometry: geometry!,
		nodesChangeHandler,
		off,
		scope,
		setNodePosition,
		setRenderedPosition,
	};
}

describe('useCanvasAgentNodeGeometry', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('centers a new agent on its pending center after its first measurement', () => {
		const store = useAgentNodeCanvasGeometryStore();
		store.setPendingCenterY(canvasId, 'agent', 176);
		const { nodesChangeHandler, scope, setNodePosition, off } = setupGeometry();

		nodesChangeHandler([
			{ id: 'agent', type: 'dimensions', dimensions: { width: 320, height: 224 } },
		]);

		expect(setNodePosition).toHaveBeenCalledWith('agent', { x: 112, y: 64 });
		expect(store.getNodeHeight(canvasId, 'agent')).toBe(224);

		scope.stop();
		expect(off).toHaveBeenCalled();
		expect(store.getNodeHeight(canvasId, 'agent')).toBeUndefined();
	});

	it('holds the saved position while a loaded card settles and keeps its center only for new content', () => {
		const store = useAgentNodeCanvasGeometryStore();
		const { nodesChangeHandler, scope, setNodePosition } = setupGeometry({ loaded: false });
		const measure = (height: number) =>
			nodesChangeHandler([{ id: 'agent', type: 'dimensions', dimensions: { width: 320, height } }]);

		// Cold load: painted before the summary, then with it, then a late font/icon stage.
		measure(64);
		store.setNodeContentKey(canvasId, 'agent', 'summary');
		measure(128);
		measure(144);
		expect(setNodePosition).not.toHaveBeenCalled();

		// The agent was edited: the card grows around its center.
		store.setNodeContentKey(canvasId, 'agent', 'edited summary');
		measure(224);
		expect(setNodePosition).toHaveBeenCalledExactlyOnceWith('agent', { x: 112, y: 72 });
		scope.stop();
	});

	it('puts a card that Vue Flow snapped to the grid on mount back on its document position', () => {
		// Centered on the grid, the 356px card's top-left is 2px off it.
		const { nodesChangeHandler, scope, setNodePosition, setRenderedPosition } = setupGeometry({
			agentPosition: [112, 110],
			renderedPosition: { x: 112, y: 112 },
		});

		nodesChangeHandler([
			{ id: 'agent', type: 'dimensions', dimensions: { width: 320, height: 356 } },
		]);

		expect(setRenderedPosition).toHaveBeenCalledExactlyOnceWith('agent', { x: 112, y: 110 });
		expect(setNodePosition).not.toHaveBeenCalled();
		scope.stop();
	});

	it('snaps an agent drag by its measured center and keeps selected nodes together', () => {
		const { geometry, scope } = setupGeometry();
		const moves: CanvasNodeMoveEvent[] = [
			{ id: 'agent', position: { x: 112, y: 112 } },
			{ id: 'selected-node', position: { x: 300, y: 300 } },
		];

		expect(
			geometry.snapDraggedNodeMoves(
				{ id: 'agent', dimensions: { width: 320, height: 206 } },
				moves,
			),
		).toEqual([
			{ id: 'agent', position: { x: 112, y: 105 } },
			{ id: 'selected-node', position: { x: 300, y: 293 } },
		]);
		scope.stop();
	});
});
