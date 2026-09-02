import type { NodeChange } from '@vue-flow/core';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import { createTestNode } from '@/__tests__/mocks';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useAgentNodeCanvasGeometryStore } from '@/features/agents/agentNodeCanvasGeometry.store';
import type { CanvasNodeMoveEvent } from '../canvas.types';
import { useCanvasAgentNodeGeometry } from './useCanvasAgentNodeGeometry';

const canvasId = 'canvas';

function createAgent() {
	return createTestNode({
		id: 'agent',
		name: 'Agent',
		position: [112, 112],
		type: MESSAGE_AN_AGENT_NODE_TYPE,
		typeVersion: 2,
	});
}

function setupGeometry() {
	const agent = createAgent();
	let nodesChangeHandler: (changes: NodeChange[]) => void = () => {};
	const off = vi.fn();
	const setNodePosition = vi.fn((id: string, position: { x: number; y: number }) => {
		if (id === agent.id) agent.position = [position.x, position.y];
	});
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
		}),
	);

	return {
		geometry: geometry!,
		nodesChangeHandler,
		off,
		scope,
		setNodePosition,
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

	it('preserves an existing agent center as its measured height changes', () => {
		const { nodesChangeHandler, scope, setNodePosition } = setupGeometry();

		nodesChangeHandler([
			{ id: 'agent', type: 'dimensions', dimensions: { width: 320, height: 128 } },
		]);
		nodesChangeHandler([
			{ id: 'agent', type: 'dimensions', dimensions: { width: 320, height: 128 } },
		]);
		expect(setNodePosition).not.toHaveBeenCalled();

		nodesChangeHandler([
			{ id: 'agent', type: 'dimensions', dimensions: { width: 320, height: 224 } },
		]);
		expect(setNodePosition).toHaveBeenCalledOnce();
		expect(setNodePosition).toHaveBeenCalledWith('agent', { x: 112, y: 64 });
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
