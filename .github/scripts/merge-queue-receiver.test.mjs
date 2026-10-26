import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const receiver = JSON.parse(
	readFileSync(new URL('../merge-queue/receiver.workflow.json', import.meta.url), 'utf8'),
);
const validationCode = receiver.nodes.find((node) => node.name === 'Validate event').parameters
	.jsCode;
const runValidation = new Function('$input', validationCode);
const normalizeMergeQueueEvent = (event) =>
	runValidation({ first: () => ({ json: { body: event } }) })[0].json;

const base = {
	schema_version: 1,
	id: 'n8n-io/n8n:group:example',
	repository: 'n8n-io/n8n',
	observed_at: '2026-10-26T08:00:00.000Z',
};
const group = {
	head_sha: 'a'.repeat(40),
	head_ref: 'refs/heads/gh-readonly-queue/master/pr-42-base',
};

describe('merge queue receiver validation', () => {
	it('accepts each producer event shape and preserves the full evidence', () => {
		const events = [
			{ ...base, kind: 'merge_queue_group_created', merge_group: group, queue: [] },
			{
				...base,
				kind: 'merge_queue_run_failed',
				merge_group: group,
				run: { id: 123, attempt: 2 },
				failed_jobs: [],
				errors: [{ stage: 'list_jobs' }],
			},
			{
				...base,
				kind: 'merge_queue_pr_enqueued',
				pr: { number: 42, head_sha: 'b'.repeat(40) },
				queue: [],
			},
			{
				...base,
				kind: 'merge_queue_pr_dequeued',
				pr: { number: 42, head_sha: 'b'.repeat(40) },
				reason: 'MANUAL',
				queue: [],
			},
		];
		for (const event of events) {
			const result = normalizeMergeQueueEvent(event);
			assert.equal(result.valid, true);
			assert.equal(result.event_id, event.id);
			assert.deepEqual(JSON.parse(result.event_json), event);
		}
	});

	it('rejects invalid envelopes before storage', () => {
		for (const event of [
			null,
			[],
			'text',
			{ ...base, schema_version: 2 },
			{ ...base, repository: 'another/repository' },
			{ ...base, id: '' },
			{ ...base, observed_at: 'invalid' },
			{ ...base, kind: 'unknown' },
		]) {
			assert.equal(normalizeMergeQueueEvent(event).valid, false);
		}
	});

	it('keeps a failed run with no attributable tests and rejects incomplete identities', () => {
		const event = {
			...base,
			kind: 'merge_queue_run_failed',
			merge_group: group,
			run: { id: 123, attempt: 1 },
			failed_jobs: [],
		};
		assert.equal(normalizeMergeQueueEvent(event).valid, true);
		for (const invalid of [
			{ ...event, merge_group: { head_sha: 'short' } },
			{ ...event, run: { id: 123 } },
			{ ...event, run: { id: 0, attempt: 1 } },
			{ ...event, failed_jobs: null },
		])
			assert.equal(normalizeMergeQueueEvent(invalid).valid, false);
	});

	it('validates direct event inputs as well as webhook envelopes', () => {
		const event = { ...base, kind: 'merge_queue_group_created', merge_group: group, queue: [] };
		assert.equal(runValidation({ first: () => ({ json: event }) })[0].json.valid, true);
	});

	it('keeps the deployed query definitions with the reviewed SQL files', () => {
		for (const [name, file] of [
			['Store event in BigQuery', 'ingest.sql'],
			['Create event table and view', 'schema.sql'],
		]) {
			const node = receiver.nodes.find((candidate) => candidate.name === name);
			assert.equal(
				node.parameters.sqlQuery,
				readFileSync(new URL(`../merge-queue/${file}`, import.meta.url), 'utf8'),
			);
		}
	});
});
