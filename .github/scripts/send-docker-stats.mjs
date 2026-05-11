#!/usr/bin/env node
/**
 * Sends Docker build stats to the unified QA metrics webhook.
 *
 * Reads manifests produced by build-n8n.mjs and dockerize-n8n.mjs and emits
 * per-image docker-image-size metrics and build duration metrics with
 * {image, platform} dimensions.
 *
 * Usage: node send-docker-stats.mjs
 *
 * Environment variables:
 *   QA_METRICS_WEBHOOK_URL      - Webhook URL (required to send)
 *   QA_METRICS_WEBHOOK_USER     - Basic auth username
 *   QA_METRICS_WEBHOOK_PASSWORD - Basic auth password
 */

import { existsSync, readFileSync } from 'node:fs';

import { sendMetrics, metric } from './send-metrics.mjs';

/** Parse human-readable sizes (e.g. "1.5G", "500M", "12K") to MB. */
function parseSizeToMB(val) {
	if (typeof val === 'number') return val / (1024 * 1024);
	if (typeof val !== 'string') return null;
	const match = val.match(/^([\d.]+)\s*([KMGT]?)i?B?$/i);
	if (!match) return null;
	const num = parseFloat(match[1]);
	const suffix = match[2].toUpperCase();
	const toMB = { '': 1 / (1024 * 1024), 'K': 1 / 1024, 'M': 1, 'G': 1024, 'T': 1024 * 1024 };
	return Math.round(num * (toMB[suffix] ?? 1) * 100) / 100;
}

const buildManifestPath = 'compiled/build-manifest.json';
const dockerManifestPath = 'docker-build-manifest.json';

if (!existsSync(buildManifestPath) && !existsSync(dockerManifestPath)) {
	console.log('No build or docker manifests found, skipping.');
	process.exit(0);
}

const buildManifest = existsSync(buildManifestPath)
	? JSON.parse(readFileSync(buildManifestPath, 'utf-8'))
	: null;

const dockerManifest = existsSync(dockerManifestPath)
	? JSON.parse(readFileSync(dockerManifestPath, 'utf-8'))
	: null;

const metrics = [];

if (buildManifest) {
	const sizeMB = parseSizeToMB(buildManifest.artifactSize);
	if (sizeMB != null) {
		metrics.push(metric('artifact-size', sizeMB, 'MB', { artifact: 'compiled' }));
	}
	const duration = buildManifest.buildDuration;
	if (duration?.total != null) {
		metrics.push(metric('build-duration', duration.total / 1000, 's', { artifact: 'compiled' }));
	}
}

if (dockerManifest) {
	const platform = dockerManifest.platform ?? 'unknown';

	for (const image of dockerManifest.images ?? []) {
		const imageSizeMB = parseSizeToMB(image.size ?? image.sizeBytes);
		const imageName = image.imageName ?? image.name ?? 'unknown';
		const shortName = imageName.replace(/^n8nio\//, '').replace(/:.*$/, '');
		if (imageSizeMB != null) {
			metrics.push(
				metric(`docker-image-size-${shortName}`, imageSizeMB, 'MB', { platform }),
			);
		}
	}

	if (dockerManifest.buildDurationMs != null) {
		metrics.push(
			metric('docker-build-duration', dockerManifest.buildDurationMs / 1000, 's', { platform }),
		);
	}
}

if (metrics.length === 0) {
	console.log('No metrics to send.');
	process.exit(0);
}

await sendMetrics(metrics, 'docker-stats');
