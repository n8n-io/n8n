import { render } from '@testing-library/vue';

import N8nCallout from './Callout.vue';

describe('components', () => {
	describe('N8nCallout', () => {
		it('should render info theme correctly', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
				slots: {
					default: '<n8n-text size="small">This is an info callout.</n8n-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render success theme correctly', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'success',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
				slots: {
					default: '<n8n-text size="small">This is a success callout.</n8n-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render warning theme correctly', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'warning',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
				slots: {
					default: '<n8n-text size="small">This is a warning callout.</n8n-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render danger theme correctly', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'danger',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
				slots: {
					default: '<n8n-text size="small">This is a danger callout.</n8n-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render secondary theme correctly', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'secondary',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
				slots: {
					default: '<n8n-text size="small">This is a secondary callout.</n8n-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render custom theme correctly', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'custom',
					icon: 'git-branch',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
				slots: {
					default: '<n8n-text size="small">This is a secondary callout.</n8n-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render additional slots correctly', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'custom',
					icon: 'git-branch',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text', 'n8n-link'],
				},
				slots: {
					default: '<n8n-text size="small">This is a secondary callout.</n8n-text>',
					actions: '<n8n-link size="small">Do something!</n8n-link>',
					trailingContent:
						'<n8n-link theme="secondary" size="small" :bold="true" :underline="true" to="https://n8n.io">Learn more</n8n-link>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
	});
});
