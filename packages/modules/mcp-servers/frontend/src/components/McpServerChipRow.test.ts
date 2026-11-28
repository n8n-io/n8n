import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import McpServerChipRow from './McpServerChipRow.vue';

const renderRow = createComponentRenderer(McpServerChipRow, {
	props: {
		label: 'Workflows',
		itemCount: 0,
		addLabel: 'Add workflow',
		addButtonTestId: 'add-workflow',
	},
});

describe('McpServerChipRow', () => {
	it('hides the label and shows "+ Add <kind>" when the row is empty', async () => {
		const { getByTestId, queryByText, emitted } = renderRow();

		expect(queryByText('Workflows')).not.toBeInTheDocument();
		const button = getByTestId('add-workflow');
		expect(button).toHaveTextContent('Add workflow');

		await userEvent.click(button);
		expect(emitted('add')).toHaveLength(1);
	});

	it('shows the label and an icon-only "+" button with accessible label when the row has items', async () => {
		const { getByTestId, getByText, emitted } = renderRow({
			props: { itemCount: 2 },
			slots: { default: '<span>chip_one</span>' },
		});

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('chip_one')).toBeInTheDocument();
		const button = getByTestId('add-workflow');
		expect(button).toHaveAttribute('aria-label', 'Add workflow');
		expect(button).not.toHaveTextContent('Add workflow');

		await userEvent.click(button);
		expect(emitted('add')).toHaveLength(1);
	});

	it('hides the label when showLabel is false', () => {
		const { queryByText, getByText } = renderRow({
			props: { itemCount: 1, showLabel: false },
			slots: { default: '<span>skill_one</span>' },
		});

		expect(queryByText('Workflows')).not.toBeInTheDocument();
		expect(getByText('skill_one')).toBeInTheDocument();
	});

	it('hides the add button when hideAdd is true', () => {
		const { queryByTestId } = renderRow({
			props: { itemCount: 1, hideAdd: true },
		});

		expect(queryByTestId('add-workflow')).not.toBeInTheDocument();
	});

	it('marks slotted chips as inert when disabled', async () => {
		const { getByTestId, getByText, emitted } = renderRow({
			props: { itemCount: 1, disabled: true },
			slots: { default: '<button type="button">chip_one</button>' },
		});

		expect(getByText('chip_one').parentElement).toHaveAttribute('inert');
		const addButton = getByTestId('add-workflow');
		expect(addButton).toHaveAttribute('aria-disabled', 'true');
		await userEvent.click(addButton);
		expect(emitted('add')).toBeUndefined();
	});

	it('leaves slotted chips interactive when enabled', () => {
		const { getByTestId, getByText } = renderRow({
			props: { itemCount: 1, disabled: false },
			slots: { default: '<button type="button">chip_one</button>' },
		});

		expect(getByText('chip_one').parentElement).not.toHaveAttribute('inert');
		expect(getByTestId('add-workflow')).not.toHaveAttribute('aria-disabled', 'true');
	});
});
