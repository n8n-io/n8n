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
	if (buildManifest.artifactSize != null) {
		metrics.push(metric('artifact-size', buildManifest.artifactSize, 'bytes', { artifact: 'compiled' }));
	}
	if (buildManifest.buildDuration != null) {
		metrics.push(metric('build-duration', buildManifest.buildDuration / 1000, 's', { artifact: 'compiled' }));
	}
}

if (dockerManifest) {
	const platform = dockerManifest.platform ?? 'unknown';

	for (const image of dockerManifest.images ?? []) {
		if (image.sizeBytes != null) {
			metrics.push(
				metric('docker-image-size', image.sizeBytes, 'bytes', {
					image: image.name ?? 'unknown',
					platform,
				}),
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
