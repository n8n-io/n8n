import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

import { sendSlackMessage } from './notify.mjs';

function mockFetch(responseBody, status = 200) {
	return mock.method(globalThis, 'fetch', async () => ({
		status,
		json: async () => responseBody,
	}));
}

test('posts channel + text to chat.postMessage', async (t) => {
	const fetchMock = mockFetch({ ok: true, channel: 'C123', ts: '1.0' });
	t.after(() => fetchMock.mock.restore());

	await sendSlackMessage({ token: 'xoxb-test', channel: '#x', text: 'hi' });

	const [url, init] = fetchMock.mock.calls[0].arguments;
	assert.equal(url, 'https://slack.com/api/chat.postMessage');
	assert.equal(init.method, 'POST');
	assert.equal(init.headers.Authorization, 'Bearer xoxb-test');
	assert.equal(init.headers['Content-Type'], 'application/json; charset=utf-8');
	assert.deepEqual(JSON.parse(init.body), { channel: '#x', text: 'hi' });
});

test('includes blocks when provided', async (t) => {
	const fetchMock = mockFetch({ ok: true, channel: 'C123', ts: '1.0' });
	t.after(() => fetchMock.mock.restore());

	const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'x' } }];
	await sendSlackMessage({ token: 't', channel: '#x', text: 'hi', blocks });

	const [, init] = fetchMock.mock.calls[0].arguments;
	assert.deepEqual(JSON.parse(init.body), { channel: '#x', text: 'hi', blocks });
});

test('exits non-zero on Slack ok:false', async (t) => {
	const fetchMock = mockFetch({ ok: false, error: 'not_in_channel' });
	const exitMock = mock.method(process, 'exit', () => {
		throw new Error('exit called');
	});
	const errMock = mock.method(console, 'error', () => {});
	t.after(() => {
		fetchMock.mock.restore();
		exitMock.mock.restore();
		errMock.mock.restore();
	});

	await assert.rejects(
		sendSlackMessage({ token: 't', channel: '#x', text: 'hi' }),
		/exit called/,
	);
	assert.equal(exitMock.mock.calls[0].arguments[0], 1);
});
