import {
	insightsByTimeSchema,
	insightsByWorkflowSchema,
	insightsSummarySchema,
} from '../insights.schema';

describe('insightsSummarySchema', () => {
	test.each([
		{
			name: 'valid insights summary',
			value: {
				total: { value: 525, deviation: 85, unit: 'count' },
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'ratio' },
				timeSaved: { value: 54, deviation: -5, unit: 'minute' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'millisecond' },
			},
			expected: true,
		},
		{
			name: 'invalid failureRate unit',
			value: {
				total: { value: 525, deviation: 85, unit: 'count' },
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'time' }, // Wrong unit
				timeSaved: { value: 54, deviation: -5, unit: 'minute' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'millisecond' },
			},
			expected: false,
		},
		{
			name: 'missing total',
			value: {
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'ratio' },
				timeSaved: { value: 54, deviation: -5, unit: 'minute' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'millisecond' },
			},
			expected: false,
		},
		{
			name: 'wrong data type for value',
			value: {
				total: { value: '525', deviation: 85, unit: 'count' }, // Value should be a number
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'ratio' },
				timeSaved: { value: 54, deviation: -5, unit: 'minute' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'millisecond' },
			},
			expected: false,
		},
		{
			name: 'invalid key in object',
			value: {
				total: { value: 525, deviation: 85, unit: 'count' },
				failed: { value: 14, deviation: 3, unit: 'count' },
				failureRate: { value: 1.9, deviation: -5, unit: 'ratio' },
				timeSaved: { value: 54, deviation: -5, unit: 'minute' },
				averageRunTime: { value: 2.5, deviation: -5, unit: 'millisecond' },
				extraKey: { value: 100, deviation: 10, unit: 'count' }, // Invalid key
			},
			expected: false,
		},
	])('should validate $name', ({ value, expected }) => {
		const result = insightsSummarySchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});

describe('insightsByWorkflowSchema', () => {
	test.each([
		{
			name: 'valid workflow insights',
			value: {
				count: 2,
				data: [
					{
						workflowId: 'w1',
						workflowName: 'Test Workflow',
						projectId: 'p1',
						projectName: 'Test Project',
						total: 100,
						succeeded: 90,
						failed: 10,
						failureRate: 0.56,
						runTime: 300,
						averageRunTime: 30.5,
						timeSaved: 50,
					},
				],
			},
			expected: true,
		},
		{
			name: 'wrong data type',
			value: {
				count: 2,
				data: [
					{
						workflowId: 'w1',
						total: '100',
						succeeded: 90,
						failed: 10,
						failureRate: 10,
						runTime: 300,
						averageRunTime: 30,
						timeSaved: 50,
					},
				],
			},
			expected: false,
		},
		{
			name: 'missing required field',
			value: {
				count: 2,
				data: [
					{
						workflowId: 'w1',
						total: 100,
						succeeded: 90,
						failed: 10,
						failureRate: 10,
						runTime: 300,
						averageRunTime: 30,
					},
				],
			},
			expected: false,
		},
		{
			name: 'unexpected key',
			value: {
				count: 2,
				data: [
					{
						workflowId: 'w1',
						total: 100,
						succeeded: 90,
						failed: 10,
						failureRate: 10,
						runTime: 300,
						averageRunTime: 30,
						timeSaved: 50,
						extraKey: 'value',
					},
				],
			},
			expected: false,
		},
	])('should validate $name', ({ value, expected }) => {
		const result = insightsByWorkflowSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});

describe('insightsByTimeSchema', () => {
	test.each([
		{
			name: 'valid insights by time',
			value: {
				date: '2025-03-25T10:34:36.484Z',
				values: {
					total: 200,
					succeeded: 180,
					failed: 20,
					failureRate: 10,
					averageRunTime: 40,
					timeSaved: 100,
				},
			},
			expected: true,
		},
		{
			name: 'invalid date format',
			value: {
				date: '20240325', // Should be a string
				values: {
					total: 200,
					succeeded: 180,
					failed: 20,
					failureRate: 10,
					averageRunTime: 40,
					timeSaved: 100,
				},
			},
			expected: false,
		},
		{
			name: 'invalid field type',
			value: {
				date: 20240325, // Should be a string
				values: {
					total: 200,
					succeeded: 180,
					failed: 20,
					failureRate: 10,
					averageRunTime: 40,
					timeSaved: 100,
				},
			},
			expected: false,
		},
		{
			name: 'missing required key',
			value: {
				date: '2025-03-25T10:34:36.484Z',
				values: {
					total: 200,
					succeeded: 180,
					failed: 20,
					failureRate: 10,
					averageRunTime: 40,
				},
			},
			expected: false,
		},
		{
			name: 'unexpected key',
			value: {
				date: '2025-03-25T10:34:36.484Z',
				values: {
					total: 200,
					failureRate: 10,
					averageRunTime: 40,
					extraKey: 'value',
				},
			},
			expected: false,
		},
	])('should validate $name', ({ value, expected }) => {
		const result = insightsByTimeSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});
