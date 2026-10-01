import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { externalBases, hashTree } from './runner-image-fingerprint.mjs';

test('runner fingerprints track file bytes, modes, and symlink targets but not timestamps', () => {
	const dir = mkdtempSync(join(tmpdir(), 'runner-fingerprint-'));
	const fingerprint = () => {
		const hash = createHash('sha256');
		hashTree(hash, dir, 'runner');
		return hash.digest('hex');
	};
	try {
		mkdirSync(join(dir, 'dist'));
		const file = join(dir, 'dist', 'start.js');
		writeFileSync(file, 'start');
		symlinkSync('dist/start.js', join(dir, 'entry'));
		const first = fingerprint();
		writeFileSync(file, 'start');
		assert.equal(fingerprint(), first);
		writeFileSync(file, 'changed');
		const changed = fingerprint();
		assert.notEqual(changed, first);
		chmodSync(file, 0o755);
		const executable = fingerprint();
		assert.notEqual(executable, changed);
		rmSync(join(dir, 'entry'));
		symlinkSync('dist/other.js', join(dir, 'entry'));
		assert.notEqual(fingerprint(), executable);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('base resolution uses build argument overrides and excludes local stages', () => {
	assert.deepEqual(
		externalBases(
			[
				'ARG NODE_VERSION=24',
				'FROM node:${NODE_VERSION}-slim AS builder',
				'FROM builder AS prep',
				'FROM node:${NODE_VERSION}-slim AS node',
				'FROM gcr.io/distroless/cc-debian13:latest AS runtime',
			].join('\n'),
			{ NODE_VERSION: '26.7.0' },
		),
		['gcr.io/distroless/cc-debian13:latest', 'node:26.7.0-slim'],
	);
	assert.throws(() => externalBases('FROM node:${MISSING}', {}));
});
