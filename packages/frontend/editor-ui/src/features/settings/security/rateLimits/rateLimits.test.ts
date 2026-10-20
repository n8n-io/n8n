import type { PublicApiRateLimitSettings } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import {
	exceedsAllEndpointsLimit,
	formatGroupSummary,
	fromDraft,
	getRowError,
	isDraftEmpty,
	toDraft,
} from './rateLimits';

const settings: PublicApiRateLimitSettings = {
	enabled: true,
	globalReadLimit: 1200,
	globalReadWindowSeconds: 60,
	globalWriteLimit: 300,
	globalWriteWindowSeconds: 60,
	endpointReadLimit: 600,
	endpointReadWindowSeconds: 60,
	endpointWriteLimit: 0,
	endpointWriteWindowSeconds: 60,
};

describe('rateLimits', () => {
	const i18n = useI18n();

	describe('toDraft and fromDraft', () => {
		it('shows a limit of 0 as an empty field', () => {
			expect(toDraft(settings).endpointWrite).toEqual({ limit: '', window: '60' });
		});

		it('turns an empty limit back into 0 and keeps the other values', () => {
			const draft = toDraft(settings);
			draft.globalRead = { limit: '', window: '30' };

			expect(fromDraft(draft, settings)).toEqual({
				...settings,
				globalReadLimit: 0,
				globalReadWindowSeconds: 30,
			});
		});
	});

	describe('getRowError', () => {
		it.each([
			{ row: { limit: '', window: '60' }, error: undefined },
			{ row: { limit: '0', window: '' }, error: undefined },
			{ row: { limit: '5', window: '1' }, error: undefined },
			{ row: { limit: 'abc', window: '60' }, error: 'limit' },
			{ row: { limit: '1.5', window: '60' }, error: 'limit' },
			{ row: { limit: '-1', window: '60' }, error: 'limit' },
			{ row: { limit: '5', window: '0' }, error: 'window' },
			{ row: { limit: '5', window: '' }, error: 'window' },
		])('returns $error for $row', ({ row, error }) => {
			expect(getRowError(row)).toBe(error);
		});
	});

	it('finds a draft with no limits', () => {
		const draft = toDraft({
			...settings,
			globalReadLimit: 0,
			globalWriteLimit: 0,
			endpointReadLimit: 0,
		});

		expect(isDraftEmpty(draft)).toBe(true);
		expect(isDraftEmpty(toDraft(settings))).toBe(false);
	});

	describe('exceedsAllEndpointsLimit', () => {
		it('compares the limits by rate', () => {
			const draft = toDraft(settings);
			draft.endpointRead = { limit: '1000', window: '30' };

			expect(exceedsAllEndpointsLimit(draft, 'endpointRead')).toBe(true);

			draft.endpointRead = { limit: '1000', window: '60' };
			expect(exceedsAllEndpointsLimit(draft, 'endpointRead')).toBe(false);
		});

		it('is false when one of the two limits is not set', () => {
			const draft = toDraft({ ...settings, globalReadLimit: 0 });

			expect(exceedsAllEndpointsLimit(draft, 'endpointRead')).toBe(false);
		});
	});

	describe('formatGroupSummary', () => {
		it.each([
			{
				case: 'both limits with the same window',
				values: { globalReadLimit: 2, globalWriteLimit: 2 },
				text: '2 reads · 2 writes / 60 seconds',
			},
			{
				case: 'both limits with different windows',
				values: { globalReadLimit: 1200, globalWriteLimit: 2, globalWriteWindowSeconds: 120 },
				text: '1,200 reads / 60 seconds · 2 writes / 120 seconds',
			},
			{
				case: 'reads only',
				values: { globalReadLimit: 1, globalReadWindowSeconds: 1, globalWriteLimit: 0 },
				text: '1 read / 1 second · no limit on writes',
			},
			{
				case: 'writes only',
				values: { globalReadLimit: 0, globalWriteLimit: 5 },
				text: 'no limit on reads · 5 writes / 60 seconds',
			},
			{
				case: 'no limits',
				values: { globalReadLimit: 0, globalWriteLimit: 0 },
				text: 'no limit on reads or writes',
			},
		])('writes $case', ({ values, text }) => {
			expect(formatGroupSummary({ ...settings, ...values }, 'allEndpoints', i18n)).toBe(text);
		});
	});
});
