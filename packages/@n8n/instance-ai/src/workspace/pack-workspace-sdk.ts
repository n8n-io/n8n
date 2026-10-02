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
 * `@n8n/workflow-sdk`, `n8n-workflow`, and `@n8n/utils` are linked together:
 * packing only the SDK still leaves npm's copies of those deps in place, which
 * breaks when master is ahead of the registry (e.g. unreleased exports like
 * `@n8n/utils/sleep`).
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

/**
 * Packages installed into the sandbox when workspace linking is enabled. `@n8n/errors` is
 * linked because the workspace copy can gain exports before its version is bumped, and
 * `n8n-workflow` fails to load against the older published copy. Node contracts type-check
 * n8n expressions against `@n8n/expression-types`.
 */
export const SANDBOX_LINKED_WORKSPACE_PACKAGES = [
	'@n8n/errors',
	'@n8n/utils',
	'n8n-workflow',
	'@n8n/workflow-sdk',
	'@n8n/expression-types',
] as const;

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
): Promise<WorkspacePackageTarball | null> {
	const packagePath = resolvePackagePath(packageName);
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
 * Pack the host's copies of the packages linked into the sandbox. Throws when any
 * package could not be packed.
 */
export async function packHostSandboxPackages(logger: Logger): Promise<WorkspacePackageTarball[]> {
	const packed: WorkspacePackageTarball[] = [];
	for (const packageName of SANDBOX_LINKED_WORKSPACE_PACKAGES) {
		const tarball = await packWorkspacePackage(logger, packageName);
		if (!tarball) {
			throw new Error(
				`${packageName} could not be packed for the sandbox. Run \`pnpm build\` for packages/@n8n/utils, packages/workflow, packages/@n8n/workflow-sdk, and packages/@n8n/expression-types.`,
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
): Promise<WorkspaceSdkTarball | null> {
	if (!isLinkWorkspaceSdkEnabled()) return null;

	const packed = await packWorkspacePackage(logger, packageName);
	if (!packed) return null;

	return { ...packed, sdkPath: packed.packagePath };
}

/** A transitive dependency (such as `@n8n/errors`) resolves from the linked package that uses it. */
function resolvePackagePath(name: string): string | null {
	const direct = resolveInstalledPackageDir(hostRequire, name);
	if (direct) return direct;
	for (const linked of SANDBOX_LINKED_WORKSPACE_PACKAGES) {
		if (linked === name) continue;
		const linkedPath = resolveInstalledPackageDir(hostRequire, linked);
		const transitive =
			linkedPath &&
			resolveInstalledPackageDir(createRequire(path.join(linkedPath, 'package.json')), name);
		if (transitive) return transitive;
	}
	return null;
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
