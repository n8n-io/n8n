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

	it('renders a disabled href tab as an inert tab instead of a link', async () => {
		const { getByText, emitted } = render(N8nTabs, {
			props: {
				modelValue: 'first',
				options: [
					{ value: 'first', label: 'First' },
					{ value: 'docs', label: 'Docs', href: 'https://example.com', disabled: true },
				],
			},
		});

		const tab = getByText('Docs');
		expect(tab.closest('a')).toBeNull();
		expect(tab.closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true');

		await userEvent.click(tab);

		expect(emitted('update:modelValue')).toBeUndefined();
	});
});
