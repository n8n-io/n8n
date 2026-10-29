import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { runInNewContext } from 'node:vm';
import { parse } from 'yaml';

const workflowFile = (name) =>
	parse(readFileSync(new URL(`../workflows/${name}`, import.meta.url), 'utf8'));

const prContext = (action = 'synchronize', label = '') => ({
	event_name: 'pull_request',
	repository: 'n8n-io/n8n',
	ref: 'refs/pull/42/merge',
	run_id: 1001,
	event: {
		action,
		label: { name: label },
		pull_request: {
			number: 42,
			title: 'fix: Update an example',
			labels: [],
			head: { sha: 'head-1', repo: { full_name: 'n8n-io/n8n' } },
			user: { type: 'User', login: 'contributor' },
		},
		merge_group: {},
		issue: {},
		comment: {},
	},
});

// The fixtures use exact-case strings. Expand the label projection for JavaScript.
const evaluate = (expression, github, needs = {}) =>
	runInNewContext(
		expression.trim().replaceAll('.labels.*.name', '.labels.map(label => label.name)'),
		{
			github,
			needs,
			always: () => true,
			contains: (values, value) => values.includes(value),
			startsWith: (value, prefix) => value.startsWith(prefix),
		},
	);

const concurrencyGroup = (workflow, github) =>
	workflow.concurrency.group.replace(/\$\{\{([\s\S]*?)\}\}/g, (_, expression) =>
		evaluate(expression, github),
	);

describe('PR quality event routing', () => {
	const workflow = workflowFile('ci-pr-quality.yml');
	const checks = ['check-pr-size', 'check-static-analysis', 'check-knip', 'check-do-not-merge'];
	const summary = workflow.jobs['required-pr-quality-checks'];

	it('routes each quality check through the event gate', () => {
		for (const check of checks) {
			assert.ok([workflow.jobs[check].needs].flat().includes('changes'), check);
			assert.ok(summary.needs.includes(check), check);
		}
		assert.ok(summary.needs.includes('changes'));
	});

	for (const action of ['opened', 'edited', 'synchronize', 'labeled', 'unlabeled']) {
		it(`runs the full quality gate on ${action}${action.endsWith('labeled') ? ' Do Not Merge' : ''}`, () => {
			const github = prContext(action, 'Do Not Merge');
			assert.ok(workflow.on.pull_request.types.includes(action));
			assert.equal(evaluate(workflow.jobs.changes.if, github), true);
			for (const check of checks) {
				assert.equal(evaluate(workflow.jobs[check].if, github), true, check);
			}
			assert.equal(evaluate(summary.if, github, { changes: { result: 'success' } }), true);
		});
	}

	for (const action of ['labeled', 'unlabeled']) {
		for (const label of ['cla-signed', 'Auto-assign reviewers', 'Reviewers auto-assigned']) {
			it(`skips checks and the summary on ${action} ${label}`, () => {
				const github = prContext(action, label);
				assert.equal(evaluate(workflow.jobs.changes.if, github), false);
				assert.equal(evaluate(workflow.jobs['handle-size-override'].if, github), false);
				assert.equal(evaluate(summary.if, github, { changes: { result: 'skipped' } }), false);
			});
		}
	}

	it('runs the summary when change detection fails or is cancelled', () => {
		for (const result of ['failure', 'cancelled']) {
			assert.equal(evaluate(summary.if, prContext(), { changes: { result } }), true);
		}
	});

	it('keeps the merge queue gate', () => {
		const github = prContext();
		github.event_name = 'merge_group';
		github.event.pull_request = {};
		github.event.merge_group = { head_sha: 'queue-1' };
		assert.ok('merge_group' in workflow.on);
		assert.equal(evaluate(workflow.jobs.changes.if, github), true);
	});

	it('handles size overrides without starting quality checks', () => {
		const github = prContext('created');
		github.event_name = 'issue_comment';
		github.event.issue = { number: 42, pull_request: {} };
		github.event.comment.body = '/size-limit-override';
		assert.equal(evaluate(workflow.jobs.changes.if, github), false);
		assert.equal(evaluate(workflow.jobs['handle-size-override'].if, github), true);
		assert.equal(evaluate(summary.if, github, { changes: { result: 'skipped' } }), false);
	});
});

describe('PR quality concurrency', () => {
	const workflow = workflowFile('ci-pr-quality.yml');

	it('cancels older relevant runs for the same PR across commits and event types', () => {
		assert.equal(workflow.concurrency['cancel-in-progress'], true);
		const group = concurrencyGroup(workflow, prContext());
		for (const action of ['opened', 'edited', 'synchronize', 'labeled', 'unlabeled']) {
			const github = prContext(action, 'Do Not Merge');
			github.run_id = 1002;
			github.event.pull_request.head.sha = 'head-2';
			assert.equal(concurrencyGroup(workflow, github), group, action);
		}
	});

	it('does not let unrelated labels or comments cancel quality checks or each other', () => {
		const groups = [concurrencyGroup(workflow, prContext())];
		for (const action of ['labeled', 'unlabeled', 'created']) {
			for (let attempt = 0; attempt < 2; attempt++) {
				const github = prContext(action, 'cla-signed');
				github.event_name = action === 'created' ? 'issue_comment' : 'pull_request';
				github.run_id = 1000 + groups.length;
				groups.push(concurrencyGroup(workflow, github));
			}
		}
		assert.equal(new Set(groups).size, groups.length);
	});

	it('separates PRs and merge queue heads', () => {
		const github = prContext();
		const groups = [concurrencyGroup(workflow, github)];
		github.event.pull_request.number = 43;
		groups.push(concurrencyGroup(workflow, github));
		github.event_name = 'merge_group';
		github.event.pull_request = {};
		for (const headSha of ['queue-1', 'queue-2']) {
			github.event.merge_group.head_sha = headSha;
			groups.push(concurrencyGroup(workflow, github));
		}
		assert.equal(new Set(groups).size, groups.length);
	});
});

describe('reviewer assignment label routing', () => {
	const workflow = workflowFile('ci-owners-assign-reviewers.yml');
	const job = workflow.jobs['assign-reviewers'];

	it('skips unrelated labels before starting a runner', () => {
		for (const label of ['cla-signed', 'Reviewers auto-assigned', 'Do Not Merge']) {
			assert.equal(evaluate(job.if, prContext('labeled', label)), false, label);
		}
	});

	it('keeps assignment on opt-in labels, pushes, and reopened PRs', () => {
		for (const action of ['labeled', 'synchronize', 'reopened']) {
			assert.ok(workflow.on.pull_request.types.includes(action));
			assert.equal(evaluate(job.if, prContext(action, 'Auto-assign reviewers')), true, action);
		}
	});
});

describe('Codespace preview label routing', () => {
	const workflow = workflowFile('util-codespace-preview.yml');
	const job = workflow.jobs.preview;

	it('keeps unrelated labels out of the preview queue', () => {
		assert.equal(workflow.concurrency, undefined);
		assert.ok(job.concurrency);
		assert.equal(job.concurrency['cancel-in-progress'], false);
		const github = prContext('labeled', 'cla-signed');
		github.event.pull_request.labels = [{ name: 'codespace-preview' }];
		assert.equal(evaluate(job.if, github), false);
	});

	it('keeps preview creation, toggles, and cleanup', () => {
		for (const action of ['labeled', 'unlabeled']) {
			for (const label of ['codespace-preview', 'preview:debug']) {
				const github = prContext(action, label);
				github.event.pull_request.labels = [{ name: 'codespace-preview' }];
				assert.equal(evaluate(job.if, github), true, `${action} ${label}`);
			}
		}
	});
});
