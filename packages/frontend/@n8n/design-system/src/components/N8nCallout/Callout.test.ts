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
					stubs: ['N8nIcon', 'N8nText'],
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
					stubs: ['N8nIcon', 'N8nText'],
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
					stubs: ['N8nIcon', 'N8nText'],
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
					stubs: ['N8nIcon', 'N8nText'],
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
					stubs: ['N8nIcon', 'N8nText'],
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
					stubs: ['N8nIcon', 'N8nText'],
				},
				slots: {
					default: '<n8n-text size="small">This is a secondary callout.</n8n-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should wrap icon in a tooltip when iconTooltip is provided', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'custom',
					icon: 'info',
					iconTooltip: 'Useful explanation',
				},
				global: {
					stubs: ['N8nIcon', 'N8nText', 'N8nTooltip'],
				},
				slots: {
					default: '<n8n-text size="small">This is a callout with an icon tooltip.</n8n-text>',
				},
			});
			const tooltip = wrapper.container.querySelector('n8n-tooltip-stub');
			expect(tooltip).toBeTruthy();
			expect(tooltip?.getAttribute('content')).toBe('Useful explanation');
		});
		it('should not render a tooltip when iconTooltip is not provided', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				global: {
					stubs: ['N8nIcon', 'N8nText', 'N8nTooltip'],
				},
				slots: {
					default: '<n8n-text size="small">This is an info callout.</n8n-text>',
				},
			});
			expect(wrapper.container.querySelector('n8n-tooltip-stub')).toBeFalsy();
		});
		it('should render additional slots correctly', () => {
			const wrapper = render(N8nCallout, {
				props: {
					theme: 'custom',
					icon: 'git-branch',
				},
				global: {
					stubs: ['N8nIcon', 'N8nText', 'N8nLink'],
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
