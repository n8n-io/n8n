/**
 * Host-side helper for injecting the workspace `@n8n/workflow-sdk` into a
 * remote Daytona / n8n-sandbox sandbox during local development.
 *
 * Opt-in via `N8N_INSTANCE_AI_SANDBOX_LINK_SDK=1`. Production sandboxes
 * continue to install the registry-pinned version from `PACKAGE_JSON`.
 *
 * Why this exists: remote sandboxes have no line-of-sight to the dev's
 * monorepo. When a dev rebuilds the SDK locally, the sandbox still runs
 * whatever version is on npm. This packs the workspace SDK into a tarball
 * on the host so the sandbox can `npm install` it post-creation and
 * override the registry copy.
 *
 * We use `pnpm pack` (not `npm pack`) because the workspace `package.json`
 * uses pnpm protocols (`workspace:*`, `catalog:`) that npm can't resolve;
 * pnpm rewrites those to concrete semver during packing.
 */

import { execFile } from 'node:child_process';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { Logger } from '../logger';

const hostRequire = createRequire(__filename);
const execFileAsync = promisify(execFile);

const ENV_FLAG = 'N8N_INSTANCE_AI_SANDBOX_LINK_SDK';

export interface WorkspaceSdkTarball {
	/** Raw tarball bytes, ready to upload to the sandbox. */
	tarball: Buffer;
	/** Version packed (post-rewrite). Useful for logs. */
	version: string;
	/** Basename of the packed archive (e.g. `n8n-workflow-sdk-0.11.2.tgz`). */
	filename: string;
	/** Absolute path of the packed package on the host. */
	sdkPath: string;
}

export function isLinkWorkspaceSdkEnabled(): boolean {
	const v = process.env[ENV_FLAG];
	return v === '1' || v === 'true';
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

	const sdkPath = resolvePackagePath(packageName);
	if (!sdkPath) {
		logger.warn(
			`${ENV_FLAG} is set but ${packageName} could not be resolved on the host — skipping SDK link`,
		);
		return null;
	}

	// Sanity check: dist/ must exist, otherwise the tarball would ship stale
	// or empty bytes. Fail loudly so the dev knows they need to `pnpm build`.
	const distPath = path.join(sdkPath, 'dist');
	try {
		await stat(distPath);
	} catch {
		logger.warn(
			`${ENV_FLAG} is set but ${packageName}/dist is missing — run \`pnpm build\` in ${sdkPath} first. Skipping SDK link.`,
		);
		return null;
	}

	const tmpDir = await mkdtemp(path.join(tmpdir(), 'n8n-sdk-pack-'));
	try {
		const { stdout } = await execFileAsync('pnpm', ['pack', '--pack-destination', tmpDir], {
			cwd: sdkPath,
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

		logger.info('Packed workspace SDK for sandbox link', {
			package: packageName,
			version,
			bytes: tarball.byteLength,
			sdkPath,
		});

		return { tarball, version, filename, sdkPath };
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
}

function resolvePackagePath(name: string): string | null {
	try {
		const pkgJsonPath = hostRequire.resolve(`${name}/package.json`);
		return path.dirname(pkgJsonPath);
	} catch {
		return null;
	}
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
