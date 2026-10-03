import { test } from 'node:test';
import assert from 'node:assert/strict';

import { filterText } from './extract.mjs';

const filter = (path, lines) => filterText(path, lines.join('\n')).split('\n');

test('keeps links that a person follows and blanks other URLs', () => {
	const lines = [
		"baseURL: 'https://api.example.org/v1',",
		'description: \'See <a href="https://docs.example.org/a">docs</a>\',',
		"docsUrl: 'https://docs.example.org/b',",
		'docURL:',
		"\t'https://docs.example.org/c',",
		'// https://docs.example.org/d',
		"description: 'Refer to https://docs.example.org/e for details.',",
		"placeholder: 'e.g. https://my.example.org/f',",
	];
	const kept = filter('node.ts', lines).map((line) => line !== '');
	assert.deepEqual(kept, [false, true, true, false, true, true, true, false]);
});

test('expands credential docs slugs and the docs domain constant', () => {
	assert.deepEqual(filter('X.credentials.ts', ["\tdocumentationUrl = 'slack';"]), [
		"\tdocumentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/slack/';",
	]);
	assert.deepEqual(filter('urls.ts', ['const docsUrl = `https://${DOCS_DOMAIN}/a`;']), [
		'const docsUrl = `https://docs.n8n.io/a`;',
	]);
});

test('removes string escapes from URLs', () => {
	assert.deepEqual(filter('en.json', ['"a": "<a href=\\"https://x.org/\\">x</a>\\nmore"']), [
		'"a": "<a href="https://x.org/">x</a> more"',
	]);
});

test('keeps every line of codex, locale, and markdown files', () => {
	assert.deepEqual(filter('X.node.json', ['{"url": "https://docs.example.org/g"}']), [
		'{"url": "https://docs.example.org/g"}',
	]);
	assert.deepEqual(filter('README.md', ["baseURL: 'https://docs.example.org/h'"]), [
		"baseURL: 'https://docs.example.org/h'",
	]);
});
