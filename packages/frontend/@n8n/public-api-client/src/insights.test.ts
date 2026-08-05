import type { InsightsDateFilterDto, InsightsSummary } from '@n8n/api-types';

import { fetchInsightsSummaryPublicApi } from './insights';
import { get } from './utils';

vi.mock('./utils', () => ({
	get: vi.fn(),
}));

const context = { baseUrl: 'https://n8n.example.com/api/v1' };

describe('fetchInsightsSummaryPublicApi', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('calls GET /insights/summary without a filter', async () => {
		const mockSummary: InsightsSummary = {
			total: { value: 100, deviation: null, unit: 'count' },
			failed: { value: 20, deviation: 5, unit: 'count' },
			failureRate: { value: 0.2, deviation: -0.05, unit: 'ratio' },
			timeSaved: { value: 120, deviation: 30, unit: 'minute' },
			averageRunTime: { value: 5000, deviation: 200, unit: 'millisecond' },
		};
		vi.mocked(get).mockResolvedValue(mockSummary);

		const result = await fetchInsightsSummaryPublicApi(context);

		expect(get).toHaveBeenCalledWith(context, '/insights/summary', undefined);
		expect(result).toEqual(mockSummary);
	});

	it('serializes Date filters to ISO strings', async () => {
		vi.mocked(get).mockResolvedValue({} as InsightsSummary);

		const filter: InsightsDateFilterDto = {
			startDate: new Date('2025-01-01T00:00:00.000Z'),
			endDate: new Date('2025-01-31T23:59:59.999Z'),
		};

		await fetchInsightsSummaryPublicApi(context, filter);

		expect(get).toHaveBeenCalledWith(context, '/insights/summary', {
			startDate: '2025-01-01T00:00:00.000Z',
			endDate: '2025-01-31T23:59:59.999Z',
		});
	});

	it('passes an empty filter through unchanged', async () => {
		vi.mocked(get).mockResolvedValue({} as InsightsSummary);

		await fetchInsightsSummaryPublicApi(context, {});

		expect(get).toHaveBeenCalledWith(context, '/insights/summary', {});
	});
});
