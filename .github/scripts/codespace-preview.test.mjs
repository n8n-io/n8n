import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	BOT_MARKER,
	DISPATCH_OPERATIONS,
	PROGRESS_MARKER,
	WORKFLOW_URL,
	cancelledComment,
	downComment,
	expiredComment,
	failureComment,
	formatElapsed,
	hasPreviewBox,
	operationFor,
	parsePreviewJson,
	parseProgressLine,
	portFromUrl,
	previewUrlFromBody,
	progressComment,
	readyComment,
	resolveOperation,
} from './codespace-preview.mjs';

const PREVIEW = {
	pr: 1234,
	sha: 'abcdef1234567890abcdef1234567890abcdef12',
	codespace: 'psychic-umbrella-q7w6gwx',
	url: 'https://psychic-umbrella-q7w6gwx-5678.app.github.dev',
	orgVisible: true,
};

const START = Date.parse('2026-09-17T09:35:00Z');
const PROGRESS = {
	pr: 1234,
	operation: 'up',
	runUrl: 'https://github.com/n8n-io/n8n/actions/runs/1',
	sha: PREVIEW.sha,
	phase: 'build',
	startedAt: START,
	phaseStartedAt: START + 111_000,
	now: START + 363_000,
};

describe('operationFor', () => {
	const LABEL = 'codespace-preview';

	it('creates and deletes on the trigger label', () => {
		assert.equal(operationFor('labeled', LABEL), 'up');
		assert.equal(operationFor('unlabeled', LABEL), 'down');
	});

	it('re-serves on a push or a preview: toggle, without creating a box', () => {
		assert.equal(operationFor('synchronize'), 'refresh');
		// A toggle configures an instance that exists; it must never create or delete one.
		assert.equal(operationFor('labeled', 'preview:enterprise'), 'refresh');
		assert.equal(operationFor('unlabeled', 'preview:enterprise'), 'refresh');
		assert.equal(operationFor('labeled', 'preview:debug'), 'refresh');
	});

	it('deletes when the PR closes', () => {
		assert.equal(operationFor('closed'), 'down');
	});

	it('ignores a label that is not ours', () => {
		assert.equal(operationFor('labeled', 'bug'), undefined);
		assert.equal(operationFor('unlabeled', 'Do Not Merge'), undefined);
		// A near-miss must not be read as the trigger label.
		assert.equal(operationFor('labeled', 'codespace-preview-2'), undefined);
		assert.equal(operationFor('labeled', undefined), undefined);
	});

	it('returns undefined for an action the workflow does not handle', () => {
		assert.equal(operationFor('opened'), undefined);
		assert.equal(operationFor('reopened'), undefined);
		assert.equal(operationFor(''), undefined);
	});
});

describe('resolveOperation', () => {
	it('falls back to the event mapping when no operation is requested', () => {
		assert.equal(resolveOperation({ action: 'labeled', label: 'codespace-preview' }), 'up');
		assert.equal(resolveOperation({ action: 'synchronize' }), 'refresh');
		assert.equal(resolveOperation({ action: 'labeled', label: 'bug' }), undefined);
		// The workflow sets the variable to '' on a pull_request run, not undefined.
		assert.equal(resolveOperation({ action: 'closed', operation: '' }), 'down');
	});

	it('lets a manual run choose, over the event', () => {
		for (const operation of DISPATCH_OPERATIONS) {
			assert.equal(resolveOperation({ action: '', operation }), operation);
		}
		assert.equal(resolveOperation({ action: 'synchronize', operation: 'down' }), 'down');
	});

	it('rejects an operation that is not one of ours', () => {
		// `ls` posts no comment and needs no PR, so the workflow does not offer it.
		assert.equal(resolveOperation({ action: '', operation: 'ls' }), undefined);
		assert.equal(resolveOperation({ action: '', operation: 'UP' }), undefined);
		assert.equal(resolveOperation({ action: '', operation: 'up; rm -rf /' }), undefined);
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

	// The phase lines share the channel with the report. This is the contract that
	// makes that safe.
	it('ignores the phase lines that precede the report', () => {
		const stdout = [
			'{"phase":"resolve"}',
			'{"sha":"abcdef1","phase":"build"}',
			JSON.stringify(PREVIEW),
		].join('\n');

		assert.deepEqual(parsePreviewJson(stdout), PREVIEW);
		assert.equal(parsePreviewJson('{"phase":"build"}'), undefined);
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
		progress: progressComment(PROGRESS),
		cancelled: cancelledComment({
			pr: PREVIEW.pr,
			operation: 'up',
			runUrl: 'https://github.com/n8n-io/n8n/actions/runs/1',
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

	it('quotes the idle timeout preview.mjs actually sets', () => {
		// preview.mjs creates a box with --idle-timeout 2h.
		assert.match(bodies.ready, /sleeps after 2 hours/);
	});

	it('points a slept, expired or failed box at the manual run', () => {
		for (const name of ['ready', 'expired', 'failure']) {
			assert.ok(bodies[name].includes(WORKFLOW_URL), `${name} must link the workflow`);
		}
	});

	// The cancelled-run step writes only over a checklist, so no settled body may
	// carry the progress marker.
	it('carries the progress marker on the checklist and nowhere else', () => {
		assert.ok(bodies.progress.includes(PROGRESS_MARKER));
		for (const name of ['ready', 'down', 'expired', 'failure', 'cancelled']) {
			assert.ok(!bodies[name].includes(PROGRESS_MARKER), `${name} must not look in progress`);
		}
	});

	it('the cancelled body says the box can still exist, and links both runs', () => {
		assert.match(bodies.cancelled, /can still exist/);
		assert.ok(bodies.cancelled.includes(WORKFLOW_URL));
		assert.ok(bodies.cancelled.includes('actions/runs/1'));
	});
});

describe('formatElapsed', () => {
	it('reads as a duration a reviewer can scan', () => {
		assert.equal(formatElapsed(0), '0s');
		assert.equal(formatElapsed(59_000), '59s');
		assert.equal(formatElapsed(60_000), '1m 00s');
		assert.equal(formatElapsed(252_000), '4m 12s');
		assert.equal(formatElapsed(3_780_000), '1h 3m');
	});

	// A wrong duration in a status line is worse than a boring one.
	it('falls back to 0s for a value it cannot use', () => {
		assert.equal(formatElapsed(-1), '0s');
		assert.equal(formatElapsed(NaN), '0s');
		assert.equal(formatElapsed(undefined), '0s');
	});
});

describe('progressComment', () => {
	it('ticks off the phases before the current one and leaves the rest open', () => {
		const body = progressComment(PROGRESS);

		assert.match(body, /- \[x\] Resolve the PR head/);
		assert.match(body, /- \[x\] Install dependencies/);
		assert.match(body, /- \[ \] \*\*Build the monorepo\*\* · 4m 12s/);
		assert.match(body, /- \[ \] Share the port with the org/);
	});

	it('names the commit and the elapsed time, and links the run', () => {
		const body = progressComment(PROGRESS);

		assert.match(body, /starting for `abcdef1`/);
		assert.match(body, /Elapsed 6m 03s/);
		assert.ok(body.includes(PROGRESS.runUrl));
	});

	it('says what the phase is doing when the phase says so', () => {
		const body = progressComment({ ...PROGRESS, phase: 'box', detail: 'reusing psychic-umbrella' });

		assert.match(body, /\*\*Prepare the box\*\* — reusing psychic-umbrella/);
	});

	// A workflow_dispatch run reports the sha only once preview.mjs resolves it.
	it('falls back to the PR number before the sha is known', () => {
		const body = progressComment({ ...PROGRESS, sha: undefined });

		assert.match(body, /starting for PR #1234/);
	});

	it('leaves every phase open before the first one reports', () => {
		const body = progressComment({ ...PROGRESS, phase: undefined });

		assert.ok(!body.includes('- [x]'));
		assert.match(body, /- \[ \] Resolve the PR head/);
	});

	it('says a refresh is updating, not starting', () => {
		assert.match(progressComment({ ...PROGRESS, operation: 'refresh' }), /updating to `abcdef1`/);
	});

	it('warns only once a phase passes the time it usually takes', () => {
		const slow = { ...PROGRESS, phaseStartedAt: START - 600_001 };

		assert.match(progressComment(slow), /Build the monorepo is taking longer than usual/);
		assert.ok(!progressComment(PROGRESS).includes('longer than usual'));
	});

	// Replacing a ready comment with a checklist would otherwise take a working URL
	// off the PR for several minutes.
	it('keeps a URL a previous run reported', () => {
		const body = progressComment({ ...PROGRESS, previousUrl: PREVIEW.url });

		assert.ok(body.includes(PREVIEW.url));
		assert.match(body, /stops answering/);
		assert.ok(!progressComment(PROGRESS).includes('stops answering'));
	});
});

describe('previewUrlFromBody', () => {
	it('reads the URL back out of a ready body', () => {
		assert.equal(previewUrlFromBody(readyComment(PREVIEW)), PREVIEW.url);
	});

	it('finds nothing in a body that reports no instance', () => {
		assert.equal(previewUrlFromBody(downComment({ pr: 1234 })), undefined);
		assert.equal(previewUrlFromBody(expiredComment({ pr: 1234 })), undefined);
		assert.equal(previewUrlFromBody(progressComment(PROGRESS)), undefined);
		assert.equal(previewUrlFromBody(''), undefined);
	});
});

describe('parseProgressLine', () => {
	it('reads a phase line', () => {
		assert.deepEqual(parseProgressLine('{"phase":"build","sha":"abc"}'), {
			phase: 'build',
			sha: 'abc',
		});
	});

	it('ignores the report and anything that is not a phase line', () => {
		assert.equal(parseProgressLine(JSON.stringify(PREVIEW)), undefined);
		assert.equal(parseProgressLine('Serving abcdef1 on psychic-umbrella-q7w6gwx…'), undefined);
		assert.equal(parseProgressLine('{"level":"info","msg":"built"}'), undefined);
		assert.equal(parseProgressLine('{not json'), undefined);
	});
});
