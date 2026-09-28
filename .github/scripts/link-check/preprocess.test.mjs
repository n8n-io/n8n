import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = new URL('./preprocess.sh', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'link-check-'));

const run = (name, lines) => {
	const file = join(dir, name);
	writeFileSync(file, lines.join('\n') + '\n');
	return execFileSync(script, [file], { encoding: 'utf8' }).split('\n').slice(0, lines.length);
};

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
	const kept = run('node.ts', lines).map((line) => line !== '');
	assert.deepEqual(kept, [false, true, true, true, true, true, true, false]);
});

test('expands credential docs slugs and the docs domain constant', () => {
	assert.deepEqual(run('X.credentials.ts', ["\tdocumentationUrl = 'slack';"]), [
		"\tdocumentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/slack/';",
	]);
	assert.deepEqual(run('urls.ts', ['const docsUrl = `https://${DOCS_DOMAIN}/a`;']), [
		'const docsUrl = `https://docs.n8n.io/a`;',
	]);
});

test('keeps every line of codex and locale files', () => {
	assert.deepEqual(run('X.node.json', ['{"url": "https://docs.example.org/g"}']), [
		'{"url": "https://docs.example.org/g"}',
	]);
});
