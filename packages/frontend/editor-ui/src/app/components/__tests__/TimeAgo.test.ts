import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { TIME_AGO_LIVE_REFRESH_INTERVAL } from '@/app/constants/durations';

const renderComponent = createComponentRenderer(TimeAgo);

describe('TimeAgo', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should age a live label once per interval', async () => {
		const { container } = renderComponent({
			props: { date: new Date().toISOString(), live: true },
		});
		expect(container.textContent).toBe('just now');

		vi.advanceTimersByTime(TIME_AGO_LIVE_REFRESH_INTERVAL - 1);
		await nextTick();
		expect(container.textContent).toBe('just now');

		vi.advanceTimersByTime(5 * 60 * 1000);
		await nextTick();
		expect(container.textContent).toBe('5 minutes ago');
	});

	it('should keep a static label at its first value', async () => {
		const { container } = renderComponent({ props: { date: new Date().toISOString() } });
		expect(container.textContent).toBe('just now');

		vi.advanceTimersByTime(5 * 60 * 1000);
		await nextTick();

		expect(container.textContent).toBe('just now');
	});

	it('should read a date set between two ticks as the past', async () => {
		const { container, rerender } = renderComponent({
			props: { date: new Date().toISOString(), live: true },
		});

		// The reference date trails the clock by up to one tick, so a newer date must not read as the future.
		vi.advanceTimersByTime(10 * 1000);
		await rerender({ date: new Date().toISOString(), live: true });

		expect(container.textContent).toBe('just now');
	});
});
