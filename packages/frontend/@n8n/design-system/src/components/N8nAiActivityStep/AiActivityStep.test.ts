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
});
