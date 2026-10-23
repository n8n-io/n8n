import userEvent from '@testing-library/user-event';
import { fireEvent, render } from '@testing-library/vue';

import N8nTabs from './Tabs.vue';

const options = [
	{ value: 'first', label: 'First' },
	{ value: 'second', label: 'Second', disabled: true, tooltip: 'No access' },
];

function setOverflowLayout(tablist: HTMLElement, scrollLeft = 0) {
	Object.defineProperties(tablist, {
		scrollWidth: { configurable: true, value: 500 },
		clientWidth: { configurable: true, value: 200 },
		scrollLeft: { configurable: true, value: scrollLeft },
	});
	if (tablist.parentElement) {
		Object.defineProperty(tablist.parentElement, 'clientWidth', { configurable: true, value: 264 });
	}
	vi.spyOn(tablist, 'getBoundingClientRect').mockReturnValue(new DOMRect(32, 0, 200, 24));
	Array.from(tablist.children).forEach((item, index) => {
		vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(
			new DOMRect(32 + index * 150 - scrollLeft, 0, 150, 24),
		);
	});
	const scrollTo = vi.fn();
	Object.defineProperty(tablist, 'scrollTo', { configurable: true, value: scrollTo });
	return scrollTo;
}

const overflowOptions = [
	{ value: 'first', label: 'First tab' },
	{ value: 'second', label: 'Second tab' },
	{ value: 'third', label: 'Third tab' },
];

function createMediaQuery(query: string, reducedMotion = false): MediaQueryList {
	return {
		matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(() => true),
	};
}

describe('N8nTabs', () => {
	beforeEach(() => {
		/** Use a fresh media query object instead of the shared test setup cache. */
		vi.stubGlobal(
			'matchMedia',
			vi.fn((query: string) => createMediaQuery(query)),
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('scrolls without animation when reduced motion is enabled', async () => {
		vi.mocked(window.matchMedia).mockImplementation((query) => createMediaQuery(query, true));
		const { getByRole } = render(N8nTabs, { props: { options: overflowOptions } });
		const tablist = getByRole('tablist');
		const scrollTo = setOverflowLayout(tablist);
		await fireEvent.scroll(tablist);
		await userEvent.click(getByRole('button', { name: 'Show next tabs' }));

		expect(scrollTo).toHaveBeenCalledWith({ left: 100, behavior: 'instant' });
	});

	it('uses native named controls and reveals the next tab boundary', async () => {
		const { getByRole, emitted } = render(N8nTabs, { props: { options: overflowOptions } });
		const tablist = getByRole('tablist');
		const scrollTo = setOverflowLayout(tablist);
		await fireEvent.scroll(tablist);

		const previous = getByRole('button', { name: 'Show previous tabs' });
		const next = getByRole('button', { name: 'Show next tabs' });
		expect(previous).toBeDisabled();
		expect(next).toHaveAttribute('type', 'button');
		expect(previous.parentElement).toBe(tablist.parentElement);
		expect(next.parentElement).toBe(tablist.parentElement);
		await userEvent.click(next);

		expect(scrollTo).toHaveBeenCalledWith({ left: 100, behavior: 'smooth' });
		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('reveals the previous tab boundary and keeps the end control disabled', async () => {
		const { getByRole } = render(N8nTabs, { props: { options: overflowOptions } });
		const tablist = getByRole('tablist');
		const scrollTo = setOverflowLayout(tablist, 300);
		await fireEvent.scroll(tablist);

		expect(getByRole('button', { name: 'Show next tabs' })).toBeDisabled();
		await userEvent.click(getByRole('button', { name: 'Show previous tabs' }));

		expect(scrollTo).toHaveBeenCalledWith({ left: 150, behavior: 'smooth' });
	});

	it('pages through an oversized tab without skipping its middle', async () => {
		const { getByRole } = render(N8nTabs, {
			props: { options: [{ value: 'wide', label: 'A very wide tab label' }] },
		});
		const tablist = getByRole('tablist');
		const scrollTo = setOverflowLayout(tablist);
		const tab = tablist.children[0];
		expect(tab).toBeDefined();
		if (!tab) return;
		vi.spyOn(tab, 'getBoundingClientRect').mockReturnValue(new DOMRect(32, 0, 500, 24));
		await fireEvent.scroll(tablist);
		await userEvent.click(getByRole('button', { name: 'Show next tabs' }));
		expect(scrollTo).toHaveBeenLastCalledWith({ left: 200, behavior: 'smooth' });

		Object.defineProperty(tablist, 'scrollLeft', { configurable: true, value: 200 });
		vi.spyOn(tab, 'getBoundingClientRect').mockReturnValue(new DOMRect(-168, 0, 500, 24));
		await fireEvent.scroll(tablist);
		await userEvent.click(getByRole('button', { name: 'Show next tabs' }));
		expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' });

		Object.defineProperty(tablist, 'scrollLeft', { configurable: true, value: 300 });
		vi.spyOn(tab, 'getBoundingClientRect').mockReturnValue(new DOMRect(-268, 0, 500, 24));
		await fireEvent.scroll(tablist);
		await userEvent.click(getByRole('button', { name: 'Show previous tabs' }));
		expect(scrollTo).toHaveBeenLastCalledWith({ left: 100, behavior: 'smooth' });
	});

	it('does not add controls when the tabs fit or use justified slots', async () => {
		const { getByRole, queryByRole, rerender } = render(N8nTabs, {
			props: { options: overflowOptions },
		});
		expect(queryByRole('button')).not.toBeInTheDocument();
		setOverflowLayout(getByRole('tablist'));
		await fireEvent.scroll(getByRole('tablist'));
		expect(queryByRole('button', { name: 'Show next tabs' })).toBeInTheDocument();

		await rerender({ justified: true });
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
