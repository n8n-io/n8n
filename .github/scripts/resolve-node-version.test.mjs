import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { BAKE_FILE, readNodeVersion, resolveNodeVersion } from './resolve-node-version.mjs';

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/resolve-node-version.test.mjs
 * */

const hcl = (version) => `# Images\n\nvariable "NODE_VERSION" { default = "${version}" }\n`;

function tempFile(name, content) {
	const file = path.join(mkdtempSync(path.join(tmpdir(), 'resolve-node-version-')), name);
	writeFileSync(file, content);
	return file;
}

describe('readNodeVersion', () => {
	it('reads NODE_VERSION', () => {
		assert.equal(readNodeVersion(hcl('26.13.1')), '26.13.1');
	});

	it('reads the bake file of the repository', () => {
		assert.match(readNodeVersion(readFileSync(BAKE_FILE, 'utf8')), /^\d+\.\d+\.\d+$/);
	});

	for (const version of ['26.13', '26', 'latest', '']) {
		it(`rejects '${version}', which is no exact version`, () => {
			assert.throws(() => readNodeVersion(hcl(version)), /pins no exact NODE_VERSION/);
		});
	}

	it('rejects a bake file without NODE_VERSION', () => {
		assert.throws(
			() => readNodeVersion('variable "OTHER" { default = "1.2.3" }\n'),
			/NODE_VERSION/,
		);
	});
});

describe('resolveNodeVersion', () => {
	it('keeps the version that the job asks for', () => {
		const bakeFile = tempFile('docker-bake.hcl', hcl('26.13.1'));
		assert.equal(resolveNodeVersion({ requested: '24.22.2', bakeFile, env: {} }), '24.22.2');
	});

	it('uses NODE_VERSION when the job asks for no version', () => {
		const bakeFile = tempFile('docker-bake.hcl', hcl('26.13.1'));
		assert.equal(resolveNodeVersion({ requested: '', bakeFile, env: {} }), '26.13.1');
	});

	it('writes the version to GITHUB_OUTPUT', () => {
		const bakeFile = tempFile('docker-bake.hcl', hcl('26.13.1'));
		const output = tempFile('output', '');
		resolveNodeVersion({ requested: '', bakeFile, env: { GITHUB_OUTPUT: output } });
		assert.equal(readFileSync(output, 'utf8'), 'version=26.13.1\n');
	});
});

// A Node update changes NODE_VERSION only. A workflow that pins the same major
// keeps the old version, and the workflow token of the base image refresh
// cannot change it.
describe('the Node version of CI', () => {
	const major = readNodeVersion(readFileSync(BAKE_FILE, 'utf8')).split('.')[0];
	// 26.13.0, but not an action version such as v26.1.0 or @26.1.0.
	const pin = new RegExp(`(?<![\\w.@-])${major}\\.\\d+\\.\\d+(?![\\d.])`);
	const githubDir = new URL('../', import.meta.url);

	const files = [
		...readdirSync(new URL('workflows/', githubDir))
			.filter((name) => /\.ya?ml$/.test(name))
			.map((name) => `workflows/${name}`),
		...readdirSync(new URL('actions/', githubDir), { recursive: true })
			.filter((name) => /action\.ya?ml$/.test(name))
			.map((name) => `actions/${name}`),
	];

	it(`no workflow or action pins Node ${major}`, () => {
		const pinned = files.flatMap((file) =>
			readFileSync(new URL(file, githubDir), 'utf8')
				.split('\n')
				.filter((line) => pin.test(line))
				.map((line) => `${file}: ${line.trim()}`),
		);
		assert.deepEqual(pinned, [], 'Leave the version empty: setup-nodejs uses NODE_VERSION');
	});

	it('setup-nodejs reads the input only to resolve the version', () => {
		const lines = readFileSync(new URL('actions/setup-nodejs/action.yml', githubDir), 'utf8')
			.split('\n')
			.map((line) => line.trim());
		// An empty input gives a toolcache key and a setup-node version without a version.
		assert.deepEqual(
			lines.filter((line) => line.includes('inputs.node-version')),
			['REQUESTED_NODE_VERSION: ${{ inputs.node-version }}'],
		);
		// The preinstalled check, the toolcache path and key, setup-node and the version check.
		assert.equal(
			lines.filter((line) => line.includes('steps.node-version.outputs.version')).length,
			5,
		);
	});
});
