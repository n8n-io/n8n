import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import CanvasNodeGroupOverlay from './CanvasNodeGroupOverlay.vue';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { CanvasNodeGroupLayout } from '../../../composables/useCanvasNodeGroupsLayout';

const baseGroup: IWorkflowGroup = {
	id: 'g1',
	nodeIds: ['a', 'b'],
	name: 'My group',
};

const baseLayout: CanvasNodeGroupLayout = {
	group: baseGroup,
	collapsed: false,
	x: 44,
	y: 120,
	width: 560,
	height: 228,
	frameTop: 40,
	frameHeight: 188,
	status: 'idle',
};

describe('CanvasNodeGroupOverlay', () => {
	function render(
		props: Partial<{
			group: IWorkflowGroup;
			layout: CanvasNodeGroupLayout;
			readOnly: boolean;
			autofocusTitle: boolean;
		}> = {},
	) {
		return renderComponent(CanvasNodeGroupOverlay, {
			pinia: createTestingPinia(),
			props: {
				group: props.group ?? baseGroup,
				layout: props.layout ?? baseLayout,
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

	it('positions the wrapper from the provided runtime layout', () => {
		const wrapper = render();
		const overlay = wrapper.getByTestId('canvas-node-group') as HTMLElement;

		expect(overlay.style.left).toBe('44px');
		expect(overlay.style.top).toBe('120px');
		expect(overlay.style.width).toBe('560px');
		expect(overlay.style.height).toBe('228px');
	});

	it('reshapes when the runtime layout changes', async () => {
		const wrapper = render();
		const initial = wrapper.getByTestId('canvas-node-group') as HTMLElement;
		const initialWidth = initial.style.width;

		await wrapper.rerender({
			group: baseGroup,
			layout: {
				...baseLayout,
				width: 320,
				height: 96,
				collapsed: true,
				frameTop: 0,
				frameHeight: 96,
			},
			readOnly: false,
		});

		const updated = wrapper.getByTestId('canvas-node-group') as HTMLElement;
		expect(updated.style.width).not.toBe(initialWidth);
		expect(updated).toHaveAttribute('data-collapsed', 'true');
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
		await fireEvent.click(wrapper.getByTestId('canvas-node-group-ungroup'));

		expect(wrapper.emitted().ungroup).toEqual([['g1']]);
	});

	it('emits collapse toggles', async () => {
		const wrapper = render();
		await fireEvent.click(wrapper.getByTestId('canvas-node-group-collapse-toggle'));

		expect(wrapper.emitted()['toggle:collapsed']).toEqual([['g1']]);
	});

	it('does not render the ungroup button in read-only mode', () => {
		const wrapper = render({ readOnly: true });
		expect(wrapper.queryByTestId('canvas-node-group-ungroup')).toBeNull();
	});
});
