import type { InsightsSummary } from '@n8n/api-types';
import {
	transformInsightsTimeSaved,
	transformInsightsAverageRunTime,
	transformInsightsFailureRate,
	transformInsightsValues,
	transformInsightsDeviation,
	transformInsightsSummary,
} from './insights.utils';

import {
	INSIGHTS_UNIT_MAPPING,
	INSIGHTS_DEVIATION_UNIT_MAPPING,
	INSIGHTS_SUMMARY_ORDER,
} from '@/features/insights/insights.constants';

describe('Insights Transformers', () => {
	describe('transformInsightsTimeSaved', () => {
		it('should return minutes if absolute value is less than 60', () => {
			expect(transformInsightsTimeSaved(30)).toBe(30);
			expect(transformInsightsTimeSaved(59)).toBe(59);
			expect(transformInsightsTimeSaved(-30)).toBe(-30);
			expect(transformInsightsTimeSaved(-59)).toBe(-59);
		});

		it('should return hours if absolute value is 60 or more, rounding to nearest hour', () => {
			expect(transformInsightsTimeSaved(60)).toBe(1);
			expect(transformInsightsTimeSaved(120)).toBe(2);
			expect(transformInsightsTimeSaved(89)).toBe(1);
			expect(transformInsightsTimeSaved(90)).toBe(2);
			expect(transformInsightsTimeSaved(-60)).toBe(-1);
			expect(transformInsightsTimeSaved(-120)).toBe(-2);
			expect(transformInsightsTimeSaved(-89)).toBe(-1);
			expect(transformInsightsTimeSaved(-90)).toBe(-1);
		});

		it('should return 0 for 0 minutes', () => {
			expect(transformInsightsTimeSaved(0)).toBe(0);
		});
	});

	describe('transformInsightsAverageRunTime', () => {
		it('should convert milliseconds to seconds', () => {
			expect(transformInsightsAverageRunTime(1000)).toBe(1);
			expect(transformInsightsAverageRunTime(500)).toBe(0.5);
			expect(transformInsightsAverageRunTime(1234)).toBe(1.234);
			expect(transformInsightsAverageRunTime(0)).toBe(0);
		});
	});

	describe('transformInsightsFailureRate', () => {
		it('should convert decimal to percentage', () => {
			expect(transformInsightsFailureRate(0.5)).toBe(50);
			expect(transformInsightsFailureRate(1)).toBe(100);
			expect(transformInsightsFailureRate(0.253)).toBe(25.3);
			expect(transformInsightsFailureRate(0)).toBe(0);
		});
	});

	describe('transformInsightsValues', () => {
		it('should correctly transform values based on type', () => {
			expect(transformInsightsValues.total(100)).toBe(100);
			expect(transformInsightsValues.failed(10)).toBe(10);
			expect(transformInsightsValues.timeSaved(120)).toBe(2);
			expect(transformInsightsValues.timeSaved(30)).toBe(30);
			expect(transformInsightsValues.averageRunTime(2000)).toBe(2);
			expect(transformInsightsValues.failureRate(0.1)).toBe(10);
		});
	});

	describe('transformInsightsDeviation', () => {
		describe('for total and failed types', () => {
			it('should calculate percentage deviation', () => {
				expect(transformInsightsDeviation.total(110, 10)).toBe(10);
				expect(transformInsightsDeviation.failed(55, 5)).toBe(10);
			});

			it('should return 0 if value and deviation are 0', () => {
				expect(transformInsightsDeviation.total(0, 0)).toBe(0);
				expect(transformInsightsDeviation.failed(0, 0)).toBe(0);
			});

			it('should return Infinity if value equals deviation (and thus previous value is 0)', () => {
				expect(transformInsightsDeviation.total(10, 10)).toBe(null);
				expect(transformInsightsDeviation.failed(5, 5)).toBe(null);
			});

			it('should return 0 if deviation is 0 and value is not 0', () => {
				expect(transformInsightsDeviation.total(100, 0)).toBe(0);
				expect(transformInsightsDeviation.failed(50, 0)).toBe(0);
			});
		});

		it('for timeSaved type, should transform deviation using transformInsightsTimeSaved', () => {
			expect(transformInsightsDeviation.timeSaved(1000, 120)).toBe(2);
			expect(transformInsightsDeviation.timeSaved(1000, 30)).toBe(30);
		});

		it('for averageRunTime type, should transform deviation using transformInsightsAverageRunTime', () => {
			expect(transformInsightsDeviation.averageRunTime(5000, 1000)).toBe(1);
		});

		it('for failureRate type, should transform deviation using transformInsightsFailureRate', () => {
			expect(transformInsightsDeviation.failureRate(0.5, 0.1)).toBe(10);
		});
	});

	describe('transformInsightsSummary', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			INSIGHTS_SUMMARY_ORDER.forEach((key) => {
				vi.spyOn(INSIGHTS_UNIT_MAPPING, key);
				vi.spyOn(INSIGHTS_DEVIATION_UNIT_MAPPING, key);
			});
		});

		it('should return an empty array if data is null', () => {
			expect(transformInsightsSummary(null)).toEqual([]);
		});

		it('should correctly transform InsightsSummary data and respect INSIGHTS_SUMMARY_ORDER', () => {
			const summaryData: InsightsSummary = {
				timeSaved: { value: 1200, deviation: 120, unit: 'minute' },
				total: { value: 110, deviation: 10, unit: 'count' },
				failureRate: { value: 0.05, deviation: 0.01, unit: 'ratio' },
				averageRunTime: { value: 5000, deviation: 1000, unit: 'millisecond' },
				failed: { value: 5, deviation: 1, unit: 'count' },
			};

			const expectedOutput = [
				{
					id: 'total',
					value: 110,
					deviation: 10,
					deviationUnit: '%',
					unit: '',
				},
				{
					id: 'failed',
					value: 5,
					deviation: 25,
					deviationUnit: '%',
					unit: '',
				},
				{
					id: 'failureRate',
					value: 5,
					deviation: 1,
					deviationUnit: 'pp',
					unit: '%',
				},
				{
					id: 'timeSaved',
					value: 20,
					deviation: 2,
					deviationUnit: 'h',
					unit: 'h',
				},
				{
					id: 'averageRunTime',
					value: 5,
					deviation: 1,
					deviationUnit: 's',
					unit: 's',
				},
			];

			const result = transformInsightsSummary(summaryData);
			expect(result).toEqual(expectedOutput);
			expect(result.map((item) => item.id)).toEqual([
				'total',
				'failed',
				'failureRate',
				'timeSaved',
				'averageRunTime',
			]);

			expect(INSIGHTS_UNIT_MAPPING.total).toHaveBeenCalledWith(110);
			expect(INSIGHTS_DEVIATION_UNIT_MAPPING.total).toHaveBeenCalledWith(10);
			expect(INSIGHTS_UNIT_MAPPING.failed).toHaveBeenCalledWith(5);
			expect(INSIGHTS_DEVIATION_UNIT_MAPPING.failed).toHaveBeenCalledWith(1);
			expect(INSIGHTS_UNIT_MAPPING.timeSaved).toHaveBeenCalledWith(1200);
			expect(INSIGHTS_DEVIATION_UNIT_MAPPING.timeSaved).toHaveBeenCalledWith(120);
			expect(INSIGHTS_UNIT_MAPPING.averageRunTime).toHaveBeenCalledWith(5000);
			expect(INSIGHTS_DEVIATION_UNIT_MAPPING.averageRunTime).toHaveBeenCalledWith(1000);
			expect(INSIGHTS_UNIT_MAPPING.failureRate).toHaveBeenCalledWith(0.05);
			expect(INSIGHTS_DEVIATION_UNIT_MAPPING.failureRate).toHaveBeenCalledWith(0.01);
		});

		it('should handle null deviation correctly', () => {
			const summaryData: InsightsSummary = {
				total: { value: 100, deviation: null, unit: 'count' },
				failed: { value: 5, deviation: 1, unit: 'count' },
				timeSaved: { value: 30, deviation: null, unit: 'minute' },
				averageRunTime: { value: 2000, deviation: 500, unit: 'millisecond' },
				failureRate: { value: 0.1, deviation: null, unit: 'ratio' },
			};

			const expectedOutput = [
				{
					id: 'total',
					value: 100,
					deviation: null,
					deviationUnit: '',
					unit: '',
				},
				{
					id: 'failed',
					value: 5,
					deviation: 25,
					deviationUnit: '%',
					unit: '',
				},
				{
					id: 'failureRate',
					value: 10,
					deviation: null,
					deviationUnit: '',
					unit: '%',
				},
				{
					id: 'timeSaved',
					value: 30,
					deviation: null,
					deviationUnit: '',
					unit: 'm',
				},
				{
					id: 'averageRunTime',
					value: 2,
					deviation: 0.5,
					deviationUnit: 's',
					unit: 's',
				},
			];
			expect(transformInsightsSummary(summaryData)).toEqual(expectedOutput);

			expect(INSIGHTS_UNIT_MAPPING.total).toHaveBeenCalledWith(100);
			expect(INSIGHTS_DEVIATION_UNIT_MAPPING.total).not.toHaveBeenCalled(); // deviation is null

			expect(INSIGHTS_UNIT_MAPPING.timeSaved).toHaveBeenCalledWith(30);
			expect(INSIGHTS_DEVIATION_UNIT_MAPPING.timeSaved).not.toHaveBeenCalled(); // deviation is null
		});
	});
});
