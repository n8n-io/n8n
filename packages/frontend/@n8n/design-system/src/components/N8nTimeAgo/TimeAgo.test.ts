import { render } from '@testing-library/vue';
import { register } from 'timeago.js';

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
});
