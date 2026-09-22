import {
	CreatedTestRunPublicDto,
	ListTestRunsQueryPublicDto,
	TestRunListPublicDto,
	TestRunSummaryPublicDto,
} from '../test-run-public.dto';

const testRun = {
	id: '9f8e7d6c5b4a3210',
	status: 'completed',
	runAt: '2026-01-01T00:00:00.000Z',
	completedAt: '2026-01-01T00:05:00.000Z',
	metrics: { accuracy: 0.9, passed: true },
	errorCode: null,
	errorDetails: null,
	finalResult: 'success',
	testCaseCount: 42,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:05:00.000Z',
};

describe('TestRunSummaryPublicDto', () => {
	test('accepts all the expected fields', () => {
		expect(TestRunSummaryPublicDto.safeParse(testRun).success).toBe(true);
	});

	test('accepts a run that has not started', () => {
		const result = TestRunSummaryPublicDto.safeParse({
			...testRun,
			status: 'new',
			runAt: null,
			completedAt: null,
			metrics: null,
			finalResult: null,
			testCaseCount: 0,
		});

		expect(result.success).toBe(true);
	});

	test('accepts a failed run with an error code and details', () => {
		const result = TestRunSummaryPublicDto.safeParse({
			...testRun,
			status: 'error',
			errorCode: 'TEST_CASES_NOT_FOUND',
			errorDetails: { node: 'Evaluation', nested: { deep: ['shape'] } },
			finalResult: 'error',
		});

		expect(result.success).toBe(true);
	});

	test.each([
		['a status outside the set', { status: 'paused' }],
		['a final result outside the set', { finalResult: 'unknown' }],
		['metrics that are not an object', { metrics: 'fast' }],
		['a Date for createdAt', { createdAt: new Date() }],
		['a non-integer testCaseCount', { testCaseCount: 1.5 }],
	])('rejects %s', (_label, override) => {
		expect(TestRunSummaryPublicDto.safeParse({ ...testRun, ...override }).success).toBe(false);
	});
});

describe('TestRunListPublicDto', () => {
	test('accepts a page with a next cursor', () => {
		expect(TestRunListPublicDto.safeParse({ data: [testRun], nextCursor: 'abc' }).success).toBe(
			true,
		);
	});

	test('accepts the last page', () => {
		expect(TestRunListPublicDto.safeParse({ data: [], nextCursor: null }).success).toBe(true);
	});
});

describe('ListTestRunsQueryPublicDto', () => {
	test('applies the default limit', () => {
		const result = ListTestRunsQueryPublicDto.safeParse({});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ limit: 100 });
	});

	test('caps the limit at 250', () => {
		const result = ListTestRunsQueryPublicDto.safeParse({ limit: '300' });

		expect(result.success).toBe(true);
		expect(result.data?.limit).toBe(250);
	});

	test('accepts a status filter and a cursor', () => {
		const result = ListTestRunsQueryPublicDto.safeParse({ status: 'running', cursor: 'abc' });

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ limit: 100, status: 'running', cursor: 'abc' });
	});

	test.each([
		['a status outside the set', { status: 'paused' }],
		['a non-numeric limit', { limit: 'ten' }],
		['a negative limit', { limit: '-1' }],
	])('rejects %s', (_label, query) => {
		expect(ListTestRunsQueryPublicDto.safeParse(query).success).toBe(false);
	});
});

describe('CreatedTestRunPublicDto', () => {
	test('accepts the created run', () => {
		const result = CreatedTestRunPublicDto.safeParse({
			id: testRun.id,
			status: 'new',
			createdAt: testRun.createdAt,
		});

		expect(result.success).toBe(true);
	});

	test('strips fields the route does not publish', () => {
		const result = CreatedTestRunPublicDto.safeParse({
			id: testRun.id,
			status: 'new',
			createdAt: testRun.createdAt,
			workflowId: 'abc',
		});

		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('workflowId');
	});
});
