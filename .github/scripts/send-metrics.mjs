#!/usr/bin/env node
/**
 * Shared metrics sender for CI scripts.
 * See .github/CI-TELEMETRY.md for payload shape and BigQuery schema.
 *
 * Usage:
 *   import { sendMetrics, metric } from './send-metrics.mjs';
 *   await sendMetrics([metric('build-duration', 45.2, 's', { package: '@n8n/cli' })]);
 *
 * Env: QA_METRICS_WEBHOOK_URL, QA_METRICS_WEBHOOK_USER, QA_METRICS_WEBHOOK_PASSWORD
 */

import * as os from 'node:os';

/** Build a single metric object. */
export function metric(name, value, unit, dimensions = {}) {
	return { metric_name: name, value, unit, dimensions };
}

/** Build git/ci/runner context from environment variables. */
export function buildContext(benchmarkName = null) {
	const ref = process.env.GITHUB_REF ?? '';
	const prMatch = ref.match(/refs\/pull\/(\d+)/);
	const runId = process.env.GITHUB_RUN_ID ?? null;

	return {
		timestamp: new Date().toISOString(),
		benchmark_name: benchmarkName,
		git: {
			sha: process.env.GITHUB_SHA?.slice(0, 8) ?? null,
			branch: process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? null,
			pr: prMatch ? parseInt(prMatch[1], 10) : null,
		},
		ci: {
			runId,
			runUrl:
				runId && process.env.GITHUB_REPOSITORY
					? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`
					: null,
			job: process.env.GITHUB_JOB ?? null,
			workflow: process.env.GITHUB_WORKFLOW ?? null,
			attempt: process.env.GITHUB_RUN_ATTEMPT
				? parseInt(process.env.GITHUB_RUN_ATTEMPT, 10)
				: null,
		},
		runner: {
			provider: !process.env.CI
				? 'local'
				: process.env.RUNNER_ENVIRONMENT === 'github-hosted'
					? 'github'
					: 'blacksmith',
			cpuCores: os.cpus().length,
			memoryGb: Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10,
		},
	};
}

export async function sendMetrics(metrics, benchmarkName = null) {
	const webhookUrl = process.env.QA_METRICS_WEBHOOK_URL;
	const webhookUser = process.env.QA_METRICS_WEBHOOK_USER;
	const webhookPassword = process.env.QA_METRICS_WEBHOOK_PASSWORD;

	if (!webhookUrl) {
		console.log('QA_METRICS_WEBHOOK_URL not set, skipping.');
		return;
	}

	if (!webhookUser || !webhookPassword) {
		console.log('QA_METRICS_WEBHOOK_USER/PASSWORD not set, skipping.');
		return;
	}

	const payload = { ...buildContext(benchmarkName), metrics };
	const basicAuth = Buffer.from(`${webhookUser}:${webhookPassword}`).toString('base64');

	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${basicAuth}`,
		},
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(30_000),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(
			`Webhook failed: ${response.status} ${response.statusText}${body ? `\n${body}` : ''}`,
		);
	}

	console.log(`Sent ${metrics.length} metric(s): ${response.status}`);
}
