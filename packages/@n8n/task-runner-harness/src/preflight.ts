import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { PreflightResult } from './types';

const execFileAsync = promisify(execFile);

/**
 * Verify that a CLI binary is installed and available on the system PATH.
 * Returns version info if available, or an error message if not found.
 */
export async function verifyBinary(
	name: string,
	versionFlag = '--version',
): Promise<PreflightResult> {
	try {
		const { stdout } = await execFileAsync(name, [versionFlag], {
			timeout: 10_000,
			env: { PATH: process.env.PATH },
		});

		return {
			available: true,
			version: stdout.trim().split('\n')[0],
			path: name,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error checking binary availability';

		// ENOENT means the binary was not found on PATH
		const isNotFound =
			'code' in (error as NodeJS.ErrnoException) &&
			(error as NodeJS.ErrnoException).code === 'ENOENT';

		return {
			available: false,
			error: isNotFound
				? `'${name}' is not installed or not in PATH. Please install it and ensure it is accessible.`
				: `Failed to verify '${name}': ${errorMessage}`,
		};
	}
}

/**
 * Run pre-flight checks for the harness runner. Verifies that 'git'
 * is available, which is required for workspace diff tracking.
 */
export async function runPreflightChecks(): Promise<void> {
	const gitResult = await verifyBinary('git');
	if (!gitResult.available) {
		throw new Error(
			`Harness runner pre-flight failed: git is required but not available. ${gitResult.error}`,
		);
	}
	console.log(`Harness runner pre-flight: git ${gitResult.version}`);
}
