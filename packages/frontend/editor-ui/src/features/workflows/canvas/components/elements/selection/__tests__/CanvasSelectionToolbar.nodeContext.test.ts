import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { GraphNode } from '@vue-flow/core';
import { renderComponent } from '@/__tests__/render';
import CanvasSelectionToolbar from '../CanvasSelectionToolbar.vue';

const isEnabled = { value: true };
vi.mock('@/features/ai/instanceAi/composables/useIsNodeContextEnabled', () => ({
	useIsNodeContextEnabled: () => isEnabled,
}));

function nodes(count: number): GraphNode[] {
	return Array.from(
		{ length: count },
		(_, i) => ({ id: `n${i}`, type: 'default', position: { x: i, y: 0 }, data: {} }) as GraphNode,
	);
}

describe('CanvasSelectionToolbar — add to chat', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		isEnabled.value = true;
	});

	it('shows the button when flag on and multiple nodes selected', () => {
		const { queryByTestId } = renderComponent(CanvasSelectionToolbar, {
			props: { selectedNodes: nodes(2) },
		});
		expect(queryByTestId('canvas-selection-toolbar-add-to-chat')).toBeTruthy();
	});

	it('hides the button for a single selected node (its own hover toolbar owns that)', () => {
		const { queryByTestId } = renderComponent(CanvasSelectionToolbar, {
			props: { selectedNodes: nodes(1) },
		});
		expect(queryByTestId('canvas-selection-toolbar-add-to-chat')).toBeNull();
	});

	it('hides the button when the flag is off', () => {
		isEnabled.value = false;
		const { queryByTestId } = renderComponent(CanvasSelectionToolbar, {
			props: { selectedNodes: nodes(2) },
		});
		expect(queryByTestId('canvas-selection-toolbar-add-to-chat')).toBeNull();
	});
});
