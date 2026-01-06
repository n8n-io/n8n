import { render } from '@testing-library/vue';

import ThinkingMessagePlaceholder from './ThinkingMessagePlaceholder.vue';

describe('ThinkingMessagePlaceholder', () => {
	it('renders the message text', () => {
		const { getByText } = render(ThinkingMessagePlaceholder, {
			props: {
				message: 'Thinking',
			},
		});

		expect(getByText('Thinking')).toBeInTheDocument();
	});

	it('applies shimmer animation to the message', () => {
		const { container } = render(ThinkingMessagePlaceholder, {
			props: {
				message: 'Processing...',
			},
		});

		const statusText = container.querySelector('span');
		expect(statusText?.className).toContain('shimmer');
	});

	it('renders with correct styling classes', () => {
		const { container } = render(ThinkingMessagePlaceholder, {
			props: {
				message: 'Loading',
			},
		});

		const statusText = container.querySelector('span');
		expect(statusText?.className).toContain('statusText');
	});

	it('updates when message prop changes', async () => {
		const { getByText, rerender } = render(ThinkingMessagePlaceholder, {
			props: {
				message: 'Initial message',
			},
		});

		expect(getByText('Initial message')).toBeInTheDocument();

		await rerender({ message: 'Updated message' });

		expect(getByText('Updated message')).toBeInTheDocument();
	});
});
