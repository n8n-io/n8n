import { render } from '@testing-library/vue';
import N8nBadge from '../Badge.vue';

describe('components', () => {
	describe('N8nBadge', () => {
		describe('props', () => {
			// Test badge rendering with different prop settings
			it('should render default theme correctly', () => {
				const wrapper = render(N8nBadge, {
					props: {
						theme: 'default',
						size: 'small',
						bold: true
					},
					slots: {
						default: 'Default badge',
					},
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
			it('should render secondary theme correctly', () => {
				const wrapper = render(N8nBadge, {
					props: {
						theme: 'secondary',
						size: 'medium',
						bold: false
					},
					slots: {
						default: 'Secondary badge',
					},
				});
				console.log(wrapper.html())
				expect(wrapper.html()).toMatchSnapshot();
			});
		})
	});
});
