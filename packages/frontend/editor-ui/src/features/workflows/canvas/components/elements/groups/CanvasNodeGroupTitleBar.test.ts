import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { h } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';

// Handle requires a <VueFlow> ancestor. Mock it as an inert div so the
// title bar can render in isolation. Other VueFlow imports are type-only.
const removeSelectedNodesMock = vi.fn();
const selectedNodesRef = { value: [] as Array<{ id: string }> };
vi.mock('@vue-flow/core', () => ({
	Handle: {
		name: 'Handle',
		props: ['id', 'type', 'position', 'isConnectable'],
		render() {
			return h('div', {
				class: 'vue-flow__handle',
				'data-handle-id': (this as unknown as { id: string }).id,
			});
		},
	},
	Position: { Left: 'left', Right: 'right' },
	useVueFlow: () => ({
		getSelectedNodes: selectedNodesRef,
		removeSelectedNodes: removeSelectedNodesMock,
	}),
}));

import CanvasNodeGroupTitleBar from './CanvasNodeGroupTitleBar.vue';
import { GROUP_HEADER_HEIGHT } from '../../../stores/canvasNodeGroups.constants';
import type { CanvasGroupViewState } from '../../../canvas.types';

const baseGroup: IWorkflowGroup = {
	id: 'g1',
	nodeIds: ['a', 'b'],
	name: 'My group',
};

function makeData(overrides: Partial<CanvasGroupViewState> = {}): CanvasGroupViewState {
	return {
		group: baseGroup,
		memberRect: { x: 0, y: 0, width: 500, height: 100 },
		memberDimensions: {},
		autofocusTitle: false,
		...overrides,
	};
}

describe('CanvasNodeGroupTitleBar', () => {
	function render(
		props: Partial<{
			data: CanvasGroupViewState;
			readOnly: boolean;
			selected: boolean;
		}> = {},
	) {
		return renderComponent(CanvasNodeGroupTitleBar, {
			pinia: createTestingPinia(),
			props: {
				data: props.data ?? makeData(),
				readOnly: props.readOnly ?? false,
				selected: props.selected ?? false,
			},
		});
	}

	describe('height invariant; nodrag on interactive children', () => {
		it('has the fixed header height', () => {
			const wrapper = render();
			const el = wrapper.getByTestId('canvas-node-group') as HTMLElement;
			expect(el.style.height).toBe(`${GROUP_HEADER_HEIGHT}px`);
		});

		it('ungroup button carries nodrag', () => {
			const wrapper = render();
			const ungroup = wrapper.getByTestId('canvas-node-group-ungroup');
			expect(ungroup.classList.contains('nodrag')).toBe(true);
		});

		it('title edit carries nodrag', () => {
			const wrapper = render();
			const titleArea = wrapper.getByTestId('canvas-node-group-title');
			expect(titleArea.querySelector('.nodrag')).toBeTruthy();
		});
	});

	describe('frame', () => {
		it('renders the frame around the members', () => {
			const wrapper = render();
			expect(wrapper.queryByTestId('canvas-node-group-frame')).toBeTruthy();
		});
	});

	describe('title rename + ungroup parity with old overlay', () => {
		it('emits update:name on commit', async () => {
			const wrapper = render();
			await fireEvent.click(wrapper.getByTestId('inline-edit-preview'));
			const input = wrapper.getByTestId('inline-edit-input') as HTMLInputElement;
			await fireEvent.update(input, 'Renamed');
			await fireEvent.keyDown(input, { key: 'Enter' });
			expect(wrapper.emitted()['update:name']).toEqual([['g1', 'Renamed']]);
		});

		it('emits ungroup when Ungroup is clicked', async () => {
			const wrapper = render();
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-ungroup'));
			expect(wrapper.emitted().ungroup).toEqual([['g1']]);
		});

		it('hides the ungroup toolbar in read-only mode', () => {
			const wrapper = render({ readOnly: true });
			expect(wrapper.queryByTestId('canvas-node-group-toolbar')).toBeNull();
		});

		it('focuses the title when autofocusTitle is true', async () => {
			const wrapper = render({ data: makeData({ autofocusTitle: true }) });
			await waitFor(() => {
				expect(wrapper.emitted()['title:focused']).toEqual([['g1']]);
			});
		});
	});

	describe('handles', () => {
		it('renders left and right handles for re-anchored edges', () => {
			const wrapper = render();
			const root = wrapper.getByTestId('canvas-node-group');
			expect(root.querySelectorAll('.vue-flow__handle').length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('selection clearing on pointerdown', () => {
		it('clears any pre-existing selection so VueFlow does not drag those nodes along with the group', () => {
			const prior = [{ id: 'unrelated-node' }];
			selectedNodesRef.value = prior;
			removeSelectedNodesMock.mockClear();
			const wrapper = render();
			const root = wrapper.getByTestId('canvas-node-group');
			void fireEvent.pointerDown(root);
			expect(removeSelectedNodesMock).toHaveBeenCalledWith(prior);
		});

		it('does not clear selection when pointerdown lands on a nodrag interactive child', () => {
			selectedNodesRef.value = [{ id: 'unrelated-node' }];
			removeSelectedNodesMock.mockClear();
			const wrapper = render();
			void fireEvent.pointerDown(wrapper.getByTestId('canvas-node-group-ungroup'));
			expect(removeSelectedNodesMock).not.toHaveBeenCalled();
		});

		it('does not call removeSelectedNodes when nothing is selected', () => {
			selectedNodesRef.value = [];
			removeSelectedNodesMock.mockClear();
			const wrapper = render();
			void fireEvent.pointerDown(wrapper.getByTestId('canvas-node-group'));
			expect(removeSelectedNodesMock).not.toHaveBeenCalled();
		});

		it('preserves selection when this title bar is part of it (multi-select group drag)', () => {
			// baseGroup.id === 'g1' → VueFlow id is 'group:g1'.
			selectedNodesRef.value = [{ id: 'group:g1' }, { id: 'group:g2' }];
			removeSelectedNodesMock.mockClear();
			const wrapper = render();
			void fireEvent.pointerDown(wrapper.getByTestId('canvas-node-group'));
			expect(removeSelectedNodesMock).not.toHaveBeenCalled();
		});
	});

	describe('selection visual', () => {
		it('does not apply the selected class when not selected', () => {
			const wrapper = render({ selected: false });
			const root = wrapper.getByTestId('canvas-node-group');
			const hasSelectedClass = [...root.classList].some((c) => /selected/i.test(c));
			expect(hasSelectedClass).toBe(false);
		});

		it('applies a hashed `selected` class when selected', () => {
			const wrapper = render({ selected: true });
			const root = wrapper.getByTestId('canvas-node-group');
			const hasSelectedClass = [...root.classList].some((c) => /selected/i.test(c));
			expect(hasSelectedClass).toBe(true);
		});
	});
});
