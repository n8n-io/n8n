import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';

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
		expect(getByTestId('node-rename-input')).toBeInTheDocument();
	});

	it('displays the node title', () => {
		const { getByText } = renderComponent({
			props: {
				modelValue: 'My Test Node',
			},
		});
		expect(getByText('My Test Node')).toBeInTheDocument();
	});

	it('shows the edit input when clicked', async () => {
		const { getByTestId } = renderComponent({
			props: {
				modelValue: 'Test Node',
			},
		});
		await userEvent.click(getByTestId('node-title-container'));
		expect(getByTestId('node-rename-input')).toHaveValue('Test Node');
	});

	it('emits update:model-value when renaming', async () => {
		const { getByTestId, getByRole, emitted } = renderComponent({
			props: {
				modelValue: 'Test Node',
			},
		});
		await userEvent.click(getByTestId('node-title-container'));
		const renameInput = getByTestId('node-rename-input');
		await userEvent.clear(renameInput);
		await userEvent.type(renameInput, 'New Node Name');

		expect(renameInput).toHaveValue('New Node Name');

		await userEvent.click(getByRole('button', { name: 'Rename' }));
		expect(emitted('update:model-value')).toEqual([['New Node Name']]);
	});

	it('cancels renaming when cancel button is clicked', async () => {
		const { getByTestId, getByRole, emitted } = renderComponent({
			props: {
				modelValue: 'Test Node',
			},
		});
		await userEvent.click(getByTestId('node-title-container'));
		await userEvent.click(getByRole('button', { name: 'Cancel' }));
		expect(emitted('update:model-value')).toBeUndefined();
	});

	it('does not call onRename when Enter is pressed on cancel button', async () => {
		const { getByTestId, getByRole, emitted } = renderComponent({
			props: {
				modelValue: 'Test Node',
			},
		});
		await userEvent.click(getByTestId('node-title-container'));
		const renameInput = getByTestId('node-rename-input');
		await userEvent.clear(renameInput);
		await userEvent.type(renameInput, 'New Node Name');

		expect(renameInput).toHaveValue('New Node Name');

		const cancelButton = getByRole('button', { name: 'Cancel' });
		await fireEvent.focus(cancelButton);
		await fireEvent.keyDown(cancelButton, { key: 'Enter' });
		expect(emitted('update:model-value')).toBeUndefined();
	});
});
