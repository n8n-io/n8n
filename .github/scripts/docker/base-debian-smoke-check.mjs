#!/usr/bin/env node

// Verifies the contract of the Debian base image (n8nio/base:<ver>-debian).
// No n8n image builds on this base yet, so the Docker smoke test does not
// cover it. Run it inside the image as root:
//   docker run --rm --user root --entrypoint node -v "$PWD/<this file>:/check.mjs:ro" <image> /check.mjs

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const run = (file, args = [], options = {}) =>
	execFileSync(file, args, { encoding: 'utf8', ...options }).trim();

const onPath = (bin) => {
	try {
		run('sh', ['-c', `command -v ${bin}`]);
		return true;
	} catch {
		return false;
	}
};

// The n8n image, its entrypoint and the nodes run these by name.
const missing = ['node', 'npm', 'git', 'ssh', 'tini', 'gm', 'c_rehash'].filter((b) => !onPath(b));
assert.deepEqual(missing, [], `Not on PATH: ${missing.join(', ')}`);

// Like the Alpine base, this image has no package manager.
const packageManagers = ['apt', 'apt-get', 'dpkg'].filter(onPath);
assert.deepEqual(packageManagers, [], `Package manager present: ${packageManagers.join(', ')}`);

// The cloud launch and the AppArmor profile use this path.
run('/usr/local/bin/node', ['-e', '0']);
run('tini', ['-s', '--', 'true']);

// The n8n image runs as this user and chowns /home/node to it.
assert.equal(run('id', ['-u', 'node']), '1000', 'User node does not have uid 1000');

// A module that `npm install -g` puts in place must be require()-able.
const moduleDir = path.join(run('npm', ['root', '-g']), 'base-smoke-module');
mkdirSync(moduleDir, { recursive: true });
writeFileSync(path.join(moduleDir, 'index.js'), 'module.exports = 42;');
try {
	const value = run('node', ['-p', 'require("base-smoke-module")'], { cwd: '/' });
	assert.equal(value, '42', 'A global npm module is not require()-able');
} finally {
	rmSync(moduleDir, { recursive: true, force: true });
}

// The EditImage node uses Arial by default and draws text with GraphicsMagick.
const arial = '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf';
assert.ok(existsSync(arial), `${arial} is missing`);
run('gm', [
	'convert',
	...['-size', '200x50', 'xc:white', '-font', arial, '-pointsize', '18'],
	...['-draw', "text 10,30 'smoke'", '/tmp/smoke.png'],
]);

console.log(`Debian base smoke check passed (${process.arch}, node ${process.version}).`);
