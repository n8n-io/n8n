import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { h } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';

// VueFlow's Handle component requires a <VueFlow> ancestor; mock it as an
// inert div so we can render the title bar in isolation. Other VueFlow
// exports we use are type-only (Position, NodeProps), so this mock is
// safe.
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
}));

import CanvasNodeGroupTitleBar from './CanvasNodeGroupTitleBar.vue';
import { GROUP_HEADER_HEIGHT } from '../../../stores/canvasNodeGroups.constants';
import type { CanvasNodeGroupData, GroupExecutionStatus } from '../../../canvas.types';

const baseGroup: IWorkflowGroup = {
	id: 'g1',
	nodeIds: ['a', 'b'],
	name: 'My group',
};

function makeData(overrides: Partial<CanvasNodeGroupData> = {}): CanvasNodeGroupData {
	return {
		group: baseGroup,
		memberRect: { x: 0, y: 0, width: 500, height: 100 },
		isCollapsed: true,
		autofocusTitle: false,
		groupStatus: undefined,
		runDataIterations: 0,
		...overrides,
	};
}

describe('CanvasNodeGroupTitleBar', () => {
	function render(
		props: Partial<{
			data: CanvasNodeGroupData;
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

	describe('chevron caption and icon by state', () => {
		it('renders chevrons-up-down with Expand label when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			const toggle = wrapper.getByTestId('canvas-node-group-toggle');
			expect(toggle.getAttribute('aria-label')).toBe('Expand');
			expect(toggle.querySelector('svg')).toBeTruthy();
		});

		it('renders chevrons-down-up with Collapse label when expanded', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			const toggle = wrapper.getByTestId('canvas-node-group-toggle');
			expect(toggle.getAttribute('aria-label')).toBe('Collapse');
		});

		it('emits toggle when chevron is clicked', async () => {
			const wrapper = render();
			await fireEvent.click(wrapper.getByTestId('canvas-node-group-toggle'));
			expect(wrapper.emitted().toggle).toEqual([['g1']]);
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
			// N8nInlineTextEdit wraps an inline-edit element; nodrag class on root
			const titleArea = wrapper.getByTestId('canvas-node-group-title');
			expect(titleArea.querySelector('.nodrag')).toBeTruthy();
		});
	});

	describe('frame visibility', () => {
		it('renders the frame when expanded', () => {
			const wrapper = render({ data: makeData({ isCollapsed: false }) });
			expect(wrapper.queryByTestId('canvas-node-group-frame')).toBeTruthy();
		});

		it('hides the frame when collapsed', () => {
			const wrapper = render({ data: makeData({ isCollapsed: true }) });
			expect(wrapper.queryByTestId('canvas-node-group-frame')).toBeNull();
		});
	});

	describe('execution-status classes', () => {
		it('applies no status class when groupStatus is undefined (idle)', () => {
			const wrapper = render({ data: makeData({ groupStatus: undefined }) });
			const root = wrapper.getByTestId('canvas-node-group');
			// No status icon and no .success / .error / .running class semantics.
			expect(wrapper.queryByTestId('canvas-node-group-status-success')).toBeNull();
			expect(wrapper.queryByTestId('canvas-node-group-status-error')).toBeNull();
			// status classes are CSS module hashed; we can only check via test ids.
			expect(root).toBeTruthy();
		});

		it('shows success icon when groupStatus is success', () => {
			const wrapper = render({
				data: makeData({ groupStatus: 'success' as GroupExecutionStatus }),
			});
			expect(wrapper.getByTestId('canvas-node-group-status-success')).toBeTruthy();
		});

		it('shows error icon when groupStatus is error', () => {
			const wrapper = render({
				data: makeData({ groupStatus: 'error' as GroupExecutionStatus }),
			});
			expect(wrapper.getByTestId('canvas-node-group-status-error')).toBeTruthy();
		});

		it('shows iteration count on success when runDataIterations > 1', () => {
			const wrapper = render({
				data: makeData({ groupStatus: 'success', runDataIterations: 3 }),
			});
			const icon = wrapper.getByTestId('canvas-node-group-status-success');
			expect(icon).toHaveTextContent('3');
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
