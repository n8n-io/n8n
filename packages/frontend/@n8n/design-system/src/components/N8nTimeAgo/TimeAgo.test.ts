import { render } from '@testing-library/vue';
import { register } from 'timeago.js';
import { nextTick } from 'vue';

import N8nTimeAgo from './TimeAgo.vue';

const NOW = new Date('2026-09-22T12:00:00.000Z');
const THREE_MINUTES_AGO = new Date(NOW.getTime() - 3 * 60 * 1000).toISOString();

describe('N8nTimeAgo', () => {
	beforeEach(() => {
		vi.useFakeTimers({ now: NOW });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders a lowercase relative time with the default locale', () => {
		const { container } = render(N8nTimeAgo, { props: { date: THREE_MINUTES_AGO } });

		expect(container.textContent?.trim()).toBe('3 minutes ago');
	});

	it('lowercases the locale text unless capitalize is set', () => {
		register('test-capitalized', () => ['Moments ago', 'In moments']);

		const lowercased = render(N8nTimeAgo, {
			props: { date: THREE_MINUTES_AGO, locale: 'test-capitalized' },
		});
		expect(lowercased.container.textContent?.trim()).toBe('moments ago');

		const capitalized = render(N8nTimeAgo, {
			props: { date: THREE_MINUTES_AGO, locale: 'test-capitalized', capitalize: true },
		});
		expect(capitalized.container.textContent?.trim()).toBe('Moments ago');
	});

	it('formats with the locale passed through the locale prop', () => {
		register('test-indexed', (_number, index) => [`past ${index}`, `future ${index}`]);

		const { container } = render(N8nTimeAgo, {
			props: { date: THREE_MINUTES_AGO, locale: 'test-indexed' },
		});

		// index 3 is the "%s minutes ago" row of the timeago.js locale table
		expect(container.textContent?.trim()).toBe('past 3');
	});

	it('sets the absolute date as the title', () => {
		const { container } = render(N8nTimeAgo, { props: { date: THREE_MINUTES_AGO } });

		// the test harness pins TZ to UTC
		expect(container.querySelector('span')?.getAttribute('title')).toContain(
			'22 September, 2026 @ 11:57',
		);
	});

	it('ages a live label once per interval', async () => {
		const { container } = render(N8nTimeAgo, { props: { date: NOW.toISOString(), live: true } });
		expect(container.textContent?.trim()).toBe('just now');

		vi.advanceTimersByTime(29 * 1000);
		await nextTick();
		expect(container.textContent?.trim()).toBe('just now');

		vi.advanceTimersByTime(5 * 60 * 1000);
		await nextTick();
		expect(container.textContent?.trim()).toBe('5 minutes ago');
	});

	it('keeps a static label at its first value', async () => {
		const { container } = render(N8nTimeAgo, { props: { date: NOW.toISOString() } });

		vi.advanceTimersByTime(5 * 60 * 1000);
		await nextTick();

		expect(container.textContent?.trim()).toBe('just now');
	});

	it('reads a date set between two ticks as the past', async () => {
		const { container, rerender } = render(N8nTimeAgo, {
			props: { date: NOW.toISOString(), live: true },
		});

		// The reference date trails the clock by up to one tick, so a newer date must not read as the future.
		vi.advanceTimersByTime(10 * 1000);
		await rerender({ date: new Date().toISOString(), live: true });

		expect(container.textContent?.trim()).toBe('just now');
	});
});
