import { render } from '@testing-library/vue';
import N8nCallout from '../Callout.vue';

describe('components', () => {
	describe('N8NCallout', () => {
		describe('props', () => {
			it('should render info theme correctly', () => {
				const wrapper = render(N8nCallout, {
					props: {
						theme: 'info',
						message: 'This is an info callout.',
					},
					stubs: [
						'n8n-icon',
						'n8n-text',
					],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
			it('should render success theme correctly', () => {
				const wrapper = render(N8nCallout, {
					props: {
						theme: 'success',
						message: 'This is an success callout.',
					},
					stubs: [
						'n8n-icon',
						'n8n-text',
					],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
			it('should render warning theme correctly', () => {
				const wrapper = render(N8nCallout, {
					props: {
						theme: 'warning',
						message: 'This is an warning callout.',
					},
					stubs: [
						'n8n-icon',
						'n8n-text',
					],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
			it('should render danger theme correctly', () => {
				const wrapper = render(N8nCallout, {
					props: {
						theme: 'danger',
						message: 'This is an danger callout.',
					},
					stubs: [
						'n8n-icon',
						'n8n-text',
					],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
			it('should render custom theme correctly', () => {
				const wrapper = render(N8nCallout, {
					props: {
						theme: 'custom',
						message: 'This is an custom callout.',
						icon: 'code',
					},
					stubs: [
						'n8n-icon',
						'n8n-text',
					],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
		});
		describe('content', () => {
			it('should render custom HTML content correctly', () => {
				const wrapper = render(N8nCallout, {
					props: {
						theme: 'custom',
						message: 'This is an HTML callout. <a href="#" target="_blank"><b>Read more</b></a>',
						icon: 'code',
					},
					stubs: [
						'n8n-icon',
						'n8n-text',
					],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
			it('should pass props to text component correctly', () => {
				const wrapper = render(N8nCallout, {
					props: {
						theme: 'warning',
						message: 'This is a callout.',
						bold: true,
						align: 'center',
						tag: 'p',
					},
					stubs: [
						'n8n-icon',
						'n8n-text',
					],
				});
				expect(wrapper.html()).toMatchSnapshot();
			});
		});
	});
});
