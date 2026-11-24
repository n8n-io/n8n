import { render, waitFor } from '@testing-library/vue';
import { vi } from 'vitest';
import { h } from 'vue';

import Icon from './Icon.vue';
import { deprecatedIconSet, isSupportedIconName, type IconName } from './icons';
import { IconBodyLoaderKey } from '../../composables/useIconBodyLoader';

// The node icon set loads after the loader replies, as a slow chunk can in the app.
vi.mock('./node-icons', async () => {
	await new Promise((resolve) => setTimeout(resolve, 20));
	return { nodeIconSet: { 'node:ftp': { render: () => h('svg', { 'data-node-icon': 'ftp' }) } } };
});

const loaderStub = vi.fn(async (iconName: string) =>
	iconName === 'app-window-mac' ? '<path d="M1 1h22v22H1z" />' : null,
);

const renderOptions = {
	global: {
		provide: {
			[IconBodyLoaderKey as symbol]: loaderStub,
		},
	},
};

describe('Icon', () => {
	beforeEach(() => {
		loaderStub.mockClear();
	});

	it('should render correctly with default props', () => {
		const wrapper = render(Icon, {
			props: { icon: 'check' },
			...renderOptions,
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with a custom size', () => {
		const wrapper = render(Icon, {
			props: { icon: 'check', size: 24 },
			...renderOptions,
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with predefined size', () => {
		const wrapper = render(Icon, {
			props: { icon: 'check', size: 'large' },
			...renderOptions,
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with spin enabled', () => {
		const wrapper = render(Icon, {
			props: { icon: 'check', spin: true },
			...renderOptions,
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with a custom color', () => {
		const wrapper = render(Icon, {
			props: { icon: 'check', color: 'primary' },
			...renderOptions,
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with a deprecated icon', () => {
		const wrapper = render(Icon, {
			props: { icon: Object.keys(deprecatedIconSet)[0] as IconName },
			...renderOptions,
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render arbitrary Lucide icons through the injected loader', async () => {
		const wrapper = render(Icon, {
			props: { icon: 'app-window-mac' },
			...renderOptions,
		});

		await waitFor(() => {
			expect(wrapper.container.querySelector('svg[data-icon="app-window-mac"]')).toBeTruthy();
		});
		expect(wrapper.container.querySelector('svg[data-icon="app-window-mac"]')?.innerHTML).toContain(
			'<path',
		);
		expect(loaderStub).toHaveBeenCalledWith('app-window-mac');
	});

	it('should draw nothing for an icon name no icon set has', async () => {
		const wrapper = render(Icon, { props: { icon: 'not-an-icon' }, ...renderOptions });

		await waitFor(() => expect(loaderStub).toHaveBeenCalledWith('not-an-icon'));
		// Let the loader reply before checking that nothing was drawn.
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(wrapper.container.querySelector('svg')).toBeNull();
	});

	it('should draw the fallback icon for an icon name no icon set has', async () => {
		const wrapper = render(Icon, {
			props: { icon: 'not-an-icon', fallbackIcon: 'bot' },
			...renderOptions,
		});

		await waitFor(() =>
			expect(wrapper.container.querySelector('svg[data-icon="bot"]')).toBeTruthy(),
		);
	});

	it('should draw the fallback icon when it comes from the loader', async () => {
		const wrapper = render(Icon, {
			props: { icon: 'not-an-icon', fallbackIcon: 'app-window-mac' as IconName },
			...renderOptions,
		});

		await waitFor(() => {
			expect(wrapper.container.querySelector('svg')?.innerHTML).toContain('<path');
		});
		expect(loaderStub).toHaveBeenCalledWith('app-window-mac');
	});

	it('should draw a node icon over the fallback once the node icon set loads', async () => {
		const wrapper = render(Icon, {
			props: { icon: 'node:ftp', fallbackIcon: 'bot' },
			...renderOptions,
		});

		await waitFor(() => {
			expect(wrapper.container.querySelector('[data-node-icon="ftp"]')).toBeTruthy();
		});
	});

	it('should keep the requested icon when it loads', async () => {
		const wrapper = render(Icon, {
			props: { icon: 'app-window-mac', fallbackIcon: 'bot' },
			...renderOptions,
		});

		await waitFor(() => {
			expect(wrapper.container.querySelector('svg')?.innerHTML).toContain('M1 1h22v22H1z');
		});
	});

	it('should load an icon again when it is selected again after a failed load', async () => {
		loaderStub.mockRejectedValueOnce(new Error('chunk failed'));
		const wrapper = render(Icon, {
			props: { icon: 'app-window-mac', fallbackIcon: 'bot' },
			...renderOptions,
		});
		await waitFor(() =>
			expect(wrapper.container.querySelector('svg[data-icon="bot"]')).toBeTruthy(),
		);

		await wrapper.rerender({ icon: 'check' });
		await wrapper.rerender({ icon: 'app-window-mac' });

		await waitFor(() => {
			expect(wrapper.container.querySelector('svg')?.innerHTML).toContain('M1 1h22v22H1z');
		});
	});
});

describe('isSupportedIconName', () => {
	it('returns true for supported icon names', () => {
		expect(isSupportedIconName('check')).toBe(true);
		expect(isSupportedIconName(Object.keys(deprecatedIconSet)[0])).toBe(true);
		expect(isSupportedIconName('node:ftp')).toBe(true);
	});

	it('returns false for unsupported icon names', () => {
		expect(isSupportedIconName()).toBe(false);
		expect(isSupportedIconName('not-a-real-icon')).toBe(false);
		expect(isSupportedIconName('node:not-a-real-node-icon')).toBe(false);
	});
});
