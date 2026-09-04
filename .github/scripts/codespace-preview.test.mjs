import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	BOT_MARKER,
	downComment,
	expiredComment,
	failureComment,
	hasPreviewBox,
	operationFor,
	parsePreviewJson,
	portFromUrl,
	readyComment,
} from './codespace-preview.mjs';

const PREVIEW = {
	pr: 1234,
	sha: 'abcdef1234567890abcdef1234567890abcdef12',
	codespace: 'psychic-umbrella-q7w6gwx',
	url: 'https://psychic-umbrella-q7w6gwx-5678.app.github.dev',
	orgVisible: true,
};

describe('operationFor', () => {
	it('maps each handled pull_request action', () => {
		assert.equal(operationFor('labeled'), 'up');
		assert.equal(operationFor('synchronize'), 'refresh');
		assert.equal(operationFor('unlabeled'), 'down');
		assert.equal(operationFor('closed'), 'down');
	});

	it('returns undefined for an action the workflow does not handle', () => {
		assert.equal(operationFor('opened'), undefined);
		assert.equal(operationFor('reopened'), undefined);
		assert.equal(operationFor(''), undefined);
	});
});

describe('parsePreviewJson', () => {
	it('finds the JSON line among progress and in-box build output', () => {
		const stdout = [
			'Creating a preview box for PR #1234 (my-branch)…',
			'Waiting for psychic-umbrella-q7w6gwx to accept ssh…',
			'> n8n@1.0.0 build /workspaces/n8n',
			'Tasks:    112 successful, 112 total',
			'Ready: the backend answers /healthz on port 5678.',
			JSON.stringify(PREVIEW),
		].join('\n');

		assert.deepEqual(parsePreviewJson(stdout), PREVIEW);
	});

	it('takes the last preview object when several are printed', () => {
		const stale = { ...PREVIEW, sha: '0'.repeat(40) };
		const stdout = `${JSON.stringify(stale)}\n${JSON.stringify(PREVIEW)}\n`;

		assert.equal(parsePreviewJson(stdout).sha, PREVIEW.sha);
	});

	it('ignores JSON that is not a preview report', () => {
		// A build tool can print its own JSON on the same stream.
		assert.equal(parsePreviewJson('{"level":"info","msg":"built"}'), undefined);
	});

	it('returns undefined for output with no JSON at all', () => {
		assert.equal(parsePreviewJson(''), undefined);
		assert.equal(parsePreviewJson('Serving abcdef1 on psychic-umbrella-q7w6gwx…'), undefined);
	});
});

describe('hasPreviewBox', () => {
	const ls = [
		'preview/pr-37\tAvailable\tpsychic-umbrella-q7w6gwx\tlast used 2026-09-04T09:00:00Z',
		'preview/pr-1234\tShutdown\tvigilant-broccoli-x9x8x9x\tlast used 2026-09-03T18:20:00Z',
	].join('\n');

	it('finds a box by its exact display name', () => {
		assert.equal(hasPreviewBox(ls, 37), true);
		assert.equal(hasPreviewBox(ls, '1234'), true);
	});

	it('does not treat a shorter PR number as a prefix match', () => {
		// `preview/pr-3` must not match the row for `preview/pr-37`.
		assert.equal(hasPreviewBox(ls, 3), false);
		assert.equal(hasPreviewBox(ls, 123), false);
	});

	it('handles the empty listing preview.mjs prints when nothing exists', () => {
		assert.equal(hasPreviewBox('No preview boxes on n8n-io/n8n.', 37), false);
		assert.equal(hasPreviewBox('', 37), false);
	});
});

describe('portFromUrl', () => {
	it('reads the forwarded port', () => {
		assert.equal(portFromUrl(PREVIEW.url), '5678');
	});

	it('is not confused by a codespace name that ends in digits', () => {
		assert.equal(portFromUrl('https://opulent-broccoli-9936x9x-5678.app.github.dev'), '5678');
	});
});

describe('comment bodies', () => {
	const bodies = {
		ready: readyComment(PREVIEW),
		readyPrivate: readyComment({ ...PREVIEW, orgVisible: false }),
		down: downComment({ pr: PREVIEW.pr }),
		expired: expiredComment({ pr: PREVIEW.pr }),
		failure: failureComment({
			operation: 'up',
			runUrl: 'https://github.com/n8n-io/n8n/actions/runs/1',
			message: '`preview up` exited 1',
		}),
	};

	it('every body starts with the marker, so postOrUpdateComment edits in place', () => {
		for (const [name, body] of Object.entries(bodies)) {
			assert.ok(body.startsWith(BOT_MARKER), `${name} must start with the bot marker`);
		}
	});

	it('the ready comment links the one-click sign-in path', () => {
		assert.match(bodies.ready, /\/preview-signin\)/);
		assert.match(bodies.ready, /abcdef1/);
		assert.match(bodies.ready, /preview\/pr-1234/);
	});

	it('the ready comment does not claim org access when the port share failed', () => {
		assert.match(bodies.ready, /Every n8n org member/);
		assert.doesNotMatch(bodies.readyPrivate, /Every n8n org member/);
		assert.match(
			bodies.readyPrivate,
			/gh codespace ports visibility 5678:org -c psychic-umbrella-q7w6gwx/,
		);
	});

	it('the failure comment carries the cause and the run link', () => {
		assert.match(bodies.failure, /exited 1/);
		assert.match(bodies.failure, /actions\/runs\/1/);
	});
});
