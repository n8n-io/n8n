import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';

import NodeTitle from '@/components/NodeTitle.vue';
import { createTestingPinia } from '@pinia/testing';

const renderComponent = createComponentRenderer(NodeTitle);

describe('NodeTitle', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the component', () => {
		const { getByTestId } = renderComponent({
			props: {
				modelValue: 'Test Node',
			},
		});
		expect(getByTestId('node-title-container')).toBeInTheDocument();
		expect(getByTestId('inline-edit-input')).toBeInTheDocument();
	});

	it('displays the node title', () => {
		const { getByTestId } = renderComponent({
			props: {
				modelValue: 'Test Node',
			},
		});
		const renamePreview = getByTestId('inline-edit-preview');
		expect(renamePreview).toHaveTextContent('Test Node');
	});

	it('shows the edit input when clicked', async () => {
		const { getByTestId } = renderComponent({
			props: {
				modelValue: 'Test Node',
			},
		});
		await userEvent.click(getByTestId('node-title-container'));
		expect(getByTestId('inline-edit-input')).toHaveValue('Test Node');
	});

	it('emits update:model-value when renaming', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				modelValue: 'Test Node',
			},
		});
		const renameInput = getByTestId('inline-edit-input');
		await userEvent.clear(renameInput);
		await userEvent.type(renameInput, 'New Node Name');

		expect(renameInput).toHaveValue('New Node Name');

		await userEvent.keyboard('{enter}');

		expect(emitted('update:model-value')).toEqual([['New Node Name']]);
	});

	it('should not update if user cancels', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				modelValue: 'Test Node',
			},
		});
		const renameInput = getByTestId('inline-edit-input');
		const area = getByTestId('inline-editable-area');

		await userEvent.type(area, 'New Node Name');
		await userEvent.keyboard('{Escape}');
		expect(renameInput).toHaveValue('Test Node');
		expect(emitted('update:model-value')).toBeUndefined();
	});
});
