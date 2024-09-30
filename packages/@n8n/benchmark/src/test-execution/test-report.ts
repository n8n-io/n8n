import { nanoid } from 'nanoid';

import type { Scenario } from '@/types/scenario';

export type K6Tag = {
	name: string;
	value: string;
};

export type Check = {
	name: string;
	passes: number;
	fails: number;
};

export type CounterMetric = {
	type: 'counter';
	count: number;
	rate: number;
};

export type TrendMetric = {
	type: 'trend';
	'p(95)': number;
	avg: number;
	min: number;
	med: number;
	max: number;
	'p(90)': number;
};

export type TestReport = {
	runId: string;
	ts: string; // ISO8601
	scenarioName: string;
	tags: K6Tag[];
	metrics: {
		iterations: CounterMetric;
		dataReceived: CounterMetric;
		dataSent: CounterMetric;
		httpRequests: CounterMetric;
		httpRequestDuration: TrendMetric;
		httpRequestSending: TrendMetric;
		httpRequestReceiving: TrendMetric;
		httpRequestWaiting: TrendMetric;
	};
	checks: Check[];
};

function k6CheckToCheck(check: K6Check): Check {
	return {
		name: check.name,
		passes: check.passes,
		fails: check.fails,
	};
}

function k6CounterToCounter(counter: K6CounterMetric): CounterMetric {
	return {
		type: 'counter',
		count: counter.values.count,
		rate: counter.values.rate,
	};
}

function k6TrendToTrend(trend: K6TrendMetric): TrendMetric {
	return {
		type: 'trend',
		'p(90)': trend.values['p(90)'],
		avg: trend.values.avg,
		min: trend.values.min,
		med: trend.values.med,
		max: trend.values.max,
		'p(95)': trend.values['p(95)'],
	};
}

/**
 * Converts the k6 test summary to a test report
 */
export function buildTestReport(
	scenario: Scenario,
	endOfTestSummary: K6EndOfTestSummary,
	tags: K6Tag[],
): TestReport {
	return {
		runId: nanoid(),
		ts: new Date().toISOString(),
		scenarioName: scenario.name,
		tags,
		checks: endOfTestSummary.root_group.checks.map(k6CheckToCheck),
		metrics: {
			dataReceived: k6CounterToCounter(endOfTestSummary.metrics.data_received),
			dataSent: k6CounterToCounter(endOfTestSummary.metrics.data_sent),
			httpRequests: k6CounterToCounter(endOfTestSummary.metrics.http_reqs),
			httpRequestDuration: k6TrendToTrend(endOfTestSummary.metrics.http_req_duration),
			httpRequestSending: k6TrendToTrend(endOfTestSummary.metrics.http_req_sending),
			httpRequestReceiving: k6TrendToTrend(endOfTestSummary.metrics.http_req_receiving),
			httpRequestWaiting: k6TrendToTrend(endOfTestSummary.metrics.http_req_waiting),
			iterations: k6CounterToCounter(endOfTestSummary.metrics.iterations),
		},
	};
}
