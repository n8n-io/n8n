import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

import ThinkingMessage from './ThinkingMessage.vue';
import type { ChatUI } from '../../../types/assistant';

describe('ThinkingMessage', () => {
	const mockItems: ChatUI.ThinkingItem[] = [
		{
			id: 'tool-1',
			displayTitle: 'Search Results',
			status: 'completed',
		},
		{
			id: 'tool-2',
			displayTitle: 'Processing Data',
			status: 'running',
		},
	];

	it('renders with items collapsed when defaultExpanded is false', () => {
		const { container, queryByText } = render(ThinkingMessage, {
			props: {
				items: mockItems,
				latestStatusText: 'Processing...',
				defaultExpanded: false,
			},
		});

		expect(container.textContent).toContain('Processing...');

		expect(queryByText('Search Results')).toBeNull();
		expect(queryByText('Processing Data')).toBeNull();
	});

	it('renders with items expanded when defaultExpanded is true', () => {
		const { container, getByText } = render(ThinkingMessage, {
			props: {
				items: mockItems,
				latestStatusText: 'Processing...',
				defaultExpanded: true,
			},
		});

		expect(container.textContent).toContain('Processing...');

		expect(getByText('Search Results')).toBeInTheDocument();
		expect(getByText('Processing Data')).toBeInTheDocument();
	});

	it('defaults to collapsed when defaultExpanded prop is not provided', () => {
		const { queryByText } = render(ThinkingMessage, {
			props: {
				items: mockItems,
				latestStatusText: 'Processing...',
			},
		});

		expect(queryByText('Search Results')).toBeNull();
		expect(queryByText('Processing Data')).toBeNull();
	});

	it('toggles expansion when header is clicked', async () => {
		const user = userEvent.setup();
		const { getByRole, queryByText, getByText } = render(ThinkingMessage, {
			props: {
				items: mockItems,
				latestStatusText: 'Processing...',
				defaultExpanded: false,
			},
		});

		expect(queryByText('Search Results')).toBeNull();

		const headerButton = getByRole('button');
		await user.click(headerButton);

		expect(getByText('Search Results')).toBeInTheDocument();
		expect(getByText('Processing Data')).toBeInTheDocument();

		await user.click(headerButton);

		expect(queryByText('Search Results')).toBeNull();
	});

	it('shows shimmer animation when there is a running item', () => {
		const { container } = render(ThinkingMessage, {
			props: {
				items: mockItems,
				latestStatusText: 'Processing...',
				defaultExpanded: false,
			},
		});

		const statusText = container.querySelector('button > span');
		expect(statusText?.className).toContain('shimmer');
	});

	it('does not show shimmer animation when all items are completed', () => {
		const completedItems: ChatUI.ThinkingItem[] = [
			{
				id: 'tool-1',
				displayTitle: 'Search Results',
				status: 'completed',
			},
		];

		const { container } = render(ThinkingMessage, {
			props: {
				items: completedItems,
				latestStatusText: 'Completed',
				defaultExpanded: false,
			},
		});

		const statusText = container.querySelector('button > span');
		expect(statusText?.className).not.toContain('shimmer');
	});

	it('auto-collapses when isStreaming transitions from true to false', async () => {
		const items: ChatUI.ThinkingItem[] = [
			{
				id: 'tool-1',
				displayTitle: 'Processing',
				status: 'running',
			},
		];

		const { rerender, getByText, queryByText } = render(ThinkingMessage, {
			props: {
				items,
				latestStatusText: 'Processing...',
				defaultExpanded: true,
				isStreaming: true,
			},
		});

		// Initially expanded and showing the item
		expect(getByText('Processing')).toBeInTheDocument();

		// isStreaming transitions to false
		await rerender({
			items,
			latestStatusText: 'Processing...',
			defaultExpanded: true,
			isStreaming: false,
		});

		// Should auto-collapse - item no longer visible
		expect(queryByText('Processing')).toBeNull();
	});
});
