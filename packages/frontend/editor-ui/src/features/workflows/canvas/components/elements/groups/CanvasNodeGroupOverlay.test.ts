import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import type { GraphNode } from '@vue-flow/core';

import CanvasNodeGroupOverlay from './CanvasNodeGroupOverlay.vue';
import type { IWorkflowGroup } from 'n8n-workflow';
import {
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
	GROUP_PADDING_Y_BOTTOM,
	GROUP_HEADER_HEIGHT,
} from '../../../stores/canvasNodeGroups.constants';

function makeMember(id: string, x: number, y: number): GraphNode {
	return {
		id,
		position: { x, y },
		dimensions: { width: 200, height: 100 },
		computedPosition: { x, y, z: 0 },
	} as unknown as GraphNode;
}

const baseGroup: IWorkflowGroup = {
	id: 'g1',
	nodeIds: ['a', 'b'],
	name: 'My group',
};

describe('CanvasNodeGroupOverlay', () => {
	function render(
		props: Partial<{
			group: IWorkflowGroup;
			memberNodes: GraphNode[];
			readOnly: boolean;
			autofocusTitle: boolean;
		}> = {},
	) {
		const memberNodes = props.memberNodes ?? [makeMember('a', 0, 0), makeMember('b', 300, 0)];
		return renderComponent(CanvasNodeGroupOverlay, {
			pinia: createTestingPinia(),
			props: {
				group: props.group ?? baseGroup,
				memberNodes,
				readOnly: props.readOnly ?? false,
				autofocusTitle: props.autofocusTitle ?? false,
			},
		});
	}

	it('renders header, frame and title', () => {
		const wrapper = render();

		expect(wrapper.getByTestId('canvas-node-group')).toBeTruthy();
		expect(wrapper.getByTestId('canvas-node-group-header')).toBeTruthy();
		expect(wrapper.getByTestId('canvas-node-group-frame')).toBeTruthy();
		expect(wrapper.getByTestId('canvas-node-group-title')).toHaveTextContent('My group');
		expect(wrapper.getByTestId('inline-edit-preview')).toBeTruthy();
	});

	it('positions the wrapper based on the bounding rect of member nodes', () => {
		const memberWidth = 200;
		const memberHeight = 100;
		const rectX = 100;
		const rectY = 200;
		const rectWidth = 500 - 100 + memberWidth;
		const wrapper = render({
			memberNodes: [makeMember('a', rectX, rectY), makeMember('b', 500, rectY)],
		});

		const overlay = wrapper.getByTestId('canvas-node-group') as HTMLElement;
		expect(overlay.style.left).toBe(`${rectX - GROUP_PADDING_X}px`);
		expect(overlay.style.top).toBe(`${rectY - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT}px`);
		expect(overlay.style.width).toBe(`${rectWidth + 2 * GROUP_PADDING_X}px`);
		expect(overlay.style.height).toBe(
			`${GROUP_HEADER_HEIGHT + memberHeight + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM}px`,
		);
	});

	it('reshapes when member positions change', async () => {
		const wrapper = render({
			memberNodes: [makeMember('a', 0, 0), makeMember('b', 300, 0)],
		});
		const initial = wrapper.getByTestId('canvas-node-group') as HTMLElement;
		const initialWidth = initial.style.width;

		await wrapper.rerender({
			group: baseGroup,
			memberNodes: [makeMember('a', 0, 0), makeMember('b', 800, 0)],
			readOnly: false,
		});

		const updated = wrapper.getByTestId('canvas-node-group') as HTMLElement;
		expect(updated.style.width).not.toBe(initialWidth);
	});

	it('renders the frame element so clicks fall through to nodes', () => {
		const wrapper = render();
		expect(wrapper.getByTestId('canvas-node-group-frame')).toBeTruthy();
	});

	it('commits the title on Enter', async () => {
		const wrapper = render();
		await fireEvent.click(wrapper.getByTestId('inline-edit-preview'));
		const input = wrapper.getByTestId('inline-edit-input') as HTMLInputElement;
		await fireEvent.update(input, 'Renamed');
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(wrapper.emitted()['update:name']).toEqual([['g1', 'Renamed']]);
	});

	it('reverts on Escape', async () => {
		const wrapper = render();
		await fireEvent.click(wrapper.getByTestId('inline-edit-preview'));
		const input = wrapper.getByTestId('inline-edit-input') as HTMLInputElement;
		await fireEvent.update(input, 'Discarded');
		await fireEvent.keyDown(input, { key: 'Escape' });

		expect(wrapper.emitted()['update:name']).toBeUndefined();
		expect(wrapper.getByTestId('canvas-node-group-title')).toHaveTextContent('My group');
	});

	it('does not emit when the value is unchanged', async () => {
		const wrapper = render();
		await fireEvent.click(wrapper.getByTestId('inline-edit-preview'));
		const input = wrapper.getByTestId('inline-edit-input') as HTMLInputElement;
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(wrapper.emitted()['update:name']).toBeUndefined();
	});

	it('focuses title editing when autofocus is requested', async () => {
		const wrapper = render({ autofocusTitle: true });
		const input = wrapper.getByTestId('inline-edit-input') as HTMLInputElement;

		await waitFor(() => expect(input).toHaveFocus());
		expect(wrapper.emitted()['title:focused']).toEqual([['g1']]);
	});

	it('disables editing in read-only mode', async () => {
		const wrapper = render({ readOnly: true });
		await fireEvent.click(wrapper.getByTestId('inline-edit-preview'));
		const input = wrapper.getByTestId('inline-edit-input') as HTMLInputElement;
		expect(input).toHaveAttribute('readonly');
		expect(wrapper.getByTestId('inline-edit-preview')).toHaveTextContent('My group');
	});

	it('renders the ungroup button and emits the ungroup event when clicked', async () => {
		const wrapper = render();
		const ungroupBtn = wrapper.getByTestId('canvas-node-group-ungroup');
		await fireEvent.click(ungroupBtn);

		expect(wrapper.emitted().ungroup).toEqual([['g1']]);
	});

	it('does not render the ungroup button in read-only mode', () => {
		const wrapper = render({ readOnly: true });
		expect(wrapper.queryByTestId('canvas-node-group-ungroup')).toBeNull();
	});
});
