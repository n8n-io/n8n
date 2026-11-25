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

	it.each([
		{ scrollLeft: 0, expected: 'fadeEnd' },
		{ scrollLeft: 150, expected: 'fadeBoth' },
		{ scrollLeft: 300, expected: 'fadeStart' },
	])(
		'adds the $expected fade to horizontal tabs at scroll position $scrollLeft',
		async ({ scrollLeft, expected }) => {
			const { getByRole } = render(N8nTabs, { props: { options: overflowOptions } });
			const tablist = getByRole('tablist');

			setOverflowLayout(tablist, scrollLeft);
			await fireEvent.scroll(tablist);

			const fades = ['fadeStart', 'fadeEnd', 'fadeBoth'].filter((name) =>
				tablist.className.includes(name),
			);
			expect(fades).toEqual([expected]);
		},
	);

	it.each([
		{ scrollTop: 0, expected: 'fadeEnd' },
		{ scrollTop: 150, expected: 'fadeBoth' },
		{ scrollTop: 300, expected: 'fadeStart' },
	])(
		'adds the $expected fade to vertical tabs at scroll position $scrollTop',
		async ({ scrollTop, expected }) => {
			const { getByRole } = render(N8nTabs, {
				props: { options: overflowOptions, orientation: 'vertical' },
			});
			const tablist = getByRole('tablist');

			Object.defineProperties(tablist, {
				scrollHeight: { configurable: true, value: 500 },
				clientHeight: { configurable: true, value: 200 },
				scrollTop: { configurable: true, value: scrollTop },
			});
			await fireEvent.scroll(tablist);

			const fades = ['fadeStart', 'fadeEnd', 'fadeBoth'].filter((name) =>
				tablist.className.includes(name),
			);
			expect(fades).toEqual([expected]);
		},
	);

	it('does not add a fade when the tabs fit', async () => {
		const { getByRole } = render(N8nTabs, { props: { options: overflowOptions } });
		const tablist = getByRole('tablist');

		await fireEvent.scroll(tablist);

		expect(tablist.className).not.toMatch(/fade/);
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

	it('allows another click when the parent rejects the previous update', async () => {
		const enabled = [
			{ value: 'first', label: 'First' },
			{ value: 'second', label: 'Second' },
		];
		const { getByRole, emitted } = render(N8nTabs, {
			props: { modelValue: 'first', options: enabled },
		});

		await userEvent.click(getByRole('tab', { name: 'Second' }));
		expect(emitted('update:modelValue')).toEqual([['second']]);
		expect(getByRole('tab', { name: 'First' })).toHaveAttribute('data-state', 'active');

		await userEvent.click(getByRole('tab', { name: 'Second' }));
		expect(emitted('update:modelValue')).toEqual([['second'], ['second']]);
	});

	it('selects a tab when arrow keys move focus to it', async () => {
		const enabled = [
			{ value: 'first', label: 'First' },
			{ value: 'second', label: 'Second' },
		];
		const { getByRole, emitted } = render(N8nTabs, {
			props: { defaultValue: 'first', options: enabled },
		});

		getByRole('tab', { name: 'First' }).focus();
		await userEvent.keyboard('{ArrowRight}');

		expect(getByRole('tab', { name: 'Second' })).toHaveFocus();
		expect(getByRole('tab', { name: 'Second' })).toHaveAttribute('data-state', 'active');
		expect(emitted<[string]>('update:modelValue').at(-1)).toEqual(['second']);
	});

	it('does not emit for a disabled tab and marks it disabled', async () => {
		const { getByText, emitted } = render(N8nTabs, {
			props: { modelValue: 'first', options },
		});

		const tab = getByText('Second').closest('[role="tab"]');
		expect(tab).toHaveAttribute('data-disabled');
		expect(tab).toBeDisabled();

		await userEvent.click(getByText('Second'));

		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('keeps the parent value until the parent accepts the update', async () => {
		const enabled = [
			{ value: 'first', label: 'First' },
			{ value: 'second', label: 'Second' },
		];
		const { getByRole, rerender } = render(N8nTabs, {
			props: { modelValue: 'first', options: enabled },
		});

		await userEvent.click(getByRole('tab', { name: 'Second' }));

		expect(getByRole('tab', { name: 'First' })).toHaveAttribute('data-state', 'active');
		expect(getByRole('tab', { name: 'Second' })).toHaveAttribute('data-state', 'inactive');

		await rerender({ modelValue: 'second', options: enabled });

		expect(getByRole('tab', { name: 'Second' })).toHaveAttribute('data-state', 'active');
	});

	it('uses modelValue when defaultValue is also set', () => {
		const enabled = [
			{ value: 'first', label: 'First' },
			{ value: 'second', label: 'Second' },
		];
		const { getByRole } = render(N8nTabs, {
			props: { modelValue: 'second', defaultValue: 'first', options: enabled },
		});

		expect(getByRole('tab', { name: 'Second' })).toHaveAttribute('data-state', 'active');
	});

	it('uses defaultValue when the parent does not bind a value', async () => {
		const enabled = [
			{ value: 'first', label: 'First' },
			{ value: 'second', label: 'Second' },
		];
		const { getByRole, emitted } = render(N8nTabs, {
			props: { defaultValue: 'first', options: enabled },
		});

		expect(getByRole('tab', { name: 'First' })).toHaveAttribute('data-state', 'active');

		await userEvent.click(getByRole('tab', { name: 'Second' }));

		expect(getByRole('tab', { name: 'Second' })).toHaveAttribute('data-state', 'active');
		const events = emitted<[string]>('update:modelValue');
		expect(events.length).toBeGreaterThan(0);
		expect(events.every(([value]) => value === 'second')).toBe(true);
	});

	it('renders the suffix slot outside the tab list', () => {
		const { getByText } = render(N8nTabs, {
			props: { modelValue: 'first', options },
			slots: { suffix: '<a href="https://example.com">Docs</a>' },
		});

		const link = getByText('Docs');
		expect(link.closest('[role="tablist"]')).toBeNull();
		expect(link.closest('[role="tab"]')).toBeNull();
	});
});
