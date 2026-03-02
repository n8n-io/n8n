#!/usr/bin/env node
/**
 * Sends Docker build stats to a webhook for BigQuery ingestion.
 *
 * Reads manifests produced by build-n8n.mjs and dockerize-n8n.mjs,
 * enriches with git/CI/runner context, and POSTs to a webhook.
 *
 * Usage: node send-docker-stats.mjs
 *
 * Environment variables:
 *   DOCKER_STATS_WEBHOOK_URL - Webhook URL (required to send)
 */

import { existsSync, readFileSync } from 'node:fs';
import * as os from 'node:os';

const buildManifestPath = 'compiled/build-manifest.json';
const dockerManifestPath = 'docker-build-manifest.json';

if (!existsSync(buildManifestPath) && !existsSync(dockerManifestPath)) {
	console.log('No build or docker manifests found, skipping.');
	process.exit(0);
}

const webhookUrl = process.env.DOCKER_STATS_WEBHOOK_URL;

if (!webhookUrl) {
	console.log('DOCKER_STATS_WEBHOOK_URL not set, skipping.');
	process.exit(0);
}

const buildManifest = existsSync(buildManifestPath)
	? JSON.parse(readFileSync(buildManifestPath, 'utf-8'))
	: null;

const dockerManifest = existsSync(dockerManifestPath)
	? JSON.parse(readFileSync(dockerManifestPath, 'utf-8'))
	: null;

// Extract PR number from GITHUB_REF (refs/pull/123/merge)
const ref = process.env.GITHUB_REF ?? '';
const prMatch = ref.match(/refs\/pull\/(\d+)/);

// Detect runner provider (matches packages/testing/containers/telemetry.ts)
function getRunnerProvider() {
	if (!process.env.CI) return 'local';
	if (process.env.RUNNER_ENVIRONMENT === 'github-hosted') return 'github';
	return 'blacksmith';
}

const payload = {
	build: buildManifest
		? {
				artifactSize: buildManifest.artifactSize,
				buildDuration: buildManifest.buildDuration,
			}
		: null,

	docker: dockerManifest
		? {
				platform: dockerManifest.platform,
				images: dockerManifest.images,
			}
		: null,

	git: {
		sha: process.env.GITHUB_SHA?.slice(0, 8) || null,
		branch: process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? null,
		pr: prMatch ? parseInt(prMatch[1], 10) : null,
	},

	ci: {
		runId: process.env.GITHUB_RUN_ID || null,
		runUrl: process.env.GITHUB_RUN_ID
			? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
			: null,
		job: process.env.GITHUB_JOB || null,
		workflow: process.env.GITHUB_WORKFLOW || null,
		attempt: process.env.GITHUB_RUN_ATTEMPT ? parseInt(process.env.GITHUB_RUN_ATTEMPT, 10) : null,
	},

	runner: {
		provider: getRunnerProvider(),
		cpuCores: os.cpus().length,
		memoryGb: Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10,
	},
};

const response = await fetch(webhookUrl, {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify(payload),
});

if (!response.ok) {
	console.error(`Webhook failed: ${response.status} ${response.statusText}`);
	const body = await response.text();
	if (body) console.error(`Response: ${body}`);
	process.exit(1);
}

console.log(`Docker build stats sent: ${response.status}`);
