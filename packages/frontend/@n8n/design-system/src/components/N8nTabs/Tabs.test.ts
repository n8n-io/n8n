import userEvent from '@testing-library/user-event';
import { fireEvent, render } from '@testing-library/vue';

import N8nTabs from './Tabs.vue';

const options = [
	{ value: 'first', label: 'First' },
	{ value: 'second', label: 'Second', disabled: true, tooltip: 'No access' },
];

describe('N8nTabs', () => {
	it('masks only edges with hidden content', async () => {
		const { getByRole, rerender } = render(N8nTabs, { props: { options } });
		const tablist = getByRole('tablist');
		Object.defineProperties(tablist, {
			scrollWidth: { configurable: true, value: 500 },
			clientWidth: { configurable: true, value: 200 },
			scrollLeft: { configurable: true, writable: true, value: 0 },
		});

		await fireEvent.scroll(tablist);
		expect(tablist.className).not.toContain('fadeLeft');
		expect(tablist.className).toContain('fadeRight');

		tablist.scrollLeft = 150;
		await fireEvent.scroll(tablist);
		expect(tablist.className).toContain('fadeLeft');
		expect(tablist.className).toContain('fadeRight');

		tablist.scrollLeft = 300;
		await fireEvent.scroll(tablist);
		expect(tablist.className).toContain('fadeLeft');
		expect(tablist.className).not.toContain('fadeRight');

		await rerender({ justified: true });
		expect(tablist.className).not.toContain('fadeLeft');
		expect(tablist.className).not.toContain('fadeRight');

		await rerender({ justified: false });
		Object.defineProperty(tablist, 'scrollWidth', { configurable: true, value: 200 });
		tablist.scrollLeft = 0;
		await fireEvent.scroll(tablist);
		expect(tablist.className).not.toContain('fadeLeft');
		expect(tablist.className).not.toContain('fadeRight');
	});

	it('renders tabs without arrow controls', () => {
		const { getByRole, queryByRole } = render(N8nTabs, { props: { options } });

		expect(getByRole('tablist')).toBeVisible();
		expect(queryByRole('button')).not.toBeInTheDocument();
	});

	it.each([
		{ value: 'plain', label: 'Plain', tag: 'New' },
		{ value: 'external', label: 'External', tag: 'New', href: 'https://example.com' },
		{ value: 'route', label: 'Route', tag: 'New', to: '/workflows' },
	])('renders the $value tab label as a badge', function testTabBadge(option) {
		const { getByText, container } = render(N8nTabs, {
			props: { modelValue: option.value, options: [option] },
			global: {
				stubs: {
					RouterLink: { template: '<a><slot /></a>' },
				},
			},
		});

		const badge = getByText('New').closest('.n8n-badge');
		expect(badge).toBeVisible();
		expect(badge?.tagName).toBe('SPAN');
		expect(container.querySelector('.n8n-tag')).not.toBeInTheDocument();
	});

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
