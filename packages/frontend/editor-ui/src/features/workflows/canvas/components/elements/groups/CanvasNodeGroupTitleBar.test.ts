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
		viewport: { value: { x: 0, y: 0, zoom: 1 } },
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
		isCollapsed: true,
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
			selected: boolean;
		}> = {},
	) {
		return renderComponent(CanvasNodeGroupTitleBar, {
			pinia: createTestingPinia(),
			props: {
				data: props.data ?? makeData(),
				autofocusGroupId: props.autofocusGroupId ?? null,
				dimensions: props.dimensions,
				readOnly: props.readOnly ?? false,
				selected: props.selected ?? false,
			},
		});
	}

	describe('chevron caption and icon by state', () => {
		it('renders chevrons-up-down with Expand label when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			const toggle = wrapper.getByTestId('canvas-node-group-toggle');
			expect(toggle.getAttribute('aria-label')).toBe('Expand');
			expect(toggle.getAttribute('aria-expanded')).toBe('false');
			expect(toggle.querySelector('svg')).toBeTruthy();
		});

		it('renders chevrons-down-up with Collapse label when expanded', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const toggle = wrapper.getByTestId('canvas-node-group-toggle');
			expect(toggle.getAttribute('aria-label')).toBe('Collapse');
			expect(toggle.getAttribute('aria-expanded')).toBe('true');
		});

		it('emits toggle when chevron is clicked', async () => {
			const wrapper = render();
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-toggle'));
			expect(wrapper.emitted().toggle).toEqual([['g1']]);
		});
	});

	describe('double-click to toggle collapse', () => {
		it('emits toggle when the group body is double-clicked', async () => {
			const wrapper = render();
			await fireEvent.dblClick(wrapper.getByTestId('canvas-node-group-header'));
			expect(wrapper.emitted().toggle).toEqual([['g1']]);
		});

		it('does not emit toggle when the title is double-clicked', async () => {
			const wrapper = render();
			const titleArea = wrapper.getByTestId('canvas-node-group-title');
			const titleEdit = titleArea.querySelector('.nodrag') as HTMLElement;
			await fireEvent.dblClick(titleEdit);
			expect(wrapper.emitted().toggle).toBeUndefined();
		});

		it('does not emit toggle when the ungroup button is double-clicked', async () => {
			const wrapper = render();
			await fireEvent.dblClick(wrapper.getByTestId('canvas-node-group-ungroup'));
			expect(wrapper.emitted().toggle).toBeUndefined();
		});
	});

	describe('height invariant; nodrag on interactive children', () => {
		it('has the fixed header height when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			const el = wrapper.getByTestId('canvas-node-group') as HTMLElement;
			expect(el.style.height).toBe(`${GROUP_HEADER_HEIGHT}px`);
		});

		it('has the fixed header height when expanded', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const el = wrapper.getByTestId('canvas-node-group') as HTMLElement;
			expect(el.style.height).toBe(`${GROUP_HEADER_HEIGHT}px`);
		});

		it('chevron carries nodrag so VueFlow does not drag on click', () => {
			const wrapper = render();
			const toggle = wrapper.getByTestId('canvas-node-group-toggle');
			expect(toggle.classList.contains('nodrag')).toBe(true);
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

	describe('frame visibility', () => {
		it('renders the frame around the nodes when expanded', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			expect(wrapper.queryByTestId('canvas-node-group-frame')).toBeTruthy();
		});

		it('hides the frame when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			expect(wrapper.queryByTestId('canvas-node-group-frame')).toBeNull();
		});
	});

	describe('execution-status classes', () => {
		it('applies no status class when executionStatus is undefined (idle)', () => {
			const wrapper = render({ data: makeData({ executionStatus: undefined }) });
			const root = wrapper.getByTestId('canvas-node-group');
			// No status icon and no .success / .error / .running class semantics.
			expect(wrapper.queryByTestId('canvas-node-group-status-success')).toBeNull();
			expect(wrapper.queryByTestId('canvas-node-group-status-error')).toBeNull();
			// status classes are CSS module hashed; we can only check via test ids.
			expect(root).toBeTruthy();
		});

		it('shows success icon when executionStatus is success', () => {
			const wrapper = render({
				data: makeData({ executionStatus: 'success' }),
			});
			expect(wrapper.getByTestId('canvas-node-group-status-success')).toBeTruthy();
		});

		it('shows error icon when executionStatus is error', () => {
			const wrapper = render({
				data: makeData({ executionStatus: 'error' }),
			});
			expect(wrapper.getByTestId('canvas-node-group-status-error')).toBeTruthy();
		});

		it('shows warning icon when executionStatus is warning (a member node is dirty)', () => {
			const wrapper = render({
				data: makeData({ executionStatus: 'warning' }),
			});
			expect(wrapper.getByTestId('canvas-node-group-status-warning')).toBeTruthy();
		});

		it('shows the validation issues triangle when executionStatus is issues', () => {
			const wrapper = render({
				data: makeData({ executionStatus: 'issues' }),
			});
			expect(wrapper.getByTestId('canvas-node-group-status-issues')).toBeTruthy();
			// Issues must not render the execution-error mark.
			expect(wrapper.queryByTestId('canvas-node-group-status-error')).toBeNull();
		});

		it('hides the status mark when the group is expanded (member nodes show their own)', () => {
			const wrapper = render({
				data: makeData({ executionStatus: 'success', isCollapsed: false }),
			});
			expect(wrapper.queryByTestId('canvas-node-group-status-success')).toBeNull();
		});

		it('hides the validation issues triangle when the group is expanded', () => {
			const wrapper = render({
				data: makeData({ executionStatus: 'issues', isCollapsed: false }),
			});
			expect(wrapper.queryByTestId('canvas-node-group-status-issues')).toBeNull();
		});

		it('applies a hashed `running` class when executionStatus is running', () => {
			const wrapper = render({
				data: makeData({ executionStatus: 'running' }),
			});
			const root = wrapper.getByTestId('canvas-node-group');
			expect([...root.classList].some((c) => /running/i.test(c))).toBe(true);
		});

		it('applies a hashed `waiting` class when executionStatus is waiting', () => {
			const wrapper = render({
				data: makeData({ executionStatus: 'waiting' }),
			});
			const root = wrapper.getByTestId('canvas-node-group');
			expect([...root.classList].some((c) => /waiting/i.test(c))).toBe(true);
		});
	});

	describe('title rename + ungroup parity with old overlay', () => {
		it('emits update:name on commit', async () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
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

		it('preserves selection when this title bar is part of it (multi-select group drag)', () => {
			// VueFlow node id for this group is `group:${baseGroup.id}`
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
