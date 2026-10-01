#!/usr/bin/env node
/**
 * Sends merge queue outcomes and durations to the unified QA metrics webhook.
 *
 * GitHub records queue entry and removal times in the pull request timeline.
 * The dequeue webhook does not include the entry time, so this script reads the
 * timeline and pairs the current removal with its preceding queue entry.
 */

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { metric, sendMetrics } from './send-metrics.mjs';

const SUCCESS_REASONS = new Set(['MERGE', 'ALREADY_MERGED']);

export function classifyDequeue(reason) {
	if (SUCCESS_REASONS.has(reason)) return 'merged';
	if (reason === 'MANUAL') return 'manual';
	return 'rejected';
}

export function findQueueDuration(timeline, targetTime) {
	const queueEvents = timeline
		.filter(({ event }) => event === 'added_to_merge_queue' || event === 'removed_from_merge_queue')
		.map((event) => ({ ...event, timestamp: Date.parse(event.created_at) }))
		.filter(({ timestamp }) => Number.isFinite(timestamp))
		.sort((a, b) => a.timestamp - b.timestamp);

	const removals = queueEvents.filter(({ event }) => event === 'removed_from_merge_queue');
	if (removals.length === 0) return null;

	const targetTimestamp = Date.parse(targetTime);
	const removal = Number.isFinite(targetTimestamp)
		? removals.reduce((nearest, candidate) =>
				Math.abs(candidate.timestamp - targetTimestamp) <
				Math.abs(nearest.timestamp - targetTimestamp)
					? candidate
					: nearest,
			)
		: removals.at(-1);

	const entry = queueEvents
		.filter(
			({ event, timestamp }) => event === 'added_to_merge_queue' && timestamp <= removal.timestamp,
		)
		.at(-1);

	if (!entry) return null;
	return (removal.timestamp - entry.timestamp) / 1000;
}

function nextPage(linkHeader) {
	if (!linkHeader) return null;
	const next = linkHeader
		.split(',')
		.map((part) => part.trim().match(/^<([^>]+)>; rel="([^"]+)"$/))
		.find((match) => match?.[2] === 'next');
	return next?.[1] ?? null;
}

export async function fetchTimeline(repository, prNumber, token, fetchImpl = fetch) {
	let url = `https://api.github.com/repos/${repository}/issues/${prNumber}/timeline?per_page=100`;
	const timeline = [];

	while (url) {
		const response = await fetchImpl(url, {
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${token}`,
				'X-GitHub-Api-Version': '2022-11-28',
			},
		});
		if (!response.ok)
			throw new Error(`GitHub timeline request failed with status ${response.status}`);

		timeline.push(...(await response.json()));
		url = nextPage(response.headers.get('link'));
	}

	return timeline;
}

export async function buildMetrics(event, token, fetchImpl = fetch) {
	const action = event.action;
	if (action === 'enqueued') {
		return [metric('merge-queue-event', 1, 'count', { action })];
	}

	const reason = event.reason ?? 'UNKNOWN';
	const outcome = classifyDequeue(reason);
	const dimensions = { action: 'dequeued', outcome, reason };
	const metrics = [metric('merge-queue-event', 1, 'count', dimensions)];

	try {
		const timeline = await fetchTimeline(
			event.repository.full_name,
			event.pull_request.number,
			token,
			fetchImpl,
		);
		const duration = findQueueDuration(timeline, event.pull_request.updated_at);
		if (duration !== null) metrics.push(metric('merge-queue-duration', duration, 's', dimensions));
		else console.warn('[metrics] Could not find a matching merge queue entry in the PR timeline.');
	} catch (error) {
		console.warn(`[metrics] Could not calculate merge queue duration: ${error.message}`);
	}

	return metrics;
}

async function main() {
	const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
	const metrics = await buildMetrics(event, process.env.GITHUB_TOKEN);
	await sendMetrics(metrics, 'merge-queue');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => console.warn(`[metrics] send failed: ${error.message}`));
}
