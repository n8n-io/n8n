import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';

import WontExecuteFilter from './WontExecuteFilter.vue';

const renderComponent = createComponentRenderer(WontExecuteFilter);

describe('WontExecuteFilter', () => {
	it('checks every cause when the parent is checked', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { modelValue: [] } });

		await fireEvent.click(getByTestId('wont-execute-filter-all'));

		expect(emitted('update:modelValue')).toEqual([[['restrictedNode']]]);
	});

	it('clears every cause when the checked parent is unchecked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: ['restrictedNode'] },
		});

		expect(getByTestId('wont-execute-filter-all')).toHaveAttribute('data-state', 'checked');
		await fireEvent.click(getByTestId('wont-execute-filter-all'));

		expect(emitted('update:modelValue')).toEqual([[[]]]);
	});

	it('toggles one cause', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: ['restrictedNode'] },
		});

		expect(getByTestId('wont-execute-filter-restrictedNode')).toHaveAttribute(
			'data-state',
			'checked',
		);
		await fireEvent.click(getByTestId('wont-execute-filter-restrictedNode'));

		expect(emitted('update:modelValue')).toEqual([[[]]]);
	});

	it('labels the parent and each cause', () => {
		const { getByLabelText } = renderComponent({ props: { modelValue: [] } });

		expect(getByLabelText("Won't execute")).toBeInTheDocument();
		expect(getByLabelText('Restricted node')).toBeInTheDocument();
	});
});
