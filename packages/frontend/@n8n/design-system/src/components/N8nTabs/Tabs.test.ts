import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

import N8nTabs from './Tabs.vue';

const options = [
	{ value: 'first', label: 'First' },
	{ value: 'second', label: 'Second', disabled: true, tooltip: 'No access' },
];

describe('N8nTabs', () => {
	it('emits update:modelValue when an enabled tab is clicked', async () => {
		const { getByText, emitted } = render(N8nTabs, {
			props: { modelValue: 'second', options },
		});

		await userEvent.click(getByText('First'));

		expect(emitted('update:modelValue')).toEqual([['first']]);
	});

	it('does not emit for a disabled tab and marks it aria-disabled', async () => {
		const { getByText, emitted } = render(N8nTabs, {
			props: { modelValue: 'first', options },
		});

		const tab = getByText('Second').closest('[aria-disabled]');
		expect(tab).toHaveAttribute('aria-disabled', 'true');

		await userEvent.click(getByText('Second'));

		expect(emitted('update:modelValue')).toBeUndefined();
	});
});
