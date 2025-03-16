import { insightsSummarySchema } from '../insights.schema';

describe('insightsSummarySchema', () => {
	test.each([
		{
			name: 'valid insights summary',
			value: {
				total: { value: 525, deviation: 85, unit: 'count' },
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'ratio' },
				timeSaved: { value: 54, deviation: -5, unit: 'time' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'time' },
			},
			expected: true,
		},
		{
			name: 'invalid failureRate unit',
			value: {
				total: { value: 525, deviation: 85, unit: 'count' },
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'time' }, // Wrong unit
				timeSaved: { value: 54, deviation: -5, unit: 'time' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'time' },
			},
			expected: false,
		},
		{
			name: 'missing total',
			value: {
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'ratio' },
				timeSaved: { value: 54, deviation: -5, unit: 'time' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'time' },
			},
			expected: false,
		},
		{
			name: 'wrong data type for value',
			value: {
				total: { value: '525', deviation: 85, unit: 'count' }, // Value should be a number
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'ratio' },
				timeSaved: { value: 54, deviation: -5, unit: 'time' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'time' },
			},
			expected: false,
		},
		{
			name: 'invalid key in object',
			value: {
				total: { value: 525, deviation: 85, unit: 'count' },
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'ratio' },
				timeSaved: { value: 54, deviation: -5, unit: 'time' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'time' },
				extraKey: { value: 100, deviation: 10, unit: 'count' }, // Invalid key
			},
			expected: false,
		},
	])('should validate $name', ({ value, expected }) => {
		const result = insightsSummarySchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});
