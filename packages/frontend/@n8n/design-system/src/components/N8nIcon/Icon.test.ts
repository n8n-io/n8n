import { render, waitFor } from '@testing-library/vue';
import { vi } from 'vitest';

import Icon from './Icon.vue';
import { deprecatedIconSet, type IconName } from './icons';
import { IconBodyLoaderKey } from '../../composables/useIconBodyLoader';

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
});
