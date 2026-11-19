import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { jsonParse } from 'n8n-workflow';

import type { Logger } from '../src/logger';
import { packSnapshotWorkspacePackages } from '../src/workspace/pack-workspace-sdk';
import { buildSnapshotPackageJson } from '../src/workspace/sandbox-setup';

const execFileAsync = promisify(execFile);
const MAX_PACKED_BYTES = 10 * 1024 * 1024;

const logger: Logger = {
	info: (message, metadata) => console.log(message, metadata ?? ''),
	warn: (message, metadata) => console.warn(message, metadata ?? ''),
	error: (message, metadata) => console.error(message, metadata ?? ''),
	debug: () => {},
};

interface PackageLock {
	packages: Record<string, { resolved?: string; version?: string }>;
}

async function main() {
	const root = await mkdtemp(join(tmpdir(), 'n8n-snapshot-packages-'));
	try {
		const packages = await packSnapshotWorkspacePackages(logger);
		const tarballDir = join(root, '.n8n-packages');
		await mkdir(tarballDir);
		await Promise.all(
			packages.map(async ({ filename, tarball }) => {
				await writeFile(join(tarballDir, filename), tarball);
			}),
		);
		await writeFile(join(root, 'package.json'), buildSnapshotPackageJson(packages));

		console.log(`Installing ${packages.length} packed workspace packages in ${root}`);
		await execFileAsync(
			'npm',
			['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-online'],
			{ cwd: root, maxBuffer: 16 * 1024 * 1024 },
		);
		await execFileAsync(
			process.execPath,
			[
				'--input-type=module',
				'--eval',
				"import { workflow } from '@n8n/workflow-sdk'; workflow('snapshot-smoke', 'Snapshot smoke');",
			],
			{ cwd: root },
		);

		const packageLock = jsonParse<PackageLock>(
			await readFile(join(root, 'package-lock.json'), 'utf8'),
		);
		for (const { packageName, version } of packages) {
			for (const [path, entry] of Object.entries(packageLock.packages)) {
				if (
					(path === `node_modules/${packageName}` ||
						path.endsWith(`/node_modules/${packageName}`)) &&
					entry.resolved !== undefined &&
					!entry.resolved.startsWith('file:')
				) {
					throw new Error(`${packageName} resolved from a registry at ${path}`);
				}
			}

			const lockEntry = packageLock.packages[`node_modules/${packageName}`];
			if (!lockEntry) throw new Error(`${packageName} is missing from package-lock.json`);

			const installed = jsonParse<{ version?: string }>(
				await readFile(join(root, 'node_modules', packageName, 'package.json'), 'utf8'),
			);
			if (installed.version !== version) {
				throw new Error(
					`${packageName} installed ${installed.version ?? 'no version'} instead of ${version}`,
				);
			}
		}

		const packedBytes = packages.reduce((total, pkg) => total + pkg.tarball.byteLength, 0);
		if (packedBytes > MAX_PACKED_BYTES) {
			throw new Error(
				`Packed workspace packages use ${(packedBytes / 1024 / 1024).toFixed(2)} MiB, above the 10 MiB limit`,
			);
		}
		console.log(
			`Verified ${packages.length} local workspace packages (${(packedBytes / 1024 / 1024).toFixed(2)} MiB)`,
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
