import { describe, it, expect } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import AskModeEmptyState from './AskModeEmptyState.vue';

const renderComponent = createComponentRenderer(AskModeEmptyState);

describe('AskModeEmptyState', () => {
	it('renders the title', () => {
		const { getByText } = renderComponent();

		expect(getByText('Ask n8n AI')).toBeInTheDocument();
	});

	it('renders the body text about asking questions', () => {
		const { getByText } = renderComponent();

		expect(
			getByText(
				"Ask anything about n8n, your workflow, or how to accomplish a task. This won't use any of your AI credits.",
			),
		).toBeInTheDocument();
	});

	it('renders the body text about the inline button', () => {
		const { container } = renderComponent();

		// The text is split across elements with the inline button in between
		// Check that the paragraph contains the expected text fragments
		const bodyElements = container.querySelectorAll('[class*="body"]');
		const secondBody = bodyElements[1];
		expect(secondBody).toBeInTheDocument();
		expect(secondBody?.textContent).toContain('Look for the');
		expect(secondBody?.textContent).toContain('button throughout the UI to get contextual help.');
	});

	it('renders the lightbulb icon', () => {
		const { container } = renderComponent();

		// The icon should be rendered
		const icon = container.querySelector('[class*="icon"]');
		expect(icon).toBeInTheDocument();
	});

	it('renders the inline assistant button', () => {
		const { container } = renderComponent();

		// The inline button should be rendered
		const inlineButton = container.querySelector('[class*="inlineButton"]');
		expect(inlineButton).toBeInTheDocument();
	});
});
