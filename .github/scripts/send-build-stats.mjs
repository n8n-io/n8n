#!/usr/bin/env node
/**
 * Sends Turbo build summary JSON to a webhook
 *
 * Usage: node send-build-stats.mjs
 *
 * Auto-detects summary from .turbo/runs/ directory.
 *
 * Environment variables:
 *   BUILD_STATS_WEBHOOK_URL - Webhook URL (required to send)
 *   BUILD_STATS_WEBHOOK_USER - Basic auth username (required if URL set)
 *   BUILD_STATS_WEBHOOK_PASSWORD - Basic auth password (required if URL set)
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';

const runsDir = '.turbo/runs';
if (!existsSync(runsDir)) {
	console.log('No .turbo/runs directory found (turbo --summarize not used), skipping.');
	process.exit(0);
}
const files = readdirSync(runsDir).filter((f) => f.endsWith('.json'));
const summaryPath = files.length > 0 ? join(runsDir, files[0]) : null;

const webhookUrl = process.env.BUILD_STATS_WEBHOOK_URL;
const webhookUser = process.env.BUILD_STATS_WEBHOOK_USER;
const webhookPassword = process.env.BUILD_STATS_WEBHOOK_PASSWORD;

if (!summaryPath) {
	console.error('No summary file found in .turbo/runs/');
	process.exit(1);
}

if (!webhookUrl) {
	console.log('BUILD_STATS_WEBHOOK_URL not set, skipping.');
	process.exit(0);
}

if (!webhookUser || !webhookPassword) {
	console.error('BUILD_STATS_WEBHOOK_USER and BUILD_STATS_WEBHOOK_PASSWORD are required');
	process.exit(1);
}

const basicAuth = Buffer.from(`${webhookUser}:${webhookPassword}`).toString('base64');

const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));

// Extract PR number from GITHUB_REF (refs/pull/123/merge)
const ref = process.env.GITHUB_REF ?? '';
const prMatch = ref.match(/refs\/pull\/(\d+)/);

// Detect runner provider (matches packages/testing/containers/telemetry.ts)
function getRunnerProvider() {
	if (!process.env.CI) return 'local';
	if (process.env.RUNNER_ENVIRONMENT === 'github-hosted') return 'github';
	return 'blacksmith';
}

// Add git context (aligned with container telemetry)
summary.git = {
	sha: process.env.GITHUB_SHA?.slice(0, 8) || null,
	branch: process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? null,
	pr: prMatch ? parseInt(prMatch[1], 10) : null,
};

// Add CI context
summary.ci = {
	runId: process.env.GITHUB_RUN_ID || null,
	runUrl: process.env.GITHUB_RUN_ID
		? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
		: null,
	job: process.env.GITHUB_JOB || null,
	workflow: process.env.GITHUB_WORKFLOW || null,
	attempt: process.env.GITHUB_RUN_ATTEMPT ? parseInt(process.env.GITHUB_RUN_ATTEMPT, 10) : null,
};

// Add runner info
summary.runner = {
	provider: getRunnerProvider(),
	cpuCores: os.cpus().length,
	memoryGb: Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10,
};

const headers = {
	'Content-Type': 'application/json',
	'Authorization': `Basic ${basicAuth}`,
};

const response = await fetch(webhookUrl, {
	method: 'POST',
	headers,
	body: JSON.stringify(summary),
});

if (!response.ok) {
	console.error(`Webhook failed: ${response.status} ${response.statusText}`);
	const body = await response.text();
	if (body) console.error(`Response: ${body}`);
	process.exit(1);
}

console.log(`Build stats sent: ${response.status}`);
