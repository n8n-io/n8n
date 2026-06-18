import { render } from '@testing-library/vue';
import { ref } from 'vue';
import { vi, describe, it, expect } from 'vitest';
import CanvasRemoteSelections from './CanvasRemoteSelections.vue';
import type { WorkflowAwarenessState } from '@/app/stores/crdt/useWorkflowDocumentAwareness';

const nodeGeometry: Record<
	string,
	{ position: { x: number; y: number }; dimensions: { width: number; height: number } }
> = {
	n1: { position: { x: 10, y: 20 }, dimensions: { width: 100, height: 80 } },
	n2: { position: { x: 200, y: 50 }, dimensions: { width: 120, height: 60 } },
};

vi.mock('@vue-flow/core', () => ({
	useVueFlow: () => ({ findNode: (id: string) => nodeGeometry[id] }),
}));

vi.mock('../../composables/useVueFlowTransformPaneTeleport', () => ({
	// Null target makes <Teleport :disabled> render children inline for assertions.
	useVueFlowTransformPaneTeleport: () => ({ teleportTarget: ref(null) }),
}));

function makeState(name: string, color: string, selectedNodeIds?: string[]) {
	return { user: { id: name, name, color }, selectedNodeIds } as WorkflowAwarenessState;
}

describe('CanvasRemoteSelections', () => {
	it('renders one outline per selected node for each peer', () => {
		const states = new Map([[1, makeState('Alice', '#7B61FF', ['n1', 'n2'])]]);

		const { getAllByTestId } = render(CanvasRemoteSelections, { props: { states } });

		expect(getAllByTestId('canvas-remote-selection')).toHaveLength(2);
	});

	it('positions and sizes the outline to the node geometry', () => {
		const states = new Map([[1, makeState('Alice', '#7B61FF', ['n1'])]]);

		const { getByTestId } = render(CanvasRemoteSelections, { props: { states } });
		const style = getByTestId('canvas-remote-selection').getAttribute('style') ?? '';

		expect(style).toContain('translate(10px, 20px)');
		expect(style).toContain('width: 100px');
		expect(style).toContain('height: 80px');
	});

	it('skips peers with no selection', () => {
		const states = new Map([
			[1, makeState('Alice', '#7B61FF', ['n1'])],
			[2, makeState('Bob', '#1FB6FF')],
		]);

		const { getAllByTestId } = render(CanvasRemoteSelections, { props: { states } });

		expect(getAllByTestId('canvas-remote-selection')).toHaveLength(1);
	});

	it('skips nodes that are not on the canvas', () => {
		const states = new Map([[1, makeState('Alice', '#7B61FF', ['n1', 'does-not-exist'])]]);

		const { getAllByTestId } = render(CanvasRemoteSelections, { props: { states } });

		expect(getAllByTestId('canvas-remote-selection')).toHaveLength(1);
	});
});
