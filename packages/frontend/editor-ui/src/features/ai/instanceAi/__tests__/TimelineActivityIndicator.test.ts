import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import TimelineActivityIndicator from '../components/TimelineActivityIndicator.vue';

const renderComponent = createThreadComponentRenderer(TimelineActivityIndicator);

describe('TimelineActivityIndicator', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders a live indicator', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('timeline-activity-indicator')).toBeInTheDocument();
	});

	it('counts up so the user can see the run is still going', async () => {
		const { getByTestId } = renderComponent();
		const indicator = getByTestId('timeline-activity-indicator');

		expect(indicator).toHaveTextContent('Thinking');
		expect(indicator).not.toHaveTextContent('·');

		await vi.advanceTimersByTimeAsync(3_000);
		expect(indicator).toHaveTextContent('Thinking · 3s');

		await vi.advanceTimersByTimeAsync(60_000);
		expect(indicator).toHaveTextContent('Thinking · 1m 3s');
	});
});
