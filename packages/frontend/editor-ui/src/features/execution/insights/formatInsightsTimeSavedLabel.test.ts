import { describe, expect, it, vi } from 'vitest';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (
			key: string,
			options?: { interpolate?: { count: number }; adjustToNumber?: number },
		) => {
			const count = options?.interpolate?.count ?? 0;
			if (key === 'insights.timeSaved.minutes') return `${count} min`;
			if (key === 'insights.timeSaved.hours') return `${count} hr`;
			return key;
		},
	}),
}));

import { formatInsightsTimeSavedLabel } from './insights.utils';

describe('formatInsightsTimeSavedLabel', () => {
	it('formats sub-hour values as minutes', () => {
		expect(formatInsightsTimeSavedLabel(45)).toBe('45 min');
	});

	it('formats hour-or-more values as hours', () => {
		expect(formatInsightsTimeSavedLabel(120)).toBe('2 hr');
	});
});
