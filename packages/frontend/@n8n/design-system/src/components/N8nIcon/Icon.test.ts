import { render, waitFor } from '@testing-library/vue';
import { vi } from 'vitest';

const sharedLoaderMock = vi.hoisted(() => ({
	loadLucideIconBody: vi.fn(async (iconName: string) =>
		iconName === 'app-window-mac' ? '<path d="M1 1h22v22H1z" />' : null,
	),
}));

vi.mock('./lucideIconLoader', () => sharedLoaderMock);
vi.mock('@iconify/json/json/lucide.json', () => ({
	default: {
		icons: {},
	},
}));

import Icon from './Icon.vue';
import { deprecatedIconSet, type IconName } from './icons';

describe('Icon', () => {
	it('should render correctly with default props', () => {
		const wrapper = render(Icon, {
			props: {
				icon: 'check',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with a custom size', () => {
		const wrapper = render(Icon, {
			props: {
				icon: 'check',
				size: 24,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with predefined size', () => {
		const wrapper = render(Icon, {
			props: {
				icon: 'check',
				size: 'large',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with spin enabled', () => {
		const wrapper = render(Icon, {
			props: {
				icon: 'check',
				spin: true,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with a custom color', () => {
		const wrapper = render(Icon, {
			props: {
				icon: 'check',
				color: 'primary',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with a deprecated icon', () => {
		const wrapper = render(Icon, {
			props: {
				icon: Object.keys(deprecatedIconSet)[0] as IconName,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render arbitrary Lucide icons through the shared loader fallback', async () => {
		const wrapper = render(Icon, {
			props: {
				icon: 'app-window-mac',
			},
		});

		await waitFor(() => {
			expect(wrapper.container.querySelector('svg[data-icon="app-window-mac"]')).toBeTruthy();
		});
		expect(wrapper.container.querySelector('svg[data-icon="app-window-mac"]')?.innerHTML).toContain(
			'<path',
		);
		expect(sharedLoaderMock.loadLucideIconBody).toHaveBeenCalledWith('app-window-mac');
	});
});
