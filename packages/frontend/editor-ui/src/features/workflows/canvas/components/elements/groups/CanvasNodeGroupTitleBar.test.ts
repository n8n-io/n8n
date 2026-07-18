import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { h } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';

// Handle requires a <VueFlow> ancestor. Mock it as an inert div so the
// title bar can render in isolation. Other VueFlow imports are type-only.
const removeSelectedNodesMock = vi.fn();
const selectedNodesRef = { value: [] as Array<{ id: string }> };
// Mutable so tests can drive zoom-based gating.
const viewportRef = { value: { x: 0, y: 0, zoom: 1 } };
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
		viewport: viewportRef,
	}),
}));

import CanvasNodeGroupTitleBar from './CanvasNodeGroupTitleBar.vue';
import { GROUP_HEADER_HEIGHT } from '../../../stores/canvasNodeGroups.constants';
import { useCanvasNodeGroupDescriptionVisibility } from '../../../composables/useCanvasNodeGroupDescriptionVisibility';
import { NodeGroupDescriptionVisibilityKey } from '../../../composables/useCanvasNodeGroupDescriptionVisibility';
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
	beforeEach(() => {
		viewportRef.value = { x: 0, y: 0, zoom: 1 };
		localStorage.clear();
	});

	function render(
		props: Partial<{
			data: CanvasGroupNodeData;
			autofocusGroupId: string | null;
			dimensions: { width: number; height: number };
			readOnly: boolean;
			selected: boolean;
			canExtract: boolean;
		}> = {},
		descriptionVisibility?: ReturnType<typeof useCanvasNodeGroupDescriptionVisibility>,
	) {
		return renderComponent(CanvasNodeGroupTitleBar, {
			pinia: createTestingPinia(),
			global: {
				provide: descriptionVisibility
					? { [NodeGroupDescriptionVisibilityKey as symbol]: descriptionVisibility }
					: {},
			},
			props: {
				data: props.data ?? makeData(),
				autofocusGroupId: props.autofocusGroupId ?? null,
				dimensions: props.dimensions,
				readOnly: props.readOnly ?? false,
				selected: props.selected ?? false,
				canExtract: props.canExtract ?? false,
			},
		});
	}

	describe('chevron caption and icon by state', () => {
		it('renders chevron-down with Expand label when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			const toggle = wrapper.getByTestId('canvas-node-group-toggle');
			expect(toggle.getAttribute('aria-label')).toBe('Expand');
			expect(toggle.getAttribute('aria-expanded')).toBe('false');
			expect(toggle.querySelector('svg')).toBeTruthy();
		});

		it('renders chevron-up with Collapse label when expanded', () => {
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

	describe('context menu', () => {
		it('emits open:contextmenu with the group id on right-click', async () => {
			const wrapper = render();
			await fireEvent.contextMenu(wrapper.getByTestId('canvas-node-group'));

			const emitted = wrapper.emitted()['open:contextmenu'] as Array<[string, MouseEvent]>;
			expect(emitted).toHaveLength(1);
			expect(emitted[0][0]).toBe('g1');
			expect(emitted[0][1]).toBeInstanceOf(MouseEvent);
		});

		it('emits open:contextmenu when right-clicking the title preview', async () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const title = within(wrapper.getByTestId('canvas-node-group-title'));
			await fireEvent.contextMenu(title.getByTestId('inline-edit-preview'));

			expect(wrapper.emitted()['open:contextmenu']).toHaveLength(1);
		});

		it('emits open:contextmenu when right-clicking the collapsed title', async () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			await fireEvent.contextMenu(wrapper.getByTestId('canvas-node-group-collapsed-title'));

			expect(wrapper.emitted()['open:contextmenu']).toHaveLength(1);
		});

		it('does not emit open:contextmenu while the title is being edited', async () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const title = within(wrapper.getByTestId('canvas-node-group-title'));
			await fireEvent.click(title.getByTestId('inline-edit-preview'));
			await fireEvent.contextMenu(title.getByTestId('inline-edit-input'));

			expect(wrapper.emitted()['open:contextmenu']).toBeUndefined();
		});
	});

	describe('double-click does nothing', () => {
		it('does not emit toggle when the group body is double-clicked', async () => {
			const wrapper = render();
			await fireEvent.dblClick(wrapper.getByTestId('canvas-node-group-header'));
			expect(wrapper.emitted().toggle).toBeUndefined();
		});

		it('stops double-click propagation so the canvas does not zoom', async () => {
			const wrapper = render();
			const outsideListener = vi.fn();
			wrapper.container.addEventListener('dblclick', outsideListener);
			await fireEvent.dblClick(wrapper.getByTestId('canvas-node-group-header'));
			expect(outsideListener).not.toHaveBeenCalled();
		});
	});

	describe('click propagation to the VueFlow node wrapper', () => {
		// Plain clicks must bubble: Canvas.onNodeClick turns them into a
		// collapse/expand toggle.
		it('lets plain header clicks bubble', async () => {
			const wrapper = render();
			const outsideListener = vi.fn();
			wrapper.container.addEventListener('click', outsideListener);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-header'));
			expect(outsideListener).toHaveBeenCalled();
		});

		it('stops clicks on the title edit so renaming does not select or toggle the group', async () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const title = within(wrapper.getByTestId('canvas-node-group-title'));
			const outsideListener = vi.fn();
			wrapper.container.addEventListener('click', outsideListener);
			await fireEvent.click(title.getByTestId('inline-edit-preview'));
			expect(outsideListener).not.toHaveBeenCalled();
		});

		it('lets title clicks bubble when collapsed, where the title is not editable', async () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			const outsideListener = vi.fn();
			wrapper.container.addEventListener('click', outsideListener);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-collapsed-title'));
			expect(outsideListener).toHaveBeenCalled();
		});

		it('stops clicks on the chevron toggle button', async () => {
			const wrapper = render();
			const outsideListener = vi.fn();
			wrapper.container.addEventListener('click', outsideListener);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-toggle'));
			expect(outsideListener).not.toHaveBeenCalled();
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

		it('title edit carries nodrag when expanded', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const titleArea = wrapper.getByTestId('canvas-node-group-title');
			expect(titleArea.querySelector('.nodrag')).toBeTruthy();
		});

		it('title is a plain drag surface when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			const titleArea = wrapper.getByTestId('canvas-node-group-title');
			expect(titleArea.querySelector('.nodrag')).toBeNull();
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

	describe('description', () => {
		it('shows the description under the title when expanded', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			expect(wrapper.queryByTestId('canvas-node-group-description')).toBeTruthy();
		});

		it('hides the description when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			expect(wrapper.queryByTestId('canvas-node-group-description')).toBeNull();
		});

		it('shows the add-description placeholder when empty', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const description = within(wrapper.getByTestId('canvas-node-group-description'));
			expect(description.getByTestId('inline-edit-preview')).toHaveTextContent('Add description');
		});

		it('emits update:description when the description is edited', async () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });

			const description = within(wrapper.getByTestId('canvas-node-group-description'));
			await fireEvent.click(description.getByTestId('inline-edit-preview'));
			const input = description.getByTestId('inline-edit-input') as HTMLInputElement;
			await fireEvent.update(input, 'A helpful description');
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(wrapper.emitted()['update:description']).toEqual([['g1', 'A helpful description']]);
		});
	});

	describe('collapsed description', () => {
		const withDescription = (description: string) =>
			makeData({ isCollapsed: true, group: { ...baseGroup, description } });

		it('shows the info icon when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			expect(wrapper.queryByTestId('canvas-node-group-info')).toBeTruthy();
		});

		it('hides the info icon and description below the zoom threshold', () => {
			viewportRef.value = { x: 0, y: 0, zoom: 0.5 };
			const collapsed = render({ data: makeData({ isCollapsed: true }) });
			expect(collapsed.queryByTestId('canvas-node-group-info')).toBeNull();

			const expanded = render({ data: makeData({ isCollapsed: false }) });
			expect(expanded.queryByTestId('canvas-node-group-description')).toBeNull();
		});

		it('shows the pinned description panel with the description text', () => {
			const visibility = useCanvasNodeGroupDescriptionVisibility({
				workflowId: () => 'wf-1',
				getCurrentGroups: () => [{ id: 'g1', name: 'My group', nodeIds: [], description: 'x' }],
				onNodeGroupsChange: () => ({ off: () => {} }),
			});
			visibility.setVisible('g1', true);

			const wrapper = render({ data: withDescription('Pinned copy') }, visibility);

			expect(wrapper.getByTestId('canvas-node-group-description-panel')).toBeVisible();
			expect(wrapper.getByTestId('canvas-node-group-description-text')).toHaveTextContent(
				'Pinned copy',
			);
			// Pinned → info icon is replaced by the panel, pin shows eye-off.
			expect(wrapper.queryByTestId('canvas-node-group-info')).toBeNull();
		});

		it('unpins the description when the pin button is clicked', async () => {
			const visibility = useCanvasNodeGroupDescriptionVisibility({
				workflowId: () => 'wf-1',
				getCurrentGroups: () => [{ id: 'g1', name: 'My group', nodeIds: [], description: 'x' }],
				onNodeGroupsChange: () => ({ off: () => {} }),
			});
			visibility.setVisible('g1', true);

			const wrapper = render({ data: withDescription('Pinned copy') }, visibility);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-pin-description'));

			expect(visibility.isVisible('g1')).toBe(false);
		});

		it('starts editing when the edit icon is clicked', async () => {
			const visibility = useCanvasNodeGroupDescriptionVisibility({
				workflowId: () => 'wf-1',
				getCurrentGroups: () => [{ id: 'g1', name: 'My group', nodeIds: [], description: 'x' }],
				onNodeGroupsChange: () => ({ off: () => {} }),
			});
			visibility.setVisible('g1', true);

			const wrapper = render({ data: withDescription('Before') }, visibility);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-edit-description'));

			expect(wrapper.queryByTestId('canvas-node-group-description-input')).toBeTruthy();
		});

		it('emits update:description when editing from the pinned panel', async () => {
			const visibility = useCanvasNodeGroupDescriptionVisibility({
				workflowId: () => 'wf-1',
				getCurrentGroups: () => [{ id: 'g1', name: 'My group', nodeIds: [], description: 'x' }],
				onNodeGroupsChange: () => ({ off: () => {} }),
			});
			visibility.setVisible('g1', true);

			const wrapper = render({ data: withDescription('Before') }, visibility);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'After');
			await fireEvent.blur(input);

			expect(wrapper.emitted()['update:description']).toEqual([['g1', 'After']]);
		});

		it('emits update:description when Enter is pressed', async () => {
			const visibility = useCanvasNodeGroupDescriptionVisibility({
				workflowId: () => 'wf-1',
				getCurrentGroups: () => [{ id: 'g1', name: 'My group', nodeIds: [], description: 'x' }],
				onNodeGroupsChange: () => ({ off: () => {} }),
			});
			visibility.setVisible('g1', true);

			const wrapper = render({ data: withDescription('Before') }, visibility);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'After');
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(wrapper.emitted()['update:description']).toEqual([['g1', 'After']]);
			expect(wrapper.queryByTestId('canvas-node-group-description-input')).toBeNull();
		});

		it('keeps editing and does not commit on Shift+Enter', async () => {
			const visibility = useCanvasNodeGroupDescriptionVisibility({
				workflowId: () => 'wf-1',
				getCurrentGroups: () => [{ id: 'g1', name: 'My group', nodeIds: [], description: 'x' }],
				onNodeGroupsChange: () => ({ off: () => {} }),
			});
			visibility.setVisible('g1', true);

			const wrapper = render({ data: withDescription('Before') }, visibility);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'After');
			await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

			expect(wrapper.emitted()['update:description']).toBeUndefined();
			expect(wrapper.queryByTestId('canvas-node-group-description-input')).toBeTruthy();
		});

		it('discards edits when cancel is clicked', async () => {
			const visibility = useCanvasNodeGroupDescriptionVisibility({
				workflowId: () => 'wf-1',
				getCurrentGroups: () => [{ id: 'g1', name: 'My group', nodeIds: [], description: 'x' }],
				onNodeGroupsChange: () => ({ off: () => {} }),
			});
			visibility.setVisible('g1', true);

			const wrapper = render({ data: withDescription('Before') }, visibility);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-edit-description'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'Changed');
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-cancel'));

			expect(wrapper.emitted()['update:description']).toBeUndefined();
			expect(wrapper.getByTestId('canvas-node-group-description-text')).toHaveTextContent('Before');
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

	describe('deactivated state', () => {
		it('shows the deactivated label next to the name when every member node is disabled', () => {
			const wrapper = render({ data: makeData({ allNodesDisabled: true }) });
			expect(wrapper.getByTestId('canvas-node-group-deactivated-label')).toHaveTextContent(
				'(Deactivated)',
			);
		});

		it('applies a hashed `deactivated` class for the toned-down title styling', () => {
			const wrapper = render({ data: makeData({ allNodesDisabled: true }) });
			const root = wrapper.getByTestId('canvas-node-group');
			expect([...root.classList].some((c) => /deactivated/i.test(c))).toBe(true);
		});

		it('hides the deactivated label while any member node is enabled', () => {
			const wrapper = render();
			expect(wrapper.queryByTestId('canvas-node-group-deactivated-label')).toBeNull();
			const root = wrapper.getByTestId('canvas-node-group');
			expect([...root.classList].some((c) => /deactivated/i.test(c))).toBe(false);
		});
	});

	describe('title rename + ungroup parity with old overlay', () => {
		it('emits update:name on commit', async () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const title = within(wrapper.getByTestId('canvas-node-group-title'));
			await fireEvent.click(title.getByTestId('inline-edit-preview'));
			const input = title.getByTestId('inline-edit-input') as HTMLInputElement;
			await fireEvent.update(input, 'Renamed');
			await fireEvent.keyDown(input, { key: 'Enter' });
			expect(wrapper.emitted()['update:name']).toEqual([['g1', 'Renamed']]);
		});

		it('emits ungroup when Ungroup is clicked', async () => {
			const wrapper = render();
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-ungroup'));
			expect(wrapper.emitted().ungroup).toEqual([['g1']]);
		});

		// The toolbar offers the same actions whether the group is collapsed or
		// expanded.
		it.each([{ isCollapsed: true }, { isCollapsed: false }])(
			'shows the convert-to-sub-workflow button next to Ungroup and emits extract on click (isCollapsed: $isCollapsed)',
			async ({ isCollapsed }) => {
				const wrapper = render({ data: makeData({ isCollapsed }), canExtract: true });

				expect(wrapper.getByTestId('canvas-node-group-ungroup')).toBeInTheDocument();
				const button = wrapper.getByTestId('canvas-node-group-extract');
				expect(button.getAttribute('aria-label')).toBe('Convert group to sub-workflow');
				expect(button.classList.contains('nodrag')).toBe(true);

				await fireEvent.click(button);
				expect(wrapper.emitted().extract).toEqual([['g1']]);
			},
		);

		it('hides the convert-to-sub-workflow button when the group cannot be extracted', () => {
			const wrapper = render({ canExtract: false });
			expect(wrapper.queryByTestId('canvas-node-group-extract')).toBeNull();
		});

		it('hides the ungroup toolbar in read-only mode', () => {
			const wrapper = render({ readOnly: true });
			expect(wrapper.queryByTestId('canvas-node-group-toolbar')).toBeNull();
		});

		it('focuses the title when autofocusGroupId matches the group', async () => {
			const wrapper = render({
				data: makeData({ isCollapsed: false }),
				autofocusGroupId: 'g1',
			});
			const title = within(wrapper.getByTestId('canvas-node-group-title'));
			const input = title.getByTestId('inline-edit-input') as HTMLInputElement;

			await waitFor(() => {
				expect(input).toHaveFocus();
				expect(input.selectionStart).toBe(0);
				expect(input.selectionEnd).toBe(input.value.length);
				expect(wrapper.emitted()['title:focused']).toEqual([['g1']]);
			});
		});

		it('waits for VueFlow to initialize node dimensions before focusing the title', async () => {
			const wrapper = render({
				data: makeData({ isCollapsed: false }),
				autofocusGroupId: 'g1',
				dimensions: { width: 0, height: 0 },
			});
			const title = within(wrapper.getByTestId('canvas-node-group-title'));
			const input = title.getByTestId('inline-edit-input') as HTMLInputElement;

			await flushPromises();

			expect(input).not.toHaveFocus();
			expect(wrapper.emitted()['title:focused']).toBeUndefined();

			await wrapper.rerender({
				data: makeData({ isCollapsed: false }),
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

		// Collapsed groups rename through the modal (Canvas.onOpenGroupRenameModal),
		// so the inline editor is replaced by a plain, wrappable title while collapsed.
		it('renders a plain non-editable title instead of the inline editor when collapsed', async () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });

			expect(wrapper.queryByTestId('inline-edit-input')).toBeNull();
			const title = wrapper.getByTestId('canvas-node-group-collapsed-title');
			expect(title).toHaveTextContent('My group');

			await fireEvent.click(title);
			await flushPromises();

			expect(wrapper.emitted()['update:name']).toBeUndefined();
		});

		it('does not autofocus the title when collapsed', async () => {
			const wrapper = render({
				data: makeData({ isCollapsed: true }),
				autofocusGroupId: 'g1',
			});

			await flushPromises();

			expect(wrapper.queryByTestId('inline-edit-input')).toBeNull();
			expect(wrapper.emitted()['title:focused']).toBeUndefined();
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

		it('preserves selection on modifier-click (additive multi-select)', () => {
			selectedNodesRef.value = [{ id: 'unrelated-node' }];
			removeSelectedNodesMock.mockClear();
			const wrapper = render();
			void fireEvent.pointerDown(wrapper.getByTestId('canvas-node-group'), { metaKey: true });
			void fireEvent.pointerDown(wrapper.getByTestId('canvas-node-group'), { ctrlKey: true });
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

		it('renders a full-group selection ring when expanded and selected', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }), selected: true });
			expect(wrapper.getByTestId('canvas-node-group-selection-ring')).toBeInTheDocument();
		});

		it('does not render the selection ring when collapsed or unselected', () => {
			const collapsedSelected = render({ data: makeData({ isCollapsed: true }), selected: true });
			expect(
				collapsedSelected.queryByTestId('canvas-node-group-selection-ring'),
			).not.toBeInTheDocument();
			collapsedSelected.unmount();

			const expandedUnselected = render({
				data: makeData({ isCollapsed: false }),
				selected: false,
			});
			expect(
				expandedUnselected.queryByTestId('canvas-node-group-selection-ring'),
			).not.toBeInTheDocument();
		});
	});
});
