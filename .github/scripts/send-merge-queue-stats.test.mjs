import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMetrics, classifyDequeue, findQueueDuration } from './send-merge-queue-stats.mjs';

test('classifies dequeue reasons', () => {
	assert.equal(classifyDequeue('MERGE'), 'merged');
	assert.equal(classifyDequeue('ALREADY_MERGED'), 'merged');
	assert.equal(classifyDequeue('MANUAL'), 'manual');
	assert.equal(classifyDequeue('CI_FAILURE'), 'rejected');
});

test('finds the queue duration for the removal nearest to the webhook time', () => {
	const timeline = [
		{ event: 'added_to_merge_queue', created_at: '2026-08-13T11:58:15Z' },
		{ event: 'removed_from_merge_queue', created_at: '2026-08-13T12:08:17Z' },
		{ event: 'added_to_merge_queue', created_at: '2026-08-13T12:20:00Z' },
		{ event: 'removed_from_merge_queue', created_at: '2026-08-13T12:22:43Z' },
	];

	assert.equal(findQueueDuration(timeline, '2026-08-13T12:08:18Z'), 602);
	assert.equal(findQueueDuration(timeline, '2026-08-13T12:22:42Z'), 163);
});

test('builds an enqueue count without requesting the timeline', async () => {
	const fetchImpl = () => assert.fail('fetch must not run for enqueue events');
	const metrics = await buildMetrics({ action: 'enqueued' }, 'token', fetchImpl);

	assert.deepEqual(metrics, [
		{
			metric_name: 'merge-queue-event',
			value: 1,
			unit: 'count',
			dimensions: { action: 'enqueued' },
		},
	]);
});

test('builds dequeue count and duration metrics', async () => {
	const fetchImpl = async () => ({
		ok: true,
		json: async () => [
			{ event: 'added_to_merge_queue', created_at: '2026-08-13T12:20:00Z' },
			{ event: 'removed_from_merge_queue', created_at: '2026-08-13T12:22:43Z' },
		],
		headers: new Headers(),
	});
	const event = {
		action: 'dequeued',
		reason: 'CI_FAILURE',
		repository: { full_name: 'n8n-io/n8n' },
		pull_request: { number: 123, updated_at: '2026-08-13T12:22:43Z' },
	};

	const metrics = await buildMetrics(event, 'token', fetchImpl);

	assert.deepEqual(metrics, [
		{
			metric_name: 'merge-queue-event',
			value: 1,
			unit: 'count',
			dimensions: { action: 'dequeued', outcome: 'rejected', reason: 'CI_FAILURE' },
		},
		{
			metric_name: 'merge-queue-duration',
			value: 163,
			unit: 's',
			dimensions: { action: 'dequeued', outcome: 'rejected', reason: 'CI_FAILURE' },
		},
	]);
});
