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

	it('should age a live label as time passes', async () => {
		const { container } = renderComponent({
			props: { date: new Date().toISOString(), live: true },
		});
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

		// No `live`, no timer: the label stays as first rendered.
		expect(container.textContent).toBe('just now');
	});

	it('should refresh a live label once per interval', async () => {
		const { container } = renderComponent({
			props: { date: new Date().toISOString(), live: true },
		});

		vi.advanceTimersByTime(TIME_AGO_LIVE_REFRESH_INTERVAL - 1);
		await nextTick();
		expect(container.textContent).toBe('just now');

		vi.advanceTimersByTime(60 * 1000);
		await nextTick();
		expect(container.textContent).toBe('1 minute ago');
	});
});
