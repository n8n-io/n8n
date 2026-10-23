import child_process from 'child_process';
import { promisify } from 'node:util';

const execFile = promisify(child_process.execFile);

/**
 * @typedef PnpmPackage
 * @property { string } name
 * @property { string } version
 * @property { string } path
 * @property { boolean } private
 * */

/**
 * @returns { Promise<PnpmPackage[]> }
 * */
export async function getMonorepoProjects() {
	let stdout;

	// No shell and no `| jq`: a pipeline hides pnpm's exit code (jq exits 0 on
	// empty input), which turns a failing pnpm into an empty package list.
	try {
		({ stdout } = await execFile('pnpm', ['ls', '-r', '--only-projects', '--json'], {
			// Unprojected output is ~600KB and grows with the workspace.
			maxBuffer: 64 * 1024 * 1024,
		}));
	} catch (error) {
		const details = error.stderr?.trim() || error.message;
		throw new Error(`\`pnpm ls -r --only-projects --json\` failed: ${details}`);
	}

	if (!stdout.trim()) {
		throw new Error('`pnpm ls -r --only-projects --json` produced no output');
	}

	return JSON.parse(stdout).map(({ name, version, path, private: isPrivate }) => ({
		name,
		version,
		path,
		private: Boolean(isPrivate),
	}));
}
