import type { PublicApiRateLimitSettings } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import {
	exceedsAllEndpointsLimit,
	summarizeLimits,
	parseInputs,
	getRowError,
	hasNoLimits,
	toInputs,
} from './rateLimits';

const settings: PublicApiRateLimitSettings = {
	enabled: true,
	globalReadLimit: 100,
	globalReadWindowSeconds: 60,
	globalWriteLimit: 50,
	globalWriteWindowSeconds: 60,
	endpointReadLimit: 20,
	endpointReadWindowSeconds: 60,
	endpointWriteLimit: 0,
	endpointWriteWindowSeconds: 60,
};

describe('rateLimits', () => {
	const i18n = useI18n();

	describe('toInputs and parseInputs', () => {
		it('shows a limit of 0 as an empty field', () => {
			expect(toInputs(settings).endpointWrite).toEqual({ limit: '', window: '60' });
		});

		it('keeps the stored window when an empty limit has an invalid window', () => {
			const inputs = toInputs(settings);
			inputs.globalRead = { limit: '', window: 'abc' };

			expect(parseInputs(inputs, settings).globalReadWindowSeconds).toBe(60);
		});

		it('turns an empty limit back into 0 and keeps the other values', () => {
			const inputs = toInputs(settings);
			inputs.globalRead = { limit: '', window: '30' };

			expect(parseInputs(inputs, settings)).toEqual({
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

	it('finds inputs with no limits', () => {
		const inputs = toInputs({
			...settings,
			globalReadLimit: 0,
			globalWriteLimit: 0,
			endpointReadLimit: 0,
		});

		expect(hasNoLimits(inputs)).toBe(true);
		expect(hasNoLimits(toInputs(settings))).toBe(false);
	});

	describe('exceedsAllEndpointsLimit', () => {
		it.each([
			{ endpoint: { limit: '150', window: '60' }, exceeds: true },
			{ endpoint: { limit: '150', window: '30' }, exceeds: true },
			{ endpoint: { limit: '80', window: '30' }, exceeds: false },
			{ endpoint: { limit: '150', window: '120' }, exceeds: false },
			{ endpoint: { limit: '100', window: '60' }, exceeds: false },
		])(
			'is $exceeds for $endpoint.limit per $endpoint.window s against 100 per 60 s',
			({ endpoint, exceeds }) => {
				const inputs = toInputs(settings);
				inputs.endpointRead = endpoint;

				expect(exceedsAllEndpointsLimit(inputs, 'endpointRead')).toBe(exceeds);
			},
		);

		it('is false when one of the two limits is not set', () => {
			const inputs = toInputs({ ...settings, globalReadLimit: 0 });

			expect(exceedsAllEndpointsLimit(inputs, 'endpointRead')).toBe(false);
		});
	});

	describe('summarizeLimits', () => {
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
			expect(summarizeLimits({ ...settings, ...values }, 'allEndpoints', i18n)).toBe(text);
		});
	});
});
