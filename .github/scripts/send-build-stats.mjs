#!/usr/bin/env node
/**
 * Sends Turbo build stats to the unified QA metrics webhook.
 *
 * Reads the Turbo run summary from .turbo/runs/ and emits per-package
 * build-duration metrics with {package, cache, task} dimensions, plus
 * a run-level build-total-duration summary.
 *
 * Usage: node send-build-stats.mjs
 *
 * Environment variables:
 *   QA_METRICS_WEBHOOK_URL      - Webhook URL (required to send)
 *   QA_METRICS_WEBHOOK_USER     - Basic auth username
 *   QA_METRICS_WEBHOOK_PASSWORD - Basic auth password
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { sendMetrics, metric } from './send-metrics.mjs';

const runsDir = '.turbo/runs';
if (!existsSync(runsDir)) {
	console.log('No .turbo/runs directory found (turbo --summarize not used), skipping.');
	process.exit(0);
}

const files = readdirSync(runsDir)
	.filter((f) => f.endsWith('.json'))
	.sort();
if (files.length === 0) {
	console.error('No summary file found in .turbo/runs/');
	process.exit(1);
}

const summary = JSON.parse(readFileSync(join(runsDir, files.at(-1)), 'utf-8'));

const metrics = [];

for (const task of summary.tasks ?? []) {
	if (task.execution?.exitCode !== 0) continue;
	const durationMs = task.execution.durationMs ?? 0;
	const cacheHit = task.cache?.status === 'HIT';
	// taskId format: "package-name#task-name"
	const [pkg, taskName] = task.taskId?.split('#') ?? [task.package, task.task];

	metrics.push(
		metric('build-duration', durationMs / 1000, 's', {
			package: pkg ?? 'unknown',
			task: taskName ?? 'build',
			cache: cacheHit ? 'hit' : 'miss',
		}),
	);
}

const totalMs = summary.durationMs ?? 0;
const totalTasks = summary.tasks?.length ?? 0;
const cachedTasks = summary.tasks?.filter((t) => t.cache?.status === 'HIT').length ?? 0;

metrics.push(
	metric('build-total-duration', totalMs / 1000, 's', {
		total_tasks: totalTasks,
		cached_tasks: cachedTasks,
	}),
);

await sendMetrics(metrics, 'build-stats');
