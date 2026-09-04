import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import {
	ROOT_PACKAGE_JSON,
	buildCacheKey,
	parsePnpmVersion,
	resolvePnpmVersion,
} from './resolve-pnpm-version.mjs';

const MODULE_URL = new URL('./resolve-pnpm-version.mjs', import.meta.url).href;

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/resolve-pnpm-version.test.mjs
 * */

describe('parsePnpmVersion', () => {
	it('reads the version from a plain pin', () => {
		assert.equal(parsePnpmVersion('pnpm@11.25.0'), '11.25.0');
	});

	it('drops the corepack integrity suffix', () => {
		assert.equal(parsePnpmVersion('pnpm@11.25.0+sha512.abc123'), '11.25.0');
	});

	it('keeps a prerelease tag', () => {
		assert.equal(parsePnpmVersion('pnpm@12.0.0-alpha.1'), '12.0.0-alpha.1');
	});

	for (const packageManager of [undefined, '', 'yarn@4.0.0', 'npm@11.0.0']) {
		it(`rejects '${packageManager}', which pins no pnpm`, () => {
			assert.throws(() => parsePnpmVersion(packageManager), /does not pin pnpm/);
		});
	}

	for (const packageManager of [
		'pnpm@',
		'pnpm@11',
		'pnpm@11.25',
		'pnpm@latest',
		'pnpm@+sha512.a',
	]) {
		it(`rejects '${packageManager}', which pins no exact version`, () => {
			assert.throws(() => parsePnpmVersion(packageManager), /pins no exact pnpm version/);
		});
	}
});

describe('buildCacheKey', () => {
	it('scopes the key to OS, arch and version', () => {
		assert.equal(
			buildCacheKey('11.25.0', { RUNNER_OS: 'Linux', RUNNER_ARCH: 'X64' }),
			'pnpm-exe-v1-Linux-X64-11.25.0',
		);
	});
});

describe('resolvePnpmVersion', () => {
	let dir;
	let packageJsonPath;

	beforeEach(() => {
		dir = mkdtempSync(path.join(tmpdir(), 'pnpm-version-'));
		packageJsonPath = path.join(dir, 'package.json');
	});

	it('writes the version and the cache key to GITHUB_OUTPUT', () => {
		writeFileSync(packageJsonPath, JSON.stringify({ packageManager: 'pnpm@11.25.0' }));
		const outputPath = path.join(dir, 'output');

		const result = resolvePnpmVersion({
			packageJsonPath,
			env: { RUNNER_OS: 'Linux', RUNNER_ARCH: 'ARM64', GITHUB_OUTPUT: outputPath },
		});

		assert.deepEqual(result, { version: '11.25.0', cacheKey: 'pnpm-exe-v1-Linux-ARM64-11.25.0' });
		assert.equal(
			readFileSync(outputPath, 'utf8'),
			'version=11.25.0\ncache-key=pnpm-exe-v1-Linux-ARM64-11.25.0\n',
		);
	});

	it('writes no file when GITHUB_OUTPUT is unset', () => {
		writeFileSync(packageJsonPath, JSON.stringify({ packageManager: 'pnpm@11.25.0' }));

		assert.equal(resolvePnpmVersion({ packageJsonPath, env: {} }).version, '11.25.0');
		assert.equal(existsSync(path.join(dir, 'output')), false);
	});

	it('fails when the packageManager field is absent', () => {
		writeFileSync(packageJsonPath, JSON.stringify({ name: 'n8n-monorepo' }));

		assert.throws(() => resolvePnpmVersion({ packageJsonPath, env: {} }), /does not pin pnpm/);
	});

	// The action pins pnpm from this file, so a malformed pin must fail here first.
	it('resolves the real root package.json', () => {
		const { version, cacheKey } = resolvePnpmVersion({
			env: { RUNNER_OS: 'Linux', RUNNER_ARCH: 'X64' },
		});

		const { packageManager } = JSON.parse(readFileSync(ROOT_PACKAGE_JSON, 'utf8'));
		assert.equal(packageManager, `pnpm@${version}`);
		assert.equal(cacheKey, `pnpm-exe-v1-Linux-X64-${version}`);
	});
});

describe('module entry point', () => {
	it('can be imported without an argv entry', () => {
		const result = spawnSync(
			process.execPath,
			['--input-type=module', '--eval', `process.argv.splice(1); await import('${MODULE_URL}')`],
			{ encoding: 'utf8' },
		);

		assert.equal(result.status, 0, result.stderr);
	});
});
