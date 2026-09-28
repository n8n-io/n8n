import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	classify,
	collectFailures,
	isBrowserPass,
	isInGracePeriod,
	parseBlameTime,
} from './check-report.mjs';

const entry = (url, status, line = 1) => ({ url, status, span: { line, column: 1 } });

test('collectFailures reuses the first reason for cached entries', () => {
	const report = {
		error_map: {
			'a.ts': [entry('https://x.com/#a', { text: 'Cannot find fragment' })],
			'b.ts': [entry('https://x.com/#a', { text: 'Error (cached)' }, 7)],
		},
		timeout_map: { 'c.ts': [entry('https://slow.com/', { text: 'Timeout' })] },
	};

	assert.deepEqual(collectFailures(report), [
		{ file: 'a.ts', line: 1, url: 'https://x.com/#a', code: null, text: 'Cannot find fragment' },
		{ file: 'b.ts', line: 7, url: 'https://x.com/#a', code: null, text: 'Cannot find fragment' },
		{ file: 'c.ts', line: 1, url: 'https://slow.com/', code: null, text: 'Timeout' },
	]);
});

test('classify counts missing anchors only on docs.n8n.io', () => {
	const text = 'Cannot find fragment';
	assert.equal(classify({ url: 'https://docs.n8n.io/page/#a', code: null, text }), 'broken');
	assert.equal(classify({ url: 'https://github.com/x#a', code: null, text }), 'ignore');
});

test('classify sends blocked, redirected, timed-out, and unreachable links to the browser', () => {
	for (const code of [302, 403, 429, 999]) {
		assert.equal(classify({ url: 'https://x.com/', code, text: '' }), 'browser');
	}
	assert.equal(classify({ url: 'https://x.com/', code: null, text: 'Timeout' }), 'browser');
	assert.equal(
		classify({ url: 'https://x.com/', code: null, text: 'Network error: Connection failed' }),
		'browser',
	);
});

test('classify treats other failures as broken', () => {
	assert.equal(classify({ url: 'https://x.com/', code: 404, text: '' }), 'broken');
	assert.equal(classify({ url: 'https://x.com/', code: 410, text: '' }), 'broken');
});

test('isBrowserPass rejects error statuses and not-found pages', () => {
	assert.equal(isBrowserPass({ status: 200, title: 'Convert string - Stack Overflow' }), true);
	assert.equal(isBrowserPass({ status: 403, title: 'Just a moment...' }), false);
	assert.equal(isBrowserPass({ status: 200, title: 'Page not found' }), false);
	assert.equal(isBrowserPass({ status: 200, title: '404 Error | Salesforce Developers' }), false);
	assert.equal(isBrowserPass({ status: 0, title: '' }), false);
});

test('parseBlameTime reads the commit time and treats history boundaries as unknown', () => {
	const blame = 'abc 1 1 1\nauthor A\ncommitter-time 1790000000\nfilename x.ts\n\tline';
	assert.equal(parseBlameTime(blame), 1790000000000);
	assert.equal(parseBlameTime(blame.replace('filename', 'boundary\nfilename')), null);
});

test('isInGracePeriod applies only to recent docs.n8n.io lines', () => {
	const day = 24 * 60 * 60 * 1000;
	const now = 100 * day;
	const docs = { url: 'https://docs.n8n.io/page/' };
	assert.equal(isInGracePeriod(docs, now - 29 * day, now), true);
	assert.equal(isInGracePeriod(docs, now - 31 * day, now), false);
	assert.equal(isInGracePeriod(docs, null, now), false);
	assert.equal(isInGracePeriod({ url: 'https://example.org/' }, now - day, now), false);
});
