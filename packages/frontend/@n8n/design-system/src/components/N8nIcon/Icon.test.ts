import { render } from '@testing-library/vue';

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

	it('renders node icons from the shared node icon registry', () => {
		const { container } = render(Icon, {
			props: {
				icon: 'node:if',
				size: 24,
			},
		});

		const icon = container.querySelector('[data-icon="node:if"]');
		expect(icon).toBeTruthy();
		expect(icon?.querySelector('svg')).toBeTruthy();
	});
});
