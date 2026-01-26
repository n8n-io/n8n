import { describe, it, expect } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import AskModeEmptyState from './AskModeEmptyState.vue';

const renderComponent = createComponentRenderer(AskModeEmptyState);

describe('AskModeEmptyState', () => {
	it('renders the empty state content', () => {
		const { getByText, container } = renderComponent();

		expect(getByText('Ask n8n AI')).toBeInTheDocument();
		expect(
			getByText(
				"Ask anything about n8n, your workflow, or how to accomplish a task. This won't use any of your AI credits.",
			),
		).toBeInTheDocument();

		// Check the inline button text is present
		const bodyElements = container.querySelectorAll('[class*="body"]');
		const secondBody = bodyElements[1];
		expect(secondBody?.textContent).toContain('Look for the');
		expect(secondBody?.textContent).toContain('button throughout the UI to get contextual help.');
	});
});
