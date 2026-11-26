import { fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import ToolDataViews from './ToolDataViews.vue';

const renderComponent = createComponentRenderer(ToolDataViews);

function render() {
	return renderComponent({
		props: { label: 'Output', value: { rows: [{ id: 1 }] }, viewLabel: 'Table' },
		slots: { default: () => h('div', { 'data-test-id': 'formatted-view' }, 'Formatted') },
	});
}

describe('ToolDataViews', () => {
	it('shows the label, the switch and the formatted view in its label row', () => {
		const { getByText, getByTestId, getByRole, queryByTestId } = render();

		expect(getByText('Output')).toBeInTheDocument();
		expect(getByRole('radio', { name: 'Table' })).toBeChecked();
		expect(getByTestId('formatted-view')).toBeInTheDocument();
		expect(queryByTestId('ai-tool-data-block')).toBeNull();
	});

	it('switches to the raw JSON', async () => {
		const { getByRole, getByTestId, queryByTestId } = render();

		await fireEvent.click(getByRole('radio', { name: 'JSON' }));

		expect(queryByTestId('formatted-view')).toBeNull();
		expect(getByTestId('ai-tool-data-block').textContent).toContain('"id": 1');
	});
});
