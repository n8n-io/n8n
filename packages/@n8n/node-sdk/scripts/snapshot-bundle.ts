// Builds the snapshot guest of one action bundle from the template of a guest build
// (`<guests>/action-snapshot.js`, see `scripts/sandbox.ts`): the bundle is inlined and evaluated
// during the Wizer snapshot, not in each instance. The output directory gets `action.wasm` and
// `action.wasm.sha256`, the digest that the sidecar checks.
// Usage: pnpm exec tsx scripts/snapshot-bundle.ts <guests> <bundle> <bundle-sha256> <out-dir> [componentize.js]
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type { SnapshotJob } from '../src/runtimes/wasm-snapshot';
import { SNAPSHOT_BUNDLE, componentize, componentizeJsPath } from './sandbox';

const sha256Of = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

export interface SnapshotBuild {
	readonly guests: string;
	readonly bundleFile: string;
	readonly bundleSha256: string;
	readonly outDir: string;
	readonly componentizeJs?: string;
}

export async function snapshotBundle(build: SnapshotBuild) {
	const { guests, bundleFile, bundleSha256, outDir, componentizeJs } = build;
	const code = await readFile(bundleFile, 'utf8');
	if (sha256Of(code) !== bundleSha256) {
		throw new Error(`${bundleFile} does not match its hash ${bundleSha256}`);
	}
	const template = await readFile(path.join(guests, 'action-snapshot.js'), 'utf8');
	if (template.split(SNAPSHOT_BUNDLE).length !== 2) {
		throw new Error(`The snapshot template must name ${SNAPSHOT_BUNDLE} once`);
	}
	const partial = `${outDir}.${randomUUID()}.partial`;
	await mkdir(partial, { recursive: true, mode: 0o700 });
	try {
		// ComponentizeJS gives Wizer the directory of the guest, or the working directory when the
		// guest is in it. Wizer does not follow a symlink out of that directory.
		const guest = path.join(await realpath(partial), 'action.js');
		// A function, so a `$` in the bundle is no replacement pattern.
		await writeFile(
			guest,
			template.replace(SNAPSHOT_BUNDLE, () => JSON.stringify(code)),
		);
		const out = path.join(partial, 'action.wasm');
		await componentize({
			kind: 'action',
			guest,
			wit: path.join(guests, 'wit'),
			out,
			componentizeJs,
		});
		await writeFile(`${out}.sha256`, sha256Of(await readFile(out)));
		// Another process can build the same snapshot at the same time. Its copy is as good.
		await rename(partial, outDir).catch((error: unknown) => {
			if (!existsSync(path.join(outDir, 'action.wasm.sha256'))) throw error;
		});
	} finally {
		await rm(partial, { recursive: true, force: true });
	}
}

/**
 * A snapshot builder for `wasmSnapshotRuntime` in development: each build runs this script in a
 * child process, because ComponentizeJS blocks its event loop while Wizer runs.
 */
export function childProcessSnapshotBuilder({ timeoutMs = 300_000 } = {}) {
	const componentizeJs = componentizeJsPath();
	return async ({ guests, bundleFile, bundleSha256, outDir }: SnapshotJob) => {
		await promisify(execFile)(
			process.execPath,
			[
				...['--import', 'tsx', __filename, guests, bundleFile, bundleSha256, outDir],
				await componentizeJs,
			],
			{ cwd: path.resolve(__dirname, '..'), maxBuffer: 16 << 20, timeout: timeoutMs },
		);
	};
}

if (require.main === module) {
	const [guests, bundleFile, bundleSha256, outDir, componentizeJs] = process.argv.slice(2);
	if (!guests || !bundleFile || !bundleSha256 || !outDir) {
		throw new Error(
			'Usage: snapshot-bundle.ts <guests> <bundle> <bundle-sha256> <out-dir> [componentize.js]',
		);
	}
	const started = performance.now();
	void snapshotBundle({ guests, bundleFile, bundleSha256, outDir, componentizeJs }).then(
		async () => {
			const { size } = await stat(path.join(outDir, 'action.wasm'));
			console.log(JSON.stringify({ ms: Math.round(performance.now() - started), bytes: size }));
		},
	);
}
