import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { verifyPackageManager, verifySafeChain } from './verify-safechain.mjs';

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/verify-safechain.test.mjs
 * */

// Build a fake spawnSync that returns a canned result per package manager.
const fakeSpawn = (resultsByPm) => (pm) => resultsByPm[pm] ?? { status: 127, stdout: '', stderr: '' };

describe('verifyPackageManager', () => {
	it('is ok when status is 0 and output contains OK: Safe-chain works!', () => {
		const spawn = fakeSpawn({ npm: { status: 0, stdout: 'OK: Safe-chain works!\n', stderr: '' } });
		assert.deepEqual(verifyPackageManager('npm', spawn), {
			pm: 'npm',
			ok: true,
			output: 'OK: Safe-chain works!\n',
		});
	});

	it('is not ok when the command exits non-zero', () => {
		const spawn = fakeSpawn({ npm: { status: 1, stdout: '', stderr: 'command not found' } });
		assert.equal(verifyPackageManager('npm', spawn).ok, false);
	});

	it('is not ok when exit is 0 but OK marker is missing (unwrapped pm)', () => {
		const spawn = fakeSpawn({ npm: { status: 0, stdout: 'Unknown command: safe-chain-verify', stderr: '' } });
		assert.equal(verifyPackageManager('npm', spawn).ok, false);
	});

	it('reads the marker from stderr too', () => {
		const spawn = fakeSpawn({ npm: { status: 0, stdout: '', stderr: 'OK: Safe-chain works!' } });
		assert.equal(verifyPackageManager('npm', spawn).ok, true);
	});
});

describe('verifySafeChain', () => {
	it('returns true only when every package manager reports OK', () => {
		const spawn = fakeSpawn({
			npm: { status: 0, stdout: 'OK: Safe-chain works!\n', stderr: '' },
			pnpm: { status: 0, stdout: 'OK: Safe-chain works!\n', stderr: '' },
		});
		assert.equal(verifySafeChain(spawn), true);
	});

	it('returns false when any package manager fails', () => {
		const spawn = fakeSpawn({
			npm: { status: 0, stdout: 'OK: Safe-chain works!\n', stderr: '' },
			pnpm: { status: 1, stdout: '', stderr: 'nope' },
		});
		assert.equal(verifySafeChain(spawn), false);
	});
});
