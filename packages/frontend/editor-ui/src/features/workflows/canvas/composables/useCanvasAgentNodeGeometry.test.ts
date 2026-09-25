import type { NodeChange } from '@vue-flow/core';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import { createTestNode } from '@/__tests__/mocks';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useAgentNodeCanvasGeometryStore } from '@/features/agents/agentNodeCanvasGeometry.store';
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

function setupGeometry({ loaded = true } = {}) {
	const agent = createAgent();
	if (loaded) useAgentNodeCanvasGeometryStore().setNodeContentKey(canvasId, agent.id, 'summary');
	let nodesChangeHandler: (changes: NodeChange[]) => void = () => {};
	const off = vi.fn();
	const setNodePosition = vi.fn((id: string, position: { x: number; y: number }) => {
		if (id === agent.id) agent.position = [position.x, position.y];
	});
	const scope = effectScope();
	scope.run(() =>
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
		measure: (height: number) =>
			nodesChangeHandler([{ id: 'agent', type: 'dimensions', dimensions: { width: 320, height } }]),
		off,
		scope,
		setNodePosition,
	};
}

describe('useCanvasAgentNodeGeometry', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('places a new agent by its handle on the pending axis after its first measurement', () => {
		const store = useAgentNodeCanvasGeometryStore();
		store.setPendingCenterY(canvasId, 'agent', 176);
		const { measure, scope, setNodePosition, off } = setupGeometry();

		// The 224px card's handle sits 112px from its top: on the grid, unlike 356/2.
		measure(224);
		expect(setNodePosition).toHaveBeenCalledWith('agent', { x: 112, y: 64 });
		expect(store.getNodeHeight(canvasId, 'agent')).toBe(224);

		scope.stop();
		expect(off).toHaveBeenCalled();
		expect(store.getNodeHeight(canvasId, 'agent')).toBeUndefined();
	});

	it('holds the saved position while a loaded card settles and keeps its handle axis only for new content', () => {
		const store = useAgentNodeCanvasGeometryStore();
		const { measure, scope, setNodePosition } = setupGeometry({ loaded: false });

		// Cold load: painted before the summary, then with it, then a late font/icon stage.
		measure(64);
		store.setNodeContentKey(canvasId, 'agent', 'summary');
		measure(128);
		measure(144);
		expect(setNodePosition).not.toHaveBeenCalled();

		// The agent was edited: the handle (144 → grid line 80, 224 → 112) stays on
		// its axis at y=192, and the card's top-left stays on the grid.
		store.setNodeContentKey(canvasId, 'agent', 'edited summary');
		measure(224);
		expect(setNodePosition).toHaveBeenCalledExactlyOnceWith('agent', { x: 112, y: 80 });
		scope.stop();
	});
});
