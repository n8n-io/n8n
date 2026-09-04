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
			const self = this as unknown as { id: string; isConnectable: boolean };
			return h('div', {
				class: 'vue-flow__handle',
				'data-handle-id': self.id,
				'data-connectable': String(self.isConnectable),
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

// A real `ref` so template `v-if` auto-unwraps it like the production computed.
const { isNodeContextEnabled } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { ref } = require('vue');
	return { isNodeContextEnabled: ref(false) };
});
vi.mock('@/features/ai/instanceAi/composables/useIsNodeContextEnabled', () => ({
	useIsNodeContextEnabled: () => isNodeContextEnabled,
}));

import CanvasNodeGroupTitleBar from './CanvasNodeGroupTitleBar.vue';
import {
	GROUP_EMPTY_BODY_HEIGHT,
	GROUP_HEADER_HEIGHT,
} from '../../../stores/canvasNodeGroups.constants';
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
		isEmptyGroup: false,
		...overrides,
	};
}

// An empty group is always rendered collapsed by the mapping.
const emptyData = (overrides: Partial<CanvasGroupNodeData> = {}) =>
	makeData({ isCollapsed: true, isEmptyGroup: true, ...overrides });

const withDescription = (description: string, overrides: Partial<CanvasGroupNodeData> = {}) =>
	makeData({ group: { ...baseGroup, description }, ...overrides });

describe('CanvasNodeGroupTitleBar', () => {
	beforeEach(() => {
		viewportRef.value = { x: 0, y: 0, zoom: 1 };
		isNodeContextEnabled.value = false;
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
	) {
		return renderComponent(CanvasNodeGroupTitleBar, {
			pinia: createTestingPinia(),
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

	describe('add to chat', () => {
		it('hides the add-to-chat button when the node-context flag is off', () => {
			isNodeContextEnabled.value = false;
			const wrapper = render();
			expect(wrapper.queryByTestId('canvas-node-group-add-to-chat')).toBeNull();
		});

		it('shows the button when the flag is on and emits add-nodes-to-chat with the group id', async () => {
			isNodeContextEnabled.value = true;
			const wrapper = render();
			const btn = wrapper.getByTestId('canvas-node-group-add-to-chat');
			await fireEvent.click(btn);
			expect(wrapper.emitted()['add-nodes-to-chat']).toEqual([['g1']]);
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

		it('does not emit open:contextmenu while the description is being edited', async () => {
			const wrapper = render();
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			await fireEvent.contextMenu(wrapper.getByTestId('canvas-node-group-description-input'));

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

		// Clicking the description opens the editor; it must not also toggle the group.
		it('stops clicks on the description', async () => {
			const wrapper = render();
			const outsideListener = vi.fn();
			wrapper.container.addEventListener('click', outsideListener);
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			expect(outsideListener).not.toHaveBeenCalled();
		});
	});

	describe('card height; nodrag on interactive children', () => {
		it('has the header height when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			const el = wrapper.getByTestId('canvas-node-group') as HTMLElement;
			expect(el.style.height).toBe(`${GROUP_HEADER_HEIGHT}px`);
		});

		it('has the header height when expanded', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const el = wrapper.getByTestId('canvas-node-group') as HTMLElement;
			expect(el.style.height).toBe(`${GROUP_HEADER_HEIGHT}px`);
		});

		// The VueFlow node is sized the same way (getGroupCardHeight), so the side
		// handles land at the middle of the whole card.
		it('has the header plus add-node body height when empty', () => {
			const wrapper = render({ data: emptyData() });
			const el = wrapper.getByTestId('canvas-node-group') as HTMLElement;
			expect(el.style.height).toBe(`${GROUP_HEADER_HEIGHT + GROUP_EMPTY_BODY_HEIGHT}px`);
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

		it('description and add-node button carry nodrag', () => {
			const wrapper = render({ data: emptyData() });
			expect(
				wrapper.getByTestId('canvas-node-group-description').classList.contains('nodrag'),
			).toBe(true);
			expect(wrapper.getByTestId('canvas-node-group-add-node').classList.contains('nodrag')).toBe(
				true,
			);
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

		it('never renders the frame for an empty group', () => {
			const wrapper = render({ data: emptyData() });
			expect(wrapper.queryByTestId('canvas-node-group-frame')).toBeNull();
		});
	});

	// The description lives inside the card header in every state: under the
	// title, clamped to one line when expanded and two when collapsed.
	describe('description', () => {
		it.each([
			{
				label: 'expanded',
				data: withDescription('Look up firmographic data', { isCollapsed: false }),
			},
			{
				label: 'collapsed',
				data: withDescription('Look up firmographic data', { isCollapsed: true }),
			},
			{
				label: 'empty',
				data: withDescription('Look up firmographic data', { isEmptyGroup: true }),
			},
		])('shows the description text inline in the header when $label', ({ data }) => {
			const wrapper = render({ data });
			const header = within(wrapper.getByTestId('canvas-node-group-header'));
			expect(header.getByTestId('canvas-node-group-description-text')).toHaveTextContent(
				'Look up firmographic data',
			);
		});

		it('shows the italic add-description placeholder when there is no description', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const text = wrapper.getByTestId('canvas-node-group-description-text');
			expect(text).toHaveTextContent('Add a description...');
			expect([...text.classList].some((c) => /descriptionEmpty/i.test(c))).toBe(true);
		});

		it('clamps to one line when expanded and two lines when collapsed', () => {
			const expanded = render({ data: withDescription('x', { isCollapsed: false }) });
			const expandedText = expanded.getByTestId('canvas-node-group-description-text');
			expect([...expandedText.classList].some((c) => /oneLine/i.test(c))).toBe(true);
			expanded.unmount();

			const collapsed = render({ data: withDescription('x', { isCollapsed: true }) });
			const collapsedText = collapsed.getByTestId('canvas-node-group-description-text');
			expect([...collapsedText.classList].some((c) => /twoLines/i.test(c))).toBe(true);
		});

		it('hides the description below the zoom threshold but keeps the header', () => {
			viewportRef.value = { x: 0, y: 0, zoom: 0.5 };
			const wrapper = render({ data: withDescription('x') });
			expect(wrapper.queryByTestId('canvas-node-group-description')).toBeNull();
			expect(wrapper.getByTestId('canvas-node-group-header')).toBeInTheDocument();
			const el = wrapper.getByTestId('canvas-node-group') as HTMLElement;
			expect(el.style.height).toBe(`${GROUP_HEADER_HEIGHT}px`);
		});

		it('opens the editor with the current text when the description is clicked', async () => {
			const wrapper = render({ data: withDescription('Before') });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));

			const input = wrapper.getByTestId(
				'canvas-node-group-description-input',
			) as HTMLTextAreaElement;
			expect(input.value).toBe('Before');
		});

		it('does not open the editor in read-only mode', async () => {
			const wrapper = render({ data: withDescription('Before'), readOnly: true });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));

			expect(wrapper.queryByTestId('canvas-node-group-description-input')).toBeNull();
		});

		it('emits update:description on blur', async () => {
			const wrapper = render({ data: withDescription('Before') });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'After');
			await fireEvent.blur(input);

			expect(wrapper.emitted()['update:description']).toEqual([['g1', 'After']]);
		});

		it('emits update:description and closes on Enter', async () => {
			const wrapper = render({ data: withDescription('Before') });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'After');
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(wrapper.emitted()['update:description']).toEqual([['g1', 'After']]);
			expect(wrapper.queryByTestId('canvas-node-group-description-input')).toBeNull();
		});

		it('keeps editing and does not commit on Shift+Enter', async () => {
			const wrapper = render({ data: withDescription('Before') });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'After');
			await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

			expect(wrapper.emitted()['update:description']).toBeUndefined();
			expect(wrapper.queryByTestId('canvas-node-group-description-input')).toBeTruthy();
		});

		it('discards edits on Escape', async () => {
			const wrapper = render({ data: withDescription('Before') });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'Changed');
			await fireEvent.keyDown(input, { key: 'Escape' });

			expect(wrapper.emitted()['update:description']).toBeUndefined();
			expect(wrapper.getByTestId('canvas-node-group-description-text')).toHaveTextContent('Before');
		});

		it('discards edits when cancel is clicked', async () => {
			const wrapper = render({ data: withDescription('Before') });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'Changed');
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-cancel'));

			expect(wrapper.emitted()['update:description']).toBeUndefined();
			expect(wrapper.getByTestId('canvas-node-group-description-text')).toHaveTextContent('Before');
		});

		it('does not emit when the text is unchanged', async () => {
			const wrapper = render({ data: withDescription('Same') });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-save'));

			expect(wrapper.emitted()['update:description']).toBeUndefined();
		});

		it('shows Build on an empty group and emits update:description then generate', async () => {
			const wrapper = render({ data: emptyData() });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'Pull CRM contacts');
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-build'));

			expect(wrapper.emitted()['update:description']).toEqual([['g1', 'Pull CRM contacts']]);
			expect(wrapper.emitted().generate).toEqual([['g1']]);
		});

		it('does not emit generate when Save is clicked', async () => {
			const wrapper = render({ data: emptyData() });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));
			const input = wrapper.getByTestId('canvas-node-group-description-input');
			await fireEvent.update(input, 'Pull CRM contacts');
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-save'));

			expect(wrapper.emitted()['update:description']).toEqual([['g1', 'Pull CRM contacts']]);
			expect(wrapper.emitted().generate).toBeUndefined();
		});

		it('hides Build when the group is not empty', async () => {
			const wrapper = render({ data: withDescription('x') });
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-description-text'));

			expect(wrapper.queryByTestId('canvas-node-group-description-build')).toBeNull();
			expect(wrapper.getByTestId('canvas-node-group-description-save')).toBeInTheDocument();
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

	// The header's right slot shows the EMPTY badge on an empty group and the
	// collapse chevron on a filled one; the add-node "+" fills the empty body.
	describe('empty group card', () => {
		it('shows the EMPTY badge instead of the chevron when the group is empty', () => {
			const wrapper = render({ data: emptyData() });
			expect(wrapper.getByTestId('canvas-node-group-empty-badge')).toBeInTheDocument();
			expect(wrapper.queryByTestId('canvas-node-group-toggle')).toBeNull();
		});

		it('shows the chevron instead of the EMPTY badge when the group is filled', () => {
			const wrapper = render({ data: makeData({ isEmptyGroup: false }) });
			expect(wrapper.queryByTestId('canvas-node-group-empty-badge')).toBeNull();
			expect(wrapper.getByTestId('canvas-node-group-toggle')).toBeInTheDocument();
		});

		it('renders the add-node body with a "+" that emits add-node', async () => {
			const wrapper = render({ data: emptyData() });
			const body = within(wrapper.getByTestId('canvas-node-group-body'));
			await fireEvent.click(body.getByTestId('canvas-node-group-add-node'));
			expect(wrapper.emitted()['add-node']).toEqual([['g1']]);
		});

		it('has no body or "+" when the group is not empty', () => {
			const wrapper = render({ data: makeData({ isEmptyGroup: false }) });
			expect(wrapper.queryByTestId('canvas-node-group-body')).toBeNull();
			expect(wrapper.queryByTestId('canvas-node-group-add-node')).toBeNull();
		});

		it('hides the "+" in read-only mode', () => {
			const wrapper = render({ data: emptyData(), readOnly: true });
			expect(wrapper.queryByTestId('canvas-node-group-add-node')).toBeNull();
		});

		// An empty group holds only a hidden placeholder: ungrouping would strand it
		// on the canvas and there is nothing to add to the chat.
		it('hides the ungroup and add-to-chat buttons when the group is empty', () => {
			isNodeContextEnabled.value = true;
			const wrapper = render({ data: emptyData() });

			expect(wrapper.queryByTestId('canvas-node-group-ungroup')).toBeNull();
			expect(wrapper.queryByTestId('canvas-node-group-add-to-chat')).toBeNull();
		});

		it('does not show a standalone generate button', () => {
			const wrapper = render({ data: emptyData() });
			expect(wrapper.queryByTestId('canvas-node-group-generate')).toBeNull();
		});
	});

	// Collapsed cards (empty or filled) show their handles as dots because edges
	// re-anchor onto them; only an empty card accepts new connections.
	describe('handles', () => {
		function handles(wrapper: ReturnType<typeof render>) {
			return [...wrapper.getByTestId('canvas-node-group').querySelectorAll('.vue-flow__handle')];
		}

		it('renders left and right handles', () => {
			const wrapper = render();
			expect(handles(wrapper).length).toBe(2);
		});

		it('shows the handle dots on a collapsed card and hides them when expanded', () => {
			const collapsed = render({ data: makeData({ isCollapsed: true }) });
			for (const handle of handles(collapsed)) {
				expect([...handle.classList].some((c) => /handleVisible/i.test(c))).toBe(true);
			}
			collapsed.unmount();

			const expanded = render({ data: makeData({ isCollapsed: false }) });
			for (const handle of handles(expanded)) {
				expect([...handle.classList].some((c) => /handleVisible/i.test(c))).toBe(false);
			}
		});

		it('is connectable only on an empty card that is not read-only', () => {
			const empty = render({ data: emptyData() });
			for (const handle of handles(empty)) {
				expect(handle.getAttribute('data-connectable')).toBe('true');
			}
			empty.unmount();

			const filled = render({ data: makeData({ isCollapsed: true }) });
			for (const handle of handles(filled)) {
				expect(handle.getAttribute('data-connectable')).toBe('false');
			}
			filled.unmount();

			const readOnly = render({ data: emptyData(), readOnly: true });
			for (const handle of handles(readOnly)) {
				expect(handle.getAttribute('data-connectable')).toBe('false');
			}
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
