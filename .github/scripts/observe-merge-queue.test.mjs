import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';

import {
	collectFailedRun,
	collectQueueEvent,
	parseFailedTests,
	sendEvent,
	snapshotQueue,
} from './observe-merge-queue.mjs';

const repository = { owner: 'acme', repo: 'app' };
const run = {
	id: 123,
	run_attempt: 2,
	head_sha: 'group-sha',
	head_branch: 'gh-readonly-queue/master/pr-42-base',
	name: 'CI',
	html_url: 'https://github.com/acme/app/actions/runs/123',
	conclusion: 'failure',
};

function archive(files) {
	return execFileSync(
		'python3',
		[
			'-c',
			`import io, json, sys, zipfile
out = io.BytesIO()
with zipfile.ZipFile(out, 'w') as archive:
    for path, content in json.load(sys.stdin).items():
        archive.writestr(path, content)
sys.stdout.buffer.write(out.getvalue())`,
		],
		{ input: JSON.stringify(files) },
	);
}

function parseArchive(files) {
	return JSON.parse(
		execFileSync('python3', [new URL('./merge-queue-junit.py', import.meta.url).pathname], {
			input: archive(files),
			encoding: 'utf8',
		}),
	);
}

describe('JUnit reports', () => {
	it('reads nested failures and errors, and ignores passed and skipped cases', () => {
		const parsed = parseArchive({
			'merge-queue-reports/source.json': JSON.stringify({ job_name: 'Backend Unit Tests' }),
			'packages/example/junit.xml': `<testsuites><testsuite>
				<testcase classname="src/example.test.ts" name="passes" />
				<testcase name="skips"><skipped /></testcase>
				<testcase classname="src/example.test.ts" name="fails &amp; reports">
					<failure message="expected true"><![CDATA[details]]></failure>
				</testcase>
				<testcase file="src/setup.test.ts" name="setup"><error>setup failed</error></testcase>
			</testsuite></testsuites>`,
		});
		assert.equal(parsed.job_name, 'Backend Unit Tests');
		assert.equal(parsed.reports, 1);
		assert.deepEqual(parsed.errors, []);
		assert.deepEqual(
			parsed.failures.map(({ file, name, message }) => ({ file, name, message })),
			[
				{ file: 'src/example.test.ts', name: 'fails & reports', message: 'expected true' },
				{ file: 'src/setup.test.ts', name: 'setup', message: 'setup failed' },
			],
		);
	});

	it('keeps valid reports when another report is incomplete', () => {
		const parsed = parseArchive({
			'packages/first/junit.xml': '<testsuites>',
			'packages/second/junit.xml': '<testsuite><testcase name="passes" /></testsuite>',
			'other.txt': 'ignored',
		});
		assert.equal(parsed.reports, 1);
		assert.equal(parsed.errors.length, 1);
		assert.equal(parsed.errors[0].report, 'packages/first/junit.xml');
	});
});

describe('Vitest log fallback', () => {
	it('reads timestamped and turbo-prefixed failures without counting duplicates', () => {
		const lines = [
			'2026-10-26T07:00:00.000Z n8n:test:unit: FAIL src/example.test.ts > suite > case',
			'2026-10-26T07:00:00.001Z n8n:test:unit: FAIL src/example.test.ts > suite > case',
			'\u001b[31m FAIL src/setup.spec.ts\u001b[0m',
			'2026-10-26T07:00:00.002Z \\u001b[41m\\u001b[1m FAIL \\u001b[22m src/suite.test.ts\\u001b[2m [ src/suite.test.ts ]\\u001b[22m',
			'Error: build failed',
			'Test Files 2 failed',
		];
		assert.deepEqual(parseFailedTests(lines.join('\n')), [
			{ file: 'src/example.test.ts', name: 'suite > case', source: 'log' },
			{ file: 'src/setup.spec.ts', name: null, source: 'log' },
			{ file: 'src/suite.test.ts', name: null, source: 'log' },
		]);
	});
});

function mockClient({
	artifacts = [],
	report,
	logs = 'FAIL src/example.test.ts > suite > case',
} = {}) {
	const jobsEndpoint = Symbol('jobs');
	const artifactsEndpoint = Symbol('artifacts');
	const calls = [];
	return {
		calls,
		rest: {
			actions: {
				listJobsForWorkflowRunAttempt: jobsEndpoint,
				listWorkflowRunArtifacts: artifactsEndpoint,
				downloadArtifact: async (args) => {
					calls.push(['artifact', args]);
					return { data: report };
				},
				downloadJobLogsForWorkflowRun: async (args) => {
					calls.push(['logs', args]);
					if (logs instanceof Error) throw logs;
					return { data: logs };
				},
			},
		},
		paginate: async (endpoint, args) => {
			calls.push(['paginate', args]);
			if (endpoint === artifactsEndpoint) return artifacts;
			assert.equal(endpoint, jobsEndpoint);
			return [
				{
					id: 1,
					name: 'Unit tests / Backend Unit Tests',
					conclusion: 'failure',
					steps: [{ name: 'Test', conclusion: 'failure' }],
				},
				{ id: 2, name: 'Required Checks', conclusion: 'failure' },
				{ id: 3, name: 'Lint', conclusion: 'success' },
			];
		},
	};
}

describe('failed workflow collection', () => {
	it('uses the source attempt and retains jobs with no attributable test', async () => {
		const client = mockClient({ logs: 'Build failed' });
		const event = await collectFailedRun(client, repository, run);
		assert.equal(event.id, 'acme/app:run:123:2');
		assert.equal(event.merge_group.head_sha, 'group-sha');
		assert.equal(event.merge_group.anchor_pr, 42);
		assert.equal(event.run.attempt, 2);
		assert.equal(client.calls[0][1].attempt_number, 2);
		assert.deepEqual(
			event.failed_jobs.map((job) => job.id),
			[1, 2],
		);
		assert.deepEqual(event.failed_jobs[0].steps, ['Test']);
		assert.deepEqual(event.failed_jobs[0].tests, []);
	});

	it('prefers matching structured reports and ignores artifacts from older attempts', async () => {
		const client = mockClient({
			artifacts: [
				{ id: 20, name: 'merge-queue-junit-1-backend-unit' },
				{ id: 21, name: 'merge-queue-junit-2-backend-unit' },
			],
			report: archive({
				'merge-queue-reports/source.json': JSON.stringify({ job_name: 'Backend Unit Tests' }),
				'packages/example/junit.xml':
					'<testsuite><testcase classname="src/example.test.ts" name="case"><failure>details</failure></testcase></testsuite>',
			}),
			logs: 'No test failures',
		});
		const event = await collectFailedRun(client, repository, run);
		assert.equal(event.reports.length, 1);
		assert.equal(event.failed_jobs[0].tests[0].source, 'junit');
		assert.equal(event.failed_jobs[0].tests[0].artifact_id, 21);
		assert.deepEqual(
			client.calls.filter(([type]) => type === 'logs').map(([, args]) => args.job_id),
			[2],
		);
	});

	it('falls back to logs when an artifact cannot be parsed', async () => {
		const client = mockClient({
			artifacts: [{ id: 21, name: 'merge-queue-junit-2-backend-unit' }],
			report: Buffer.from('incomplete archive'),
		});
		const event = await collectFailedRun(client, repository, run);
		assert.equal(event.errors[0].artifact_id, 21);
		assert.equal(event.failed_jobs[0].tests[0].source, 'log');
	});

	it('records unavailable logs without dropping the failure event', async () => {
		const event = await collectFailedRun(
			mockClient({ logs: new Error('Logs expired') }),
			repository,
			run,
		);
		assert.equal(event.failed_jobs.length, 2);
		assert.deepEqual(event.failed_jobs[0].tests, []);
		assert.equal(event.errors[0].job_id, 1);
	});

	it('keeps source run metadata when GitHub cannot list evidence', async () => {
		const client = mockClient();
		client.paginate = async () => {
			throw new Error('GitHub unavailable');
		};
		const event = await collectFailedRun(client, repository, run);
		assert.equal(event.run.id, run.id);
		assert.deepEqual(event.failed_jobs, []);
		assert.deepEqual(
			event.errors.map(({ stage }) => stage),
			['list_jobs', 'list_artifacts'],
		);
	});
});

const queueEntry = (number) => ({
	id: `entry-${number}`,
	position: number,
	enqueuedAt: '2026-10-26T07:00:00Z',
	headCommit: { oid: `group-${number}` },
	baseCommit: { oid: `base-${number}` },
	pullRequest: { number, headRefOid: `head-${number}` },
});

describe('queue events', () => {
	it('paginates queue snapshots and keeps PR and synthetic commit identities separate', async () => {
		const cursors = [];
		const client = {
			graphql: async (_, { cursor }) => {
				cursors.push(cursor);
				return {
					repository: {
						mergeQueue: {
							entries: {
								nodes: [queueEntry(cursor ? 2 : 1)],
								pageInfo: { hasNextPage: !cursor, endCursor: 'next' },
							},
						},
					},
				};
			},
		};
		const entries = await snapshotQueue(client, repository, 'master');
		assert.deepEqual(cursors, [null, 'next']);
		assert.equal(entries[0].pr_head_sha, 'head-1');
		assert.equal(entries[0].group_head_sha, 'group-1');
		assert.equal(entries[1].id, 'entry-2');
	});

	it('preserves group identity when snapshot collection fails', async () => {
		const event = await collectQueueEvent(
			{
				graphql: async () => {
					throw new Error('Queue changed');
				},
			},
			repository,
			{
				merge_group: {
					head_sha: 'group',
					base_sha: 'base',
					head_ref: 'queue-ref',
					base_ref: 'refs/heads/master',
				},
			},
			'123',
		);
		assert.equal(event.merge_group.head_sha, 'group');
		assert.equal(event.errors[0].error, 'Queue changed');
		assert.deepEqual(event.queue, []);
	});

	it('records manual removal reasons and does not infer a failed group from nearby PRs', async () => {
		const event = await collectQueueEvent(
			{ graphql: async () => ({ repository: { mergeQueue: null } }) },
			repository,
			{
				action: 'dequeued',
				reason: 'MANUAL',
				pull_request: {
					number: 42,
					head: { sha: 'head' },
					base: { ref: 'master' },
					html_url: 'pr-url',
				},
			},
			'456',
		);
		assert.equal(event.reason, 'MANUAL');
		assert.equal(event.pr.head_sha, 'head');
		assert.equal(event.kind, 'merge_queue_pr_dequeued');
		assert.equal(event.merge_group, undefined);
	});
});

describe('webhook delivery', () => {
	it('supports artifact-only collection when no destination is configured', async () => {
		await sendEvent({}, {}, () => assert.fail('No webhook should be called'));
	});

	it('sends the event with Basic authentication and reports delivery failures', async () => {
		const env = {
			MERGE_QUEUE_WEBHOOK_URL: 'https://example.test/events',
			QA_METRICS_WEBHOOK_USER: 'user',
			QA_METRICS_WEBHOOK_PASSWORD: 'password',
		};
		await assert.rejects(
			sendEvent({ id: 'event' }, env, async (url, options) => {
				assert.equal(url, env.MERGE_QUEUE_WEBHOOK_URL);
				assert.equal(
					options.headers.Authorization,
					`Basic ${Buffer.from('user:password').toString('base64')}`,
				);
				assert.deepEqual(JSON.parse(options.body), { id: 'event' });
				return { ok: false, status: 503 };
			}),
			/HTTP 503/,
		);
	});
});
