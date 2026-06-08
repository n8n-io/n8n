import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
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
import type { CanvasGroupNodeData } from '../../../canvas.types';

const baseGroup: IWorkflowGroup = {
	id: 'g1',
	nodeIds: ['a', 'b'],
	name: 'My group',
};

function makeData(overrides: Partial<CanvasGroupNodeData> = {}): CanvasGroupNodeData {
	return {
		group: baseGroup,
		nodesRect: { x: 0, y: 0, width: 500, height: 100 },
		...overrides,
	};
}

describe('CanvasNodeGroupTitleBar', () => {
	function render(
		props: Partial<{
			data: CanvasGroupNodeData;
			autofocusGroupId: string | null;
			dimensions: { width: number; height: number };
			readOnly: boolean;
		}> = {},
	) {
		return renderComponent(CanvasNodeGroupTitleBar, {
			pinia: createTestingPinia(),
			props: {
				data: props.data ?? makeData(),
				autofocusGroupId: props.autofocusGroupId ?? null,
				dimensions: props.dimensions,
				readOnly: props.readOnly ?? false,
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
		it('renders the frame around the nodes', () => {
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

		it('focuses the title when autofocusGroupId matches the group', async () => {
			const wrapper = render({ autofocusGroupId: 'g1' });
			const input = wrapper.getByTestId('inline-edit-input') as HTMLInputElement;

			await waitFor(() => {
				expect(input).toHaveFocus();
				expect(input.selectionStart).toBe(0);
				expect(input.selectionEnd).toBe(input.value.length);
				expect(wrapper.emitted()['title:focused']).toEqual([['g1']]);
			});
		});

		it('waits for VueFlow to initialize node dimensions before focusing the title', async () => {
			const wrapper = render({
				autofocusGroupId: 'g1',
				dimensions: { width: 0, height: 0 },
			});
			const input = wrapper.getByTestId('inline-edit-input') as HTMLInputElement;

			await flushPromises();

			expect(input).not.toHaveFocus();
			expect(wrapper.emitted()['title:focused']).toBeUndefined();

			await wrapper.rerender({
				data: makeData(),
				autofocusGroupId: 'g1',
				dimensions: { width: 500, height: GROUP_HEADER_HEIGHT },
				readOnly: false,
			});

			await waitFor(() => {
				expect(input).toHaveFocus();
				expect(input.selectionStart).toBe(0);
				expect(input.selectionEnd).toBe(input.value.length);
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
	});
});
