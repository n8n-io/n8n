import child_process from 'node:child_process';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';

import { getMonorepoProjects } from '../pnpm-utils.mjs';
import { findOwningEntry, parseOwnersFile, teamHandleToSlug } from './owners.mjs';

const execFile = promisify(child_process.execFile);

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

/**
 * @typedef WhyNode One node of `pnpm why --json`: the package, or a package that depends on it.
 * @property { string } name
 * @property { string } [version]
 * @property { string } [depField] How the dependent declares the edge (`dependencies`, `devDependencies`, ...).
 * @property { WhyNode[] } [dependents]
 * */

/**
 * @typedef Importer A workspace package that pulls the dependency in.
 * @property { string } name
 * @property { boolean } direct It declares the dependency itself.
 * @property { boolean } dev Every path to the dependency starts in `devDependencies`.
 * @property { string[] } via The direct dependencies that pull it in, when not direct.
 * */

/**
 * Walk `pnpm why -r <pkg> --json` output up to the workspace packages that pull
 * the dependency in. pnpm stops each chain at the first workspace package.
 *
 * @param { WhyNode[] } trees
 * @param { Set<string> } workspaceNames
 * @returns { Importer[] }
 * */
export function collectImporters(trees, workspaceNames) {
	/** @type { Map<string, { direct: boolean, dev: boolean, via: Set<string> }> } */
	const importers = new Map();

	/** @param { WhyNode } node @param { string | undefined } topDependency */
	const walk = (node, topDependency) => {
		for (const dependent of node.dependents ?? []) {
			if (!workspaceNames.has(dependent.name)) {
				walk(dependent, dependent.name);
				continue;
			}
			const record = importers.get(dependent.name) ?? { direct: false, dev: true, via: new Set() };
			if (topDependency === undefined) record.direct = true;
			else record.via.add(topDependency);
			if (dependent.depField !== 'devDependencies') record.dev = false;
			importers.set(dependent.name, record);
		}
	};
	for (const tree of trees) walk(tree, undefined);

	return Array.from(importers, ([name, { direct, dev, via }]) => ({
		name,
		direct,
		dev,
		via: [...via].sort(),
	})).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Decide which OWNERS team owns a dependency. A dependency has one owner.
 *
 * Returns OWNERS team slugs (`core-execution`), not Linear teams: the caller
 * maps a team to its Linear team, so this repo keeps no second mapping.
 *
 * - Production uses only: dev-only dependencies are tooling and go to the OWNERS catch-all team.
 * - Direct production uses win over transitive ones.
 * - One owning team: `single`. Several: `round-robin`. The caller picks one of
 *   `candidates`, because the round-robin state lives with the caller.
 *
 * @param { object } input
 * @param { string } input.packageName
 * @param { string[] } [input.versions] Installed versions, so callers can tell a finding is already fixed.
 * @param { Importer[] } input.importers
 * @param { Map<string, string> } input.importerDirs Workspace package name -> repo-relative directory.
 * @param { import('./owners.mjs').OwnersEntry[] } input.entries
 * */
export function decideOwner({ packageName, versions = [], importers, importerDirs, entries }) {
	/** @param { string } name */
	const ownerSlug = (name) => {
		const dir = importerDirs.get(name) ?? '.';
		const entry = findOwningEntry(dir === '.' ? 'package.json' : `${dir}/package.json`, entries);
		return entry ? teamHandleToSlug(entry.team) : undefined;
	};

	const production = importers.filter((importer) => !importer.dev);
	const pool = production.some((importer) => importer.direct)
		? production.filter((importer) => importer.direct)
		: production;

	// No production use means tooling, owned by whoever owns unassigned files.
	const catchAll = entries.find((entry) => entry.pattern === '*');
	let candidates = [];
	if (pool.length > 0)
		candidates = [...new Set(pool.map((importer) => ownerSlug(importer.name)).filter(Boolean))];
	else if (importers.length > 0 && catchAll) candidates = [teamHandleToSlug(catchAll.team)];
	candidates.sort();

	let decision = 'none';
	if (candidates.length === 1) decision = pool.length > 0 ? 'single' : 'tooling';
	else if (candidates.length > 1) decision = 'round-robin';

	return {
		package: packageName,
		versions,
		decision,
		owner: candidates.length === 1 ? candidates[0] : '',
		candidates,
		importers: importers.map((importer) => ({
			...importer,
			dir: importerDirs.get(importer.name) ?? '.',
			owner: ownerSlug(importer.name) ?? '',
		})),
	};
}

/** @param { string } packageName */
async function pnpmWhy(packageName) {
	const { stdout } = await execFile('pnpm', ['why', '-r', packageName, '--json'], {
		maxBuffer: 256 * 1024 * 1024,
	});
	return stdout.trim() ? JSON.parse(stdout) : [];
}

// CLI: `node resolve-dependency-owners.mjs <package> [<package>...]` prints one
// decision per package as a JSON array. Reads pnpm-lock.yaml; no install needed.
if (import.meta.url === `file://${process.argv[1]}`) {
	const packageNames = process.argv.slice(2);
	if (packageNames.length === 0) {
		console.error('Usage: node resolve-dependency-owners.mjs <package> [<package>...]');
		process.exit(1);
	}

	process.chdir(REPO_ROOT);
	const projects = await getMonorepoProjects();
	const importerDirs = new Map(
		projects.map((project) => [project.name, relative(REPO_ROOT, project.path) || '.']),
	);
	const workspaceNames = new Set(importerDirs.keys());
	const entries = parseOwnersFile();

	const results = [];
	for (const packageName of packageNames) {
		const trees = await pnpmWhy(packageName);
		const versions = [...new Set(trees.map((tree) => tree.version).filter(Boolean))].sort();
		const importers = collectImporters(trees, workspaceNames);
		results.push(decideOwner({ packageName, versions, importers, importerDirs, entries }));
	}
	console.log(JSON.stringify(results, null, 2));
}
