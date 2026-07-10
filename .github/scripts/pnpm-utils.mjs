import child_process from 'child_process';
import { promisify } from 'node:util';

const exec = promisify(child_process.exec);

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
	return JSON.parse(
		(
			await exec(
				`pnpm ls -r --only-projects --json | jq -r '[.[] | { name: .name, version: .version, path: .path,  private: .private}]'`,
			)
		).stdout,
	);
}
