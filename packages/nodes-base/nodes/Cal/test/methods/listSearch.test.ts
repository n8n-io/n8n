/* eslint-disable n8n-nodes-base/node-param-display-name-miscased -- `name` here is API payload data, not a node parameter */
import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { calApiRequestV2Versioned } from '../../GenericFunctions';
import { searchEventTypes, searchSchedules } from '../../methods/listSearch';

vi.mock('../../GenericFunctions', async (importActual) => ({
	...(await importActual()),
	calApiRequestV2Versioned: vi.fn(),
}));

const apiRequest = vi.mocked(calApiRequestV2Versioned);

describe('Cal.com list search', () => {
	const ctx = mockDeep<ILoadOptionsFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('searchEventTypes', () => {
		it('unwraps the envelope and sorts the entries by name', async () => {
			apiRequest.mockResolvedValue({
				data: [
					{ id: 2, title: 'Zebra call' },
					{ id: 1, title: 'Alpha call' },
				],
			});

			const result = await searchEventTypes.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith('GET', '/event-types', '2024-06-14');
			expect(result.results).toEqual([
				{ name: 'Alpha call', value: '1' },
				{ name: 'Zebra call', value: '2' },
			]);
		});

		it('matches the typed text without regard to case', async () => {
			apiRequest.mockResolvedValue({
				data: [
					{ id: 1, title: 'Intro call' },
					{ id: 2, title: 'Demo' },
				],
			});

			const result = await searchEventTypes.call(ctx, 'INTRO');

			expect(result.results).toEqual([{ name: 'Intro call', value: '1' }]);
		});

		it('answers with an empty list when the API sends no data', async () => {
			apiRequest.mockResolvedValue({ data: undefined });

			expect(await searchEventTypes.call(ctx)).toEqual({ results: [] });
		});
	});

	describe('searchSchedules', () => {
		it('pins the schedules API version', async () => {
			apiRequest.mockResolvedValue({ data: [{ id: 5, name: 'Working hours' }] });

			const result = await searchSchedules.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith('GET', '/schedules', '2024-06-11');
			expect(result.results).toEqual([{ name: 'Working hours', value: '5' }]);
		});
	});
});
