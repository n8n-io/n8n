import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { GraphNode } from '@vue-flow/core';
import { renderComponent } from '@/__tests__/render';
import CanvasSelectionToolbar from '../CanvasSelectionToolbar.vue';

const isEnabled = { value: true };
vi.mock('@/features/ai/instanceAi/composables/useAddNodesToChat', () => ({
	useAddNodesToChat: () => ({ isNodeContextEnabled: isEnabled, addSelectedNodesToChat: vi.fn() }),
}));

function twoNodes(): GraphNode[] {
	return [
		{ id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: {} },
		{ id: 'n2', type: 'default', position: { x: 1, y: 0 }, data: {} },
	] as GraphNode[];
}

describe('CanvasSelectionToolbar — add to chat', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		isEnabled.value = true;
	});

	it('shows the button when flag on and >1 selected', () => {
		const { queryByTestId } = renderComponent(CanvasSelectionToolbar, {
			props: { selectedNodes: twoNodes() },
		});
		expect(queryByTestId('canvas-selection-toolbar-add-to-chat')).toBeTruthy();
	});

	it('hides the button when the flag is off', () => {
		isEnabled.value = false;
		const { queryByTestId } = renderComponent(CanvasSelectionToolbar, {
			props: { selectedNodes: twoNodes() },
		});
		expect(queryByTestId('canvas-selection-toolbar-add-to-chat')).toBeNull();
	});
});
