import { EventService } from '@n8n/backend-services';
import type { PrometheusMetricsConfig } from '@n8n/config';
import type { RunProfile } from '@n8n/nodes-base-next';
import promClient from 'prom-client';
import { mock } from 'vitest-mock-extended';

import { PrometheusNodeContractMetricsService } from '../node-contract-metrics.service';

describe('PrometheusNodeContractMetricsService', () => {
	const config = mock<PrometheusMetricsConfig>({
		prefix: 'n8n_',
		includeNodeContractMetrics: true,
	});
	const action = 'notion.databasePage.getAll';
	const request = {
		itemIndex: 0,
		method: 'POST',
		scheme: 'https',
		host: 'api.notion.com',
		port: 443,
		resendCount: 0,
	};
	const profile: RunProfile = {
		action,
		version: '2.0.0',
		bundleHash: 'bundle-hash',
		nodeContract: '2.5.0',
		path: 'sandbox',
		startMs: 1_000,
		endMs: 1_500,
		errorType: 'NodeApiError',
		phases: [
			{ name: 'load', startMs: 1_000, endMs: 1_001, cached: true },
			{ name: 'sandboxStart', startMs: 1_001, endMs: 1_251, compileCached: false },
		],
		requests: [
			{ ...request, startMs: 1_300, endMs: 1_340, status: 200 },
			{ ...request, startMs: 1_340, endMs: 1_360 },
			{ ...request, startMs: 1_360, endMs: 1_460, status: 503, errorType: '503' },
			{ ...request, startMs: 1_460, endMs: 1_470, resendCount: 1, errorType: 'ECONNRESET' },
		],
		requestCount: 6,
		rpcs: [],
		rpcCount: 0,
		retryCount: 1,
		pageCount: 0,
		inputItems: 1,
		outputItems: 0,
		inputMs: 0,
		outputValidateMs: 0,
		driftIssues: 0,
	};

	const setup = () => {
		const eventService = new EventService();
		const service = new PrometheusNodeContractMetricsService(config, eventService);
		service.init();
		return eventService;
	};

	/** The values of a series: a counter name, or a histogram name with `_count` or `_sum`. */
	const series = async (name: string) => {
		const metricName = name.replace(/_(count|sum)$/, '');
		const metric = await promClient.register.getSingleMetric(metricName)?.get();
		return metric?.values
			.filter((value) => ('metricName' in value ? value.metricName : metricName) === name)
			.map(({ labels, value }) => ({ labels, value }));
	};

	beforeEach(() => {
		promClient.register.clear();
	});

	it('is enabled only when the config includes node contract metrics', () => {
		const disabledConfig = mock<PrometheusMetricsConfig>({ includeNodeContractMetrics: false });

		expect(new PrometheusNodeContractMetricsService(config, new EventService()).enabled).toBe(true);
		expect(
			new PrometheusNodeContractMetricsService(disabledConfig, new EventService()).enabled,
		).toBe(false);
	});

	it('records the run, its HTTP attempts and the sandbox start of one profiled run', async () => {
		setup().emit('node-contract-run-profiled', {
			executionId: 'exec-1',
			nodeName: 'Notion',
			profile,
		});

		expect(await series('n8n_node_contract_run_duration_seconds_count')).toEqual([
			{ labels: { action, path: 'sandbox', result: 'error' }, value: 1 },
		]);
		expect(await series('n8n_node_contract_run_duration_seconds_sum')).toEqual([
			{ labels: { action, path: 'sandbox', result: 'error' }, value: 0.5 },
		]);
		expect(await series('n8n_node_contract_http_requests_total')).toEqual([
			{ labels: { action, status_class: '2xx' }, value: 1 },
			{ labels: { action, status_class: 'ok' }, value: 1 },
			{ labels: { action, status_class: '5xx' }, value: 1 },
			{ labels: { action, status_class: 'error' }, value: 1 },
			{ labels: { action, status_class: 'unknown' }, value: 2 },
		]);
		expect(await series('n8n_node_contract_http_request_duration_seconds_sum')).toEqual([
			{ labels: { action, status_class: '2xx' }, value: 0.04 },
			{ labels: { action, status_class: 'ok' }, value: 0.02 },
			{ labels: { action, status_class: '5xx' }, value: 0.1 },
			{ labels: { action, status_class: 'error' }, value: 0.01 },
		]);
		expect(await series('n8n_node_contract_sandbox_start_duration_seconds_sum')).toEqual([
			{ labels: { compile_cached: 'false' }, value: 0.25 },
		]);
	});

	it('records a successful in-process run without HTTP attempts or sandbox start', async () => {
		setup().emit('node-contract-run-profiled', {
			executionId: 'exec-2',
			nodeName: 'Notion',
			profile: {
				...profile,
				path: 'in_process',
				errorType: undefined,
				phases: [profile.phases[0]],
				requests: [],
				requestCount: 0,
			},
		});

		expect(await series('n8n_node_contract_run_duration_seconds_count')).toEqual([
			{ labels: { action, path: 'in_process', result: 'success' }, value: 1 },
		]);
		expect(await series('n8n_node_contract_http_requests_total')).toEqual([]);
		expect(await series('n8n_node_contract_sandbox_start_duration_seconds_count')).toEqual([]);
	});
});
