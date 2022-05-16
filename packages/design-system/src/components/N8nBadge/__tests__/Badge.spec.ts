import { render } from '@testing-library/vue';
import N8nBadge from '../Badge.vue';

describe('components', () => {
	describe('N8nBadge', () => {
		describe('props', () => {
			it('should render default theme correctly', () => {
				const wrapper = render(N8nBadge, {
					props: {
						theme: 'default',
						size: 'large',
						bold: true,
					},
					slots: {
						default: '<n8n-text>Default badge</n8n-text>',
					},
					stubs: ['n8n-text'],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
			it('should render secondary theme correctly', () => {
				const wrapper = render(N8nBadge, {
					props: {
						theme: 'secondary',
						size: 'medium',
						bold: false,
					},
					slots: {
						default: '<n8n-text>Secondary badge</n8n-text>',
					},
					stubs: ['n8n-text'],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
			it('should render with default values correctly', () => {
				const wrapper = render(N8nBadge, {
					slots: {
						default: '<n8n-text>A Badge</n8n-text>',
					},
					stubs: ['n8n-text'],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
		});
	});
});
