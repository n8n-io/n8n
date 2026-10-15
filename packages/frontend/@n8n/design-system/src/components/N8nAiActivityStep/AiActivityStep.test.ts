import { render } from '@testing-library/vue';

import AiActivityStep from './AiActivityStep.vue';

const global = {
	stubs: {
		CollapsibleRoot: { template: '<div><slot :open="true" /></div>' },
		CollapsibleTrigger: { template: '<button><slot /></button>' },
		CollapsibleContent: { template: '<div><slot /></div>' },
		N8nButton: { template: '<div data-test-id="timeline-step-button"><slot /></div>' },
		N8nIcon: { template: '<span class="n8n-icon" />' },
	},
};

describe('N8nAiActivityStep', () => {
	it('should render without throwing', () => {
		expect(() =>
			render(AiActivityStep, { props: { label: 'Search nodes' }, global }),
		).not.toThrow();
	});

	it('should display the label', () => {
		const { getByText } = render(AiActivityStep, {
			props: { label: 'Search nodes' },
			global,
		});

		expect(getByText('Search nodes')).toBeInTheDocument();
	});

	it('should show loading affordance when loading', () => {
		const { getByText } = render(AiActivityStep, {
			props: { label: 'Search nodes', loading: true },
			global,
		});

		expect(getByText('Search nodes').className).toContain('shimmer');
	});

	it('should show error text when provided', () => {
		const { getByText } = render(AiActivityStep, {
			props: { label: 'Search nodes', error: 'Something went wrong' },
			global,
		});

		expect(getByText('Something went wrong')).toBeInTheDocument();
	});

	it('should hide the inner error callout when hideErrorCallout is true', () => {
		const { container } = render(AiActivityStep, {
			props: {
				label: 'Search nodes',
				error: 'Something went wrong',
				hideErrorCallout: true,
			},
			global: {
				...global,
				stubs: {
					...global.stubs,
					N8nCallout: {
						template: '<div data-test-id="activity-error-callout"><slot /></div>',
					},
					N8nTooltip: { template: '<div><slot /></div>' },
				},
			},
		});

		expect(
			container.querySelector('[data-test-id="activity-error-callout"]'),
		).not.toBeInTheDocument();
		expect(container.querySelector('.n8n-icon')).toBeInTheDocument();
	});

	it('should render slot content', () => {
		const { getByText } = render(AiActivityStep, {
			props: { label: 'Search nodes' },
			slots: { default: '<div>Custom details</div>' },
			global,
		});

		expect(getByText('Custom details')).toBeInTheDocument();
	});

	it('should wrap slot content when wrapContent is true', () => {
		const { getByText } = render(AiActivityStep, {
			props: { label: 'Search nodes', wrapContent: true },
			slots: { default: '<pre>Custom details</pre>' },
			global,
		});

		expect(getByText('Custom details').parentElement?.className).toContain('resultSection');
	});

	it('should hide collapsible affordances and content when hasContent is false', () => {
		const { container, getByText, queryByText } = render(AiActivityStep, {
			props: { label: 'Search nodes', hasContent: false },
			slots: { default: '<div>Custom details</div>' },
			global,
		});

		expect(getByText('Search nodes')).toBeInTheDocument();
		expect(container.querySelector('.n8n-icon')).not.toBeInTheDocument();
		expect(queryByText('Custom details')).not.toBeInTheDocument();
	});

	it('should default the error icon to triangle-alert', () => {
		const { container } = render(AiActivityStep, {
			props: { label: 'Search nodes', error: 'Something went wrong' },
			global,
		});

		expect(container.querySelector('.n8n-icon')?.getAttribute('icon')).toBe('triangle-alert');
	});

	it('should use a custom errorIcon when provided', () => {
		const { container } = render(AiActivityStep, {
			props: { label: 'Search nodes', error: 'Something went wrong', errorIcon: 'lock' },
			global,
		});

		expect(container.querySelector('.n8n-icon')?.getAttribute('icon')).toBe('lock');
	});

	it('should render errorCallout slot content instead of the default error text', () => {
		const { getByText, queryByText } = render(AiActivityStep, {
			props: { label: 'Search nodes', error: 'Something went wrong' },
			slots: { errorCallout: '<span>Custom callout text</span>' },
			global,
		});

		expect(getByText('Custom callout text')).toBeInTheDocument();
		// The tooltip is hidden by default in this test environment, so the only
		// remaining place `error` could render is the callout body it replaced.
		expect(queryByText('Something went wrong')).not.toBeInTheDocument();
	});

	it('should still show the error text in the tooltip when errorCallout slot is used', () => {
		const { getByText } = render(AiActivityStep, {
			props: { label: 'Search nodes', error: 'Something went wrong' },
			slots: { errorCallout: '<span>Custom callout text</span>' },
			global: {
				...global,
				stubs: {
					...global.stubs,
					N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
				},
			},
		});

		expect(getByText('Something went wrong')).toBeInTheDocument();
		expect(getByText('Custom callout text')).toBeInTheDocument();
	});
});
