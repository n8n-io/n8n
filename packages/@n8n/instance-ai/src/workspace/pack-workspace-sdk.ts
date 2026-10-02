/**
 * Host-side helper for injecting workspace packages into a remote Daytona /
 * n8n-sandbox sandbox during local development.
 *
 * Opt-in via `N8N_INSTANCE_AI_SANDBOX_LINK_SDK=1`. Node contracts also link these
 * packages, because only the host's own `@n8n/workflow-sdk` has `./next`. Other
 * production sandboxes install the registry-pinned version from `PACKAGE_JSON`.
 *
 * Why this exists: remote sandboxes have no line-of-sight to the dev's
 * monorepo. When a dev rebuilds the SDK or `n8n-workflow` locally, the
 * sandbox still runs whatever versions are on npm. This packs the workspace
 * packages into tarballs on the host so the sandbox can `npm install` them
 * post-creation and override the registry copies.
 *
 * `@n8n/workflow-sdk` is linked together with the workspace packages it needs
 * from master: packing only the SDK leaves npm's copies of the others in
 * place, which breaks when master is ahead of the registry under the same
 * version (e.g. `UserError` moving from `n8n-workflow` to `@n8n/errors`).
 * Other workspace dependencies keep their npm copies, to keep the link small.
 *
 * We use `pnpm pack` (not `npm pack`) because the workspace `package.json`
 * uses pnpm protocols (`workspace:*`, `catalog:`) that npm can't resolve;
 * pnpm rewrites those to concrete semver during packing. An installed copy
 * (an n8n Docker image) has no pnpm, so `packInstalledPackage` packs it.
 */

import { execFile } from 'node:child_process';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import {
	isInstalledPackageCopy,
	packInstalledPackage,
	resolveInstalledPackageDir,
} from './pack-installed-package';
import type { Logger } from '../logger';

const hostRequire = createRequire(__filename);
const execFileAsync = promisify(execFile);

const ENV_FLAG = 'N8N_INSTANCE_AI_SANDBOX_LINK_SDK';

/** The package whose workspace dependencies are linked into the sandbox with it. */
export const SANDBOX_LINK_ROOT_PACKAGE = '@n8n/workflow-sdk';

/** Node contracts type-check n8n expressions in the sandbox against this package. */
export const NODE_CONTRACTS_LINK_ROOT_PACKAGE = '@n8n/expression-types';

/**
 * Workspace packages installed into the sandbox when workspace linking is
 * enabled. Add a package here when the SDK breaks against its npm copy.
 */
export const SANDBOX_LINKED_WORKSPACE_PACKAGES: ReadonlySet<string> = new Set([
	'@n8n/utils',
	'@n8n/errors',
	'n8n-workflow',
	SANDBOX_LINK_ROOT_PACKAGE,
]);

/** A workspace package found on the host. */
export interface HostWorkspacePackage {
	name: string;
	/** Absolute path of the package directory. */
	path: string;
}

export interface WorkspacePackageTarball {
	/** Raw tarball bytes, ready to upload to the sandbox. */
	tarball: Buffer;
	/** npm package name (e.g. `n8n-workflow`). */
	packageName: string;
	/** Version packed (post-rewrite). Useful for logs. */
	version: string;
	/** Basename of the packed archive (e.g. `n8n-workflow-sdk-0.11.2.tgz`). */
	filename: string;
	/** Absolute path of the packed package on the host. */
	packagePath: string;
}

/** @deprecated Use {@link WorkspacePackageTarball} */
export type WorkspaceSdkTarball = WorkspacePackageTarball & { sdkPath: string };

export function isLinkWorkspaceSdkEnabled(): boolean {
	const v = process.env[ENV_FLAG];
	return v === '1' || v === 'true';
}

/**
 * Pack a host-resolved workspace package into a tarball using `pnpm pack`. An installed
 * copy under `node_modules` is packed in-process instead.
 */
export async function packWorkspacePackage(
	logger: Logger,
	packageName: string,
	packagePath: string | null = resolveInstalledPackageDir(hostRequire, packageName),
): Promise<WorkspacePackageTarball | null> {
	if (!packagePath) {
		logger.warn(`${packageName} could not be resolved on the host — skipping sandbox link`);
		return null;
	}

	// Sanity check: dist/ must exist, otherwise the tarball would ship stale
	// or empty bytes. Fail loudly so the dev knows they need to `pnpm build`.
	const distPath = path.join(packagePath, 'dist');
	try {
		await stat(distPath);
	} catch {
		logger.warn(
			`${packageName}/dist is missing — run \`pnpm build\` in ${packagePath} first. Skipping sandbox link.`,
		);
		return null;
	}

	if (isInstalledPackageCopy(packagePath)) {
		const packed = await packInstalledPackage(packagePath);
		logger.info('Packed installed package for sandbox link', {
			package: packageName,
			version: packed.version,
			bytes: packed.tarball.byteLength,
			packagePath,
		});
		return { ...packed, packageName, packagePath };
	}

	const tmpDir = await mkdtemp(path.join(tmpdir(), 'n8n-workspace-pack-'));
	try {
		const { stdout } = await execFileAsync('pnpm', ['pack', '--pack-destination', tmpDir], {
			cwd: packagePath,
			env: process.env,
			maxBuffer: 16 * 1024 * 1024,
		});

		const filename = parsePackFilename(stdout);
		if (!filename) {
			throw new Error(`pnpm pack produced no tarball — stdout:\n${stdout}`);
		}
		const tarballPath = path.join(tmpDir, filename);
		const tarball = await readFile(tarballPath);
		const version = parseVersionFromFilename(filename);

		logger.info('Packed workspace package for sandbox link', {
			package: packageName,
			version,
			bytes: tarball.byteLength,
			packagePath,
		});

		return { tarball, packageName, version, filename, packagePath };
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
}

/**
 * The host packages linked into the sandbox: the SDK with its linked workspace dependencies,
 * and with node contracts also `@n8n/expression-types`. Dependencies come before dependents.
 */
export async function findHostSandboxPackages(
	nodeContractsEnabled: boolean,
): Promise<HostWorkspacePackage[]> {
	const rootNames = nodeContractsEnabled
		? [SANDBOX_LINK_ROOT_PACKAGE, NODE_CONTRACTS_LINK_ROOT_PACKAGE]
		: [SANDBOX_LINK_ROOT_PACKAGE];
	const found = new Map<string, HostWorkspacePackage>();
	for (const rootName of rootNames) {
		const rootPath = resolveInstalledPackageDir(hostRequire, rootName);
		if (!rootPath) {
			throw new Error(`${rootName} could not be resolved on the host for the sandbox.`);
		}
		for (const pkg of await findLinkedWorkspacePackages(rootName, rootPath)) {
			if (!found.has(pkg.name)) found.set(pkg.name, pkg);
		}
	}
	return [...found.values()];
}

/**
 * Pack the host's copies of the packages linked into the sandbox. Throws when any
 * package could not be packed.
 */
export async function packHostSandboxPackages(
	logger: Logger,
	nodeContractsEnabled: boolean,
): Promise<WorkspacePackageTarball[]> {
	const packed: WorkspacePackageTarball[] = [];
	for (const pkg of await findHostSandboxPackages(nodeContractsEnabled)) {
		const tarball = await packWorkspacePackage(logger, pkg.name, pkg.path);
		if (!tarball) {
			throw new Error(
				`${pkg.name} could not be packed for the sandbox. Run \`pnpm build\` in ${pkg.path}.`,
			);
		}
		packed.push(tarball);
	}

	return packed;
}

/**
 * Pack the host-resolved `@n8n/workflow-sdk` into a tarball using `pnpm pack`.
 *
 * Returns `null` when the feature flag is off (caller can skip work
 * without needing to read the env var themselves).
 */
export async function packWorkspaceSdk(
	logger: Logger,
	packageName = '@n8n/workflow-sdk',
	// oxlint-disable-next-line typescript/no-deprecated
): Promise<WorkspaceSdkTarball | null> {
	if (!isLinkWorkspaceSdkEnabled()) return null;

	const packed = await packWorkspacePackage(logger, packageName);
	if (!packed) return null;

	return { ...packed, sdkPath: packed.packagePath };
}

/**
 * The root package and the packages in `linked` that it depends on at runtime,
 * directly or through other linked packages. Each dependency resolves from the
 * package that depends on it, because pnpm links only direct dependencies into
 * a package's `node_modules`. Dependencies come before their dependents.
 */
export async function findLinkedWorkspacePackages(
	rootName: string,
	rootPath: string,
	linked: ReadonlySet<string> = SANDBOX_LINKED_WORKSPACE_PACKAGES,
): Promise<HostWorkspacePackage[]> {
	const found: HostWorkspacePackage[] = [];
	const visited = new Set<string>();

	async function visit(name: string, packagePath: string): Promise<void> {
		if (visited.has(name)) return;
		visited.add(name);

		const manifest: unknown = JSON.parse(
			await readFile(path.join(packagePath, 'package.json'), 'utf8'),
		);
		const dependencies =
			typeof manifest === 'object' && manifest !== null && 'dependencies' in manifest
				? manifest.dependencies
				: undefined;
		if (typeof dependencies === 'object' && dependencies !== null) {
			const packageRequire = createRequire(path.join(packagePath, 'package.json'));
			for (const [dependency, range] of Object.entries(dependencies)) {
				if (typeof range !== 'string' || !range.startsWith('workspace:')) continue;
				if (!linked.has(dependency)) continue;
				const dependencyPath = resolveInstalledPackageDir(packageRequire, dependency);
				if (!dependencyPath) {
					throw new Error(
						`${dependency} (a dependency of ${name}) could not be resolved on the host for the sandbox. Run \`pnpm install\`.`,
					);
				}
				await visit(dependency, dependencyPath);
			}
		}

		found.push({ name, path: packagePath });
	}

	await visit(rootName, rootPath);
	return found;
}

/**
 * `pnpm pack` writes human-readable output; the tarball path is the last
 * `.tgz` filename it prints. Scrape it out in a forgiving way so minor
 * pnpm format changes don't break us.
 */
function parsePackFilename(stdout: string): string | null {
	const match = stdout.match(/([^\s/\\]+\.tgz)/g);
	return match ? match[match.length - 1] : null;
}

function parseVersionFromFilename(filename: string): string {
	const match = filename.match(/-(\d[^/]*)\.tgz$/);
	return match ? match[1] : 'unknown';
}
