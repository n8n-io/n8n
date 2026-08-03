#!/usr/bin/env node
/**
 * Verify that Aikido SafeChain is active by running `safe-chain-verify`
 * *through* each wrapped package manager. SafeChain's shim prints
 * "OK: Safe-chain works!" only when it is intercepting the call — a truer
 * check than matching the resolved binary path.
 *
 * SafeChain's CI shims are bare executables on Unix but `.cmd`/`.ps1` on Windows; running
 * the command with `shell: true` delegates to the platform shell
 * (`/bin/sh` / `cmd.exe`), so each OS resolves its own shim form and a
 * single code path covers both.
 *
 * Note: this must run as a *separate* step after `safe-chain setup-ci`.
 * `setup-ci` exposes the shims via `$GITHUB_PATH`, which the runner only
 * applies to `PATH` between steps — so the shims are not on this process's
 * PATH until the activation step has finished.
 *
 * Exits 0 only when every package manager reports OK; 1 otherwise.
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PACKAGE_MANAGERS = ['npm', 'pnpm'];

/**
 * @param {string} pm Package manager to probe (e.g. 'npm', 'pnpm')
 * @param {typeof spawnSync} spawnFn Injectable for testing
 * @returns {{ pm: string, ok: boolean, output: string }}
 */
export function verifyPackageManager(pm, spawnFn = spawnSync) {
	const { status, stdout, stderr } = spawnFn(pm, ['safe-chain-verify'], {
		shell: true,
		encoding: 'utf8',
	});
	const output = `${stdout ?? ''}${stderr ?? ''}`;
	const ok = status === 0 && output.includes('OK: Safe-chain works!');

	return { pm, ok, output };
}

/**
 * Verify Safe Chain for each package manager defined in PACKAGE_MANAGERS
 *
 * @param {typeof spawnSync} spawnFn Injectable for testing
 * @returns {boolean} true when all package managers report OK
 */
export function verifySafeChain(spawnFn = spawnSync) {
	let allOk = true;
	for (const pm of PACKAGE_MANAGERS) {
		const { ok, output } = verifyPackageManager(pm, spawnFn);
		process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);

		if (!ok) {
			console.error(
				`::error::SafeChain inactive: '${pm} safe-chain-verify' failed or returned unexpected output`,
			);
			allOk = false;
		}
	}
	return allOk;
}

// only run when executed directly, not when imported by tests
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	console.log("Verifying SafeChain");
	process.exit(verifySafeChain() ? 0 : 1);
}
