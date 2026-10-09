import { render, waitFor } from '@testing-library/vue';

import AiActivityStep from './AiActivityStep.vue';

/** Reka UI opens a tooltip on a mouse `pointermove` over its trigger. */
function hover(element: Element) {
	element.dispatchEvent(
		new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerType: 'mouse' }),
	);
}

function openTooltip(): Element | null {
	return document.querySelector('[data-dismissable-layer]');
}

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

	describe('fullLabel', () => {
		const fullLabel = 'Read packages/frontend/editor-ui/src/components/AgentCodingDiff.vue';
		const label = 'Read packages/…/AgentCodingDiff.vue';

		it('shows the full label as a tooltip of the label, not of the details', async () => {
			const { getByText, getByRole } = render(AiActivityStep, {
				props: { label, fullLabel },
				slots: { default: '<pre>Command output</pre>' },
			});

			getByRole('button', { name: fullLabel }).click();
			hover(await waitFor(() => getByText('Command output')));
			expect(openTooltip()).toBeNull();

			hover(getByText(label));
			await waitFor(() => expect(openTooltip()).toHaveTextContent(fullLabel));
		});

		it('names the step with the full label for screen readers', () => {
			const { getByRole } = render(AiActivityStep, {
				props: { label, fullLabel, hasContent: false },
			});

			expect(getByRole('button', { name: fullLabel })).toHaveTextContent(label);
		});

		it('adds no tooltip and no other name when the label is whole', () => {
			const { getByRole, getByText } = render(AiActivityStep, {
				props: { label: 'Read a.ts', fullLabel: 'Read a.ts' },
			});

			hover(getByText('Read a.ts'));
			expect(getByRole('button')).not.toHaveAttribute('aria-label');
			expect(openTooltip()).toBeNull();
		});
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
