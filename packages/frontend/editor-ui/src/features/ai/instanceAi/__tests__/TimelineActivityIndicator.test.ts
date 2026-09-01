import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import TimelineActivityIndicator from '../components/TimelineActivityIndicator.vue';
import { ACTIVITY_INDICATOR_DELAY_MS } from '../agentTimeline.utils';

const renderComponent = createThreadComponentRenderer(TimelineActivityIndicator);

const TEST_ID = 'timeline-activity-indicator';

describe('TimelineActivityIndicator', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('stays hidden through a short silence', async () => {
		// The tail of a streamed answer and a run wrapping up both go quiet for a
		// second or two; flagging those would put "Thinking" under every reply.
		const { queryByTestId } = renderComponent({ props: { progressToken: 'run-1:2:100' } });

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS - 1_000);
		expect(queryByTestId(TEST_ID)).toBeNull();
	});

	it('appears once the silence is worth reporting, and counts up', async () => {
		const { queryByTestId } = renderComponent({ props: { progressToken: 'run-1:2:100' } });

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS);
		expect(queryByTestId(TEST_ID)).toHaveTextContent('Thinking · 5s');

		await vi.advanceTimersByTimeAsync(60_000);
		expect(queryByTestId(TEST_ID)).toHaveTextContent('Thinking · 1m 5s');
	});

	it('restarts the clock and hides again when the run advances', async () => {
		// Text still streaming into the tail entry is progress, not dead time.
		const { queryByTestId, rerender } = renderComponent({
			props: { progressToken: 'run-1:2:100' },
		});

		await vi.advanceTimersByTimeAsync(9_000);
		expect(queryByTestId(TEST_ID)).toHaveTextContent('Thinking · 9s');

		await rerender({ progressToken: 'run-1:2:140' });
		expect(queryByTestId(TEST_ID)).toBeNull();

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS);
		expect(queryByTestId(TEST_ID)).toHaveTextContent('Thinking · 5s');
	});

	it('restarts the clock for a follow-up run in the same message group', async () => {
		// The timeline is unchanged across the handover, so only the run id moves.
		const { queryByTestId, rerender } = renderComponent({
			props: { progressToken: 'run-1:2:100' },
		});

		await vi.advanceTimersByTimeAsync(40_000);
		expect(queryByTestId(TEST_ID)).toHaveTextContent('Thinking · 40s');

		await rerender({ progressToken: 'run-2:2:100' });
		expect(queryByTestId(TEST_ID)).toBeNull();
	});

	it('keeps counting while nothing advances', async () => {
		const { queryByTestId, rerender } = renderComponent({
			props: { progressToken: 'run-1:2:100' },
		});

		await vi.advanceTimersByTimeAsync(20_000);
		await rerender({ progressToken: 'run-1:2:100' });
		await vi.advanceTimersByTimeAsync(1_000);

		expect(queryByTestId(TEST_ID)).toHaveTextContent('Thinking · 21s');
	});
});
