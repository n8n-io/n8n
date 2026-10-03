import { EventService } from '@n8n/backend-services';
import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { RunProfile } from '@n8n/nodes-base-next';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS } from './constant';

type RunRequest = RunProfile['requests'][number];

/**
 * `1xx`…`5xx` when the status is known. `error` when the attempt failed with no status.
 * `ok` when the attempt did not fail but n8n gave only the body, so the status is not known.
 */
const statusClassOf = ({ status, errorType }: RunRequest) => {
	if (status !== undefined) return `${Math.floor(status / 100)}xx`;
	return errorType === undefined ? 'ok' : 'error';
};

/**
 * Observes contract node runs from the `node-contract-run-profiled` event: run duration,
 * HTTP attempts and sandbox start. Labels are bounded: the action id is bounded by the
 * installed actions, and no host, URL, workflow or node name is a label.
 */
@Service()
export class PrometheusNodeContractMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
	) {}

	get enabled(): boolean {
		return this.config.includeNodeContractMetrics;
	}

	init() {
		const prefix = this.config.prefix;

		const runDuration = new promClient.Histogram({
			name: `${prefix}node_contract_run_duration_seconds`,
			help: 'Duration in seconds of contract node runs, by action, path (in_process, sandbox) and result.',
			labelNames: ['action', 'path', 'result'] as const,
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const httpRequests = new promClient.Counter({
			name: `${prefix}node_contract_http_requests_total`,
			help: 'Total number of HTTP attempts of contract node runs, by action and status class. `unknown` counts the attempts past the profile limit.',
			labelNames: ['action', 'status_class'] as const,
		});

		const httpRequestDuration = new promClient.Histogram({
			name: `${prefix}node_contract_http_request_duration_seconds`,
			help: 'Duration in seconds of HTTP attempts of contract node runs, by action and status class.',
			labelNames: ['action', 'status_class'] as const,
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const sandboxStartDuration = new promClient.Histogram({
			name: `${prefix}node_contract_sandbox_start_duration_seconds`,
			help: 'Duration in seconds of sandbox starts of contract node runs, by whether the compiled guest was in the cache.',
			labelNames: ['compile_cached'] as const,
			buckets: DURATION_BUCKETS_SECONDS,
		});

		this.eventService.on('node-contract-run-profiled', ({ profile }) => {
			const { action } = profile;
			runDuration.observe(
				{
					action,
					path: profile.path ?? 'unknown',
					result: profile.errorType === undefined ? 'success' : 'error',
				},
				(profile.endMs - profile.startMs) / 1000,
			);

			for (const request of profile.requests) {
				const labels = { action, status_class: statusClassOf(request) };
				httpRequests.inc(labels);
				httpRequestDuration.observe(labels, (request.endMs - request.startMs) / 1000);
			}
			// The profile keeps the first attempts only; it counts the rest without their outcome.
			const unrecorded = profile.requestCount - profile.requests.length;
			if (unrecorded > 0) httpRequests.inc({ action, status_class: 'unknown' }, unrecorded);

			for (const phase of profile.phases) {
				if (phase.name !== 'sandboxStart') continue;
				sandboxStartDuration.observe(
					{ compile_cached: String(phase.compileCached) },
					(phase.endMs - phase.startMs) / 1000,
				);
			}
		});
	}
}
