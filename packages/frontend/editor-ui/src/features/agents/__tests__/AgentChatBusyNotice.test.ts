import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import AgentChatBusyNotice from '../components/AgentChatBusyNotice.vue';

const renderComponent = createComponentRenderer(AgentChatBusyNotice);

describe('AgentChatBusyNotice', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('counts down to a new try and keeps the draft hint', async () => {
		const { getByTestId, getByText } = renderComponent({
			props: { notice: { code: 'main_busy', draftKept: true, retryAt: 1_000_000 + 3_000 } },
		});

		expect(getByText("n8n is busy right now, so the agent didn't run")).toBeInTheDocument();
		expect(getByTestId('agent-chat-busy-notice-detail')).toHaveTextContent(
			"Your message wasn't sent and is still in the chat box. Try again in 3 s.",
		);

		await vi.advanceTimersByTimeAsync(3_000);

		expect(getByTestId('agent-chat-busy-notice-detail')).toHaveTextContent(
			"Your message wasn't sent and is still in the chat box. You can try again now.",
		);
	});

	it('restarts the countdown when a new busy notice replaces a finished one', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { notice: { code: 'main_busy', draftKept: false, retryAt: 1_000_000 + 2_000 } },
		});

		await vi.advanceTimersByTimeAsync(3_000);
		expect(getByTestId('agent-chat-busy-notice-detail')).toHaveTextContent(
			'You can try again now.',
		);

		await rerender({
			notice: { code: 'queue_full', draftKept: false, retryAt: Date.now() + 5_000 },
		});
		expect(getByTestId('agent-chat-busy-notice-detail')).toHaveTextContent('Try again in 5 s.');

		await vi.advanceTimersByTimeAsync(2_000);
		expect(getByTestId('agent-chat-busy-notice-detail')).toHaveTextContent('Try again in 3 s.');

		await vi.advanceTimersByTimeAsync(3_000);
		expect(getByTestId('agent-chat-busy-notice-detail')).toHaveTextContent(
			'You can try again now.',
		);
	});

	it('keeps the ticking countdown out of the alert announcement', async () => {
		const { getByTestId } = renderComponent({
			props: { notice: { code: 'main_busy', draftKept: false, retryAt: 1_000_000 + 3_000 } },
		});

		expect(getByTestId('agent-chat-busy-notice-detail')).toHaveAttribute('aria-hidden', 'true');
		const announcement = getByTestId('agent-chat-busy-notice-announcement');
		expect(announcement).toHaveTextContent('Try again in 3 s.');

		await vi.advanceTimersByTimeAsync(1_000);
		expect(getByTestId('agent-chat-busy-notice-detail')).toHaveTextContent('Try again in 2 s.');
		expect(announcement).toHaveTextContent('Try again in 3 s.');

		await vi.advanceTimersByTimeAsync(2_000);
		expect(announcement).toHaveTextContent('You can try again now.');
	});

	it('shows the low-memory reason without the draft hint', () => {
		const { getByTestId, getByText } = renderComponent({
			props: { notice: { code: 'low_memory', draftKept: false, retryAt: 1_000_000 + 10_000 } },
		});

		expect(
			getByText("n8n is low on memory right now, so the agent didn't run"),
		).toBeInTheDocument();
		expect(getByTestId('agent-chat-busy-notice-detail')).toHaveTextContent('Try again in 10 s.');
	});

	it('emits dismiss', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { notice: { code: 'queue_full', draftKept: true, retryAt: 1_000_000 } },
		});

		await fireEvent.click(getByTestId('agent-chat-busy-notice-dismiss'));

		expect(emitted().dismiss).toHaveLength(1);
	});
});
