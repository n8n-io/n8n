import { render } from '@testing-library/vue';
import { ref } from 'vue';
import { vi, describe, it, expect } from 'vitest';
import CanvasRemoteCursors from './CanvasRemoteCursors.vue';
import type { WorkflowAwarenessState } from '@/app/stores/crdt/useWorkflowDocumentAwareness';

vi.mock('@vue-flow/core', () => ({
	useVueFlow: () => ({ viewport: ref({ x: 0, y: 0, zoom: 1 }) }),
}));

vi.mock('../../composables/useVueFlowTransformPaneTeleport', () => ({
	// Null target makes <Teleport :disabled> render children inline for assertions.
	useVueFlowTransformPaneTeleport: () => ({ teleportTarget: ref(null) }),
}));

function makeState(name: string, color: string, cursor?: { x: number; y: number }) {
	return { user: { id: name, name, color }, cursor } as WorkflowAwarenessState;
}

describe('CanvasRemoteCursors', () => {
	it('renders a cursor with the user name for each remote state with a cursor', () => {
		const states = new Map([
			[1, makeState('Alice', '#7B61FF', { x: 100, y: 200 })],
			[2, makeState('Bob', '#1FB6FF', { x: 50, y: 60 })],
		]);

		const { getAllByTestId, getByText } = render(CanvasRemoteCursors, { props: { states } });

		expect(getAllByTestId('canvas-remote-cursor')).toHaveLength(2);
		expect(getByText('Alice')).toBeVisible();
		expect(getByText('Bob')).toBeVisible();
	});

	it('omits remote states that have no cursor position', () => {
		const states = new Map([
			[1, makeState('Alice', '#7B61FF', { x: 10, y: 10 })],
			[2, makeState('Bob', '#1FB6FF')],
		]);

		const { getAllByTestId, queryByText } = render(CanvasRemoteCursors, { props: { states } });

		expect(getAllByTestId('canvas-remote-cursor')).toHaveLength(1);
		expect(queryByText('Bob')).toBeNull();
	});

	it('positions the cursor at its flow coordinates', () => {
		const states = new Map([[1, makeState('Alice', '#7B61FF', { x: 120, y: 240 })]]);

		const { getByTestId } = render(CanvasRemoteCursors, { props: { states } });

		expect(getByTestId('canvas-remote-cursor').getAttribute('style')).toContain(
			'translate(120px, 240px)',
		);
	});
});
