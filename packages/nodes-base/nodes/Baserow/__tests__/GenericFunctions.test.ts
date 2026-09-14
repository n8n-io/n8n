/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { NodeApiError } from 'n8n-workflow';

import {
	baserowApiRequest,
	baserowApiRequestAllItems,
	formatBaserowFilterValue,
	getFieldNamesAndIds,
	normalizeFilterFieldId,
	toOptions,
	TableFieldMapper,
} from '../GenericFunctions';

describe('Baserow > GenericFunctions', () => {
	const mockExecuteFunctions: any = {
		helpers: {
			requestWithAuthentication: vi.fn(),
		},
		getCredentials: vi.fn().mockResolvedValue({
			host: 'https://api.baserow.io',
		}),
		getNodeParameter: vi.fn(),
		getNode: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			host: 'https://api.baserow.io',
		});
	});

	describe('baserowApiRequest', () => {
		it('should return data on success', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
			});
			const result = await baserowApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/endpoint',
				'baserowApi',
			);
			expect(result).toEqual({ success: true });
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'baserowApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.baserow.io/endpoint',
				}),
			);
		});

		it('should throw NodeApiError on failure', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValue({
				error: 'fail',
			});
			await expect(
				baserowApiRequest.call(mockExecuteFunctions, 'GET', '/endpoint', 'baserowApi'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('baserowApiRequestAllItems', () => {
		it('should accumulate all pages', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(true) // returnAll
				.mockReturnValue(1000); // limit
			mockExecuteFunctions.helpers.requestWithAuthentication
				.mockResolvedValueOnce({ results: [{ data: 1 }], next: 'page2' })
				.mockResolvedValueOnce({ results: [{ data: 2 }], next: null });

			const result = await baserowApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				'/endpoint',
				'baserowApi',
				{},
				{},
			);

			expect(result).toEqual([{ data: 1 }, { data: 2 }]);
		});
	});

	describe('getFieldNamesAndIds', () => {
		it('should return field names and ids', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue([
				{ id: 1, name: 'field1' },
				{ id: 2, name: 'field2' },
			]);
			const result = await getFieldNamesAndIds.call(mockExecuteFunctions, '1', 'baserowApi');
			expect(result).toEqual({
				names: ['field1', 'field2'],
				ids: ['field_1', 'field_2'],
			});
		});
	});

	describe('toOptions', () => {
		it('should map items to options', () => {
			const result = toOptions([
				{ id: 1, name: 'field1' },
				{ id: 2, name: 'field2' },
			]);
			expect(result).toEqual([
				{ name: 'field1', value: 1 },
				{ name: 'field2', value: 2 },
			]);
		});
	});

	describe('TableFieldMapper', () => {
		it('should create name-to-id and id-to-name mappings', () => {
			const mapper = new TableFieldMapper();
			mapper.createMappings([
				{ id: 1, name: 'field1' },
				{ id: 2, name: 'field2' },
			]);
			expect(mapper.nameToIdMapping).toEqual({
				field1: 'field_1',
				field2: 'field_2',
			});
			expect(mapper.idToNameMapping).toEqual({
				field_1: 'field1',
				field_2: 'field2',
			});
		});
	});

	describe('formatBaserowFilterValue', () => {
		it('should format plain ISO date for date_is_after', () => {
			expect(formatBaserowFilterValue('date_is_after', '2026-06-17')).toBe(
				'UTC?2026-06-17?exact_date',
			);
		});

		it('should use custom timezone for plain ISO date', () => {
			expect(formatBaserowFilterValue('date_is_before', '2026-06-17', 'Europe/Berlin')).toBe(
				'Europe/Berlin?2026-06-17?exact_date',
			);
		});

		it('should pass through already formatted 3-part values', () => {
			const value = 'UTC?2026-06-17?exact_date';
			expect(formatBaserowFilterValue('date_is_after', value)).toBe(value);
		});

		it('should fix malformed UTC??YYYY-MM-DD values', () => {
			expect(formatBaserowFilterValue('date_is_after', 'UTC??2026-06-17')).toBe(
				'UTC?2026-06-17?exact_date',
			);
		});

		it('should format relative date tokens', () => {
			expect(formatBaserowFilterValue('date_is_after', 'today')).toBe('UTC??today');
		});

		it('should format date_is_within with numeric days', () => {
			expect(formatBaserowFilterValue('date_is_within', '30')).toBe('UTC?30?nr_days_from_now');
		});

		it('should pass plain ISO for deprecated date_after_or_equal', () => {
			expect(formatBaserowFilterValue('date_after_or_equal', '2026-06-17')).toBe('2026-06-17');
		});

		it('should use timezone only for deprecated date_equals_today', () => {
			expect(formatBaserowFilterValue('date_equals_today', '')).toBe('UTC');
			expect(formatBaserowFilterValue('date_equals_today', 'Europe/Berlin')).toBe('Europe/Berlin');
		});

		it('should format deprecated date_within_days as timezone?number', () => {
			expect(formatBaserowFilterValue('date_within_days', '1', 'Asia/Calcutta')).toBe(
				'Asia/Calcutta?1',
			);
		});

		it('should pass number only for deprecated date_after_days_ago', () => {
			expect(formatBaserowFilterValue('date_after_days_ago', '20')).toBe('20');
		});

		// date_equals_day_of_month expects a raw day number (1-31), not a multi-step value
		it('should pass date_equals_day_of_month as a raw number', () => {
			expect(formatBaserowFilterValue('date_equals_day_of_month', '15')).toBe('15');
		});

		it('should leave non-date operators unchanged', () => {
			expect(formatBaserowFilterValue('equal', 'foo')).toBe('foo');
		});
	});

	describe('normalizeFilterFieldId', () => {
		it('should strip field_ prefix', () => {
			expect(normalizeFilterFieldId('field_3799030')).toBe('3799030');
		});

		it('should return numeric ids as string', () => {
			expect(normalizeFilterFieldId(3799030)).toBe('3799030');
		});
	});
});
