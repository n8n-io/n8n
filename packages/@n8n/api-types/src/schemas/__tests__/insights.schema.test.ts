import {
	insightsByTimeSchema,
	insightsByWorkflowSchema,
	insightsDateRangeSchema,
	insightsAnalystChatRequestSchema,
	insightsAnalystChatResponseSchema,
	insightsAnalystOverviewSchema,
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

describe('insightsAnalyst schemas', () => {
	const summary = {
		total: { value: 10, deviation: 2, unit: 'count' },
		failed: { value: 1, deviation: 0, unit: 'count' },
		failureRate: { value: 0.1, deviation: 0.02, unit: 'ratio' },
		timeSaved: { value: 120, deviation: 30, unit: 'minute' },
		averageRunTime: { value: 300, deviation: null, unit: 'millisecond' },
	};

	const byWorkflow = {
		count: 1,
		data: [
			{
				workflowId: 'workflow-1',
				workflowName: 'Demo workflow',
				projectId: 'project-1',
				projectName: 'Demo project',
				total: 10,
				succeeded: 9,
				failed: 1,
				failureRate: 0.1,
				runTime: 3000,
				averageRunTime: 300,
				timeSaved: 120,
			},
		],
	};

	test('validates an analyst overview', () => {
		const result = insightsAnalystOverviewSchema.safeParse({
			project: { id: 'project-1', name: 'Demo project' },
			dateRange: {
				startDate: '2026-05-01T00:00:00.000Z',
				endDate: '2026-05-19T00:00:00.000Z',
			},
			summary,
			byTime: [
				{
					date: '2026-05-19T00:00:00.000Z',
					values: {
						total: 10,
						succeeded: 9,
						failed: 1,
						failureRate: 0.1,
						averageRunTime: 300,
						timeSaved: 120,
					},
				},
			],
			byWorkflow,
			highlights: [
				{
					id: 'highest-impact',
					title: 'Highest automation impact',
					workflowId: 'workflow-1',
					workflowName: 'Demo workflow',
					description: 'Saved the most time',
					trend: 'positive',
					value: 120,
					unit: 'minute',
				},
			],
			lowImpactWorkflows: [
				{
					workflowId: 'workflow-1',
					workflowName: 'Demo workflow',
					description: 'Review this workflow',
					timeSaved: 120,
					total: 10,
				},
			],
			suggestedPrompts: ['Which workflows saved us the most time?'],
		});

		expect(result.success).toBe(true);
	});

	test('validates chat request and response', () => {
		expect(insightsAnalystChatRequestSchema.safeParse({ question: 'What changed?' }).success).toBe(
			true,
		);
		expect(
			insightsAnalystChatResponseSchema.safeParse({
				answer: 'Demo workflow saved the most time.',
				mode: 'fallback',
				citations: [
					{
						workflowId: 'workflow-1',
						workflowName: 'Demo workflow',
						metric: 'time saved',
						value: 120,
						unit: 'minute',
					},
				],
			}).success,
		).toBe(true);
	});
});

describe('insightsByWorkflowSchema', () => {
	const validInsightsByWorkflow = {
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
	};

	test.each([
		{
			name: 'valid workflow insights',
			value: validInsightsByWorkflow,
			expected: true,
		},
		{
			name: 'workflow insights with nullable workflow id and project id',
			value: {
				...validInsightsByWorkflow,
				data: [
					{
						...validInsightsByWorkflow.data[0],
						workflowId: null,
						projectId: null,
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

describe('insightsDateRangeSchema', () => {
	test.each([
		{
			name: 'valid date range',
			value: {
				key: 'day',
				licensed: true,
				granularity: 'hour',
			},
			expected: true,
		},
		{
			name: 'missing required key',
			value: {
				licensed: true,
				granularity: 'hour',
			},
			expected: false,
		},
		{
			name: 'invalid key value',
			value: {
				key: 'invalid',
				licensed: true,
				granularity: 'hour',
			},
			expected: false,
		},
		{
			name: 'missing licensed field',
			value: {
				key: 'day',
				granularity: 'hour',
			},
			expected: false,
		},
		{
			name: 'invalid licensed type',
			value: {
				key: 'day',
				licensed: 'true', // Should be a boolean
				granularity: 'hour',
			},
			expected: false,
		},
		{
			name: 'invalid granularity value',
			value: {
				key: 'day',
				licensed: true,
				granularity: 'invalid',
			},
			expected: false,
		},
		{
			name: 'unexpected additional key',
			value: {
				key: 'day',
				licensed: true,
				granularity: 'hour',
				extraKey: 'value', // Extra key not allowed
			},
			expected: false,
		},
	])('should validate $name', ({ value, expected }) => {
		const result = insightsDateRangeSchema.safeParse(value);
		expect(result.success).toBe(expected);
	});
});
