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
});
