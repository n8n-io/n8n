// Builds the snapshot guest of one action bundle from the template of a guest build
// (`<guests>/action-snapshot.js`, see `scripts/sandbox.ts`): the bundle is inlined and evaluated
// during the Wizer snapshot, not in each instance. The output directory gets `action.wasm` and
// `action.wasm.sha256`, the digest that the sidecar checks.
// Usage: pnpm exec tsx scripts/snapshot-bundle.ts <guests> <bundle> <bundle-sha256> <out-dir> [componentize.js] [sdk sdk-sha256]
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type { SnapshotJob } from '../src/runtimes/wasm-snapshot';
import { SNAPSHOT_BUNDLE, SNAPSHOT_SDK, componentize, componentizeJsPath } from './sandbox';

const sha256Of = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

export interface SnapshotBuild {
	readonly guests: string;
	readonly bundleFile: string;
	readonly bundleSha256: string;
	readonly outDir: string;
	readonly componentizeJs?: string;
	/** The SDK runtime that the bundle pins. A self-contained bundle has none. */
	readonly sdk?: { readonly file: string; readonly sha256: string };
}

async function checkedText(file: string, sha256: string) {
	const code = await readFile(file, 'utf8');
	if (sha256Of(code) !== sha256) throw new Error(`${file} does not match its hash ${sha256}`);
	return code;
}

export async function snapshotBundle(build: SnapshotBuild) {
	const { guests, bundleFile, bundleSha256, outDir, componentizeJs, sdk } = build;
	const code = await checkedText(bundleFile, bundleSha256);
	const sdkCode = sdk ? await checkedText(sdk.file, sdk.sha256) : '';
	const template = await readFile(path.join(guests, 'action-snapshot.js'), 'utf8');
	if ([SNAPSHOT_BUNDLE, SNAPSHOT_SDK].some((name) => template.split(name).length !== 2)) {
		throw new Error(`The snapshot template must name ${SNAPSHOT_BUNDLE} and ${SNAPSHOT_SDK} once`);
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
			template
				.replace(SNAPSHOT_BUNDLE, () => JSON.stringify(code))
				.replace(SNAPSHOT_SDK, () => JSON.stringify(sdkCode)),
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
	return async ({ guests, bundleFile, bundleSha256, outDir, sdk }: SnapshotJob) => {
		await promisify(execFile)(
			process.execPath,
			[
				...['--import', 'tsx', __filename, guests, bundleFile, bundleSha256, outDir],
				await componentizeJs,
				...(sdk ? [sdk.file, sdk.sha256] : []),
			],
			{ cwd: path.resolve(__dirname, '..'), maxBuffer: 16 << 20, timeout: timeoutMs },
		);
	};
}

if (require.main === module) {
	const [guests, bundleFile, bundleSha256, outDir, componentizeJs, sdkFile, sdkSha256] =
		process.argv.slice(2);
	if (!guests || !bundleFile || !bundleSha256 || !outDir) {
		throw new Error(
			'Usage: snapshot-bundle.ts <guests> <bundle> <bundle-sha256> <out-dir> [componentize.js] [sdk sdk-sha256]',
		);
	}
	const sdk = sdkFile && sdkSha256 ? { file: sdkFile, sha256: sdkSha256 } : undefined;
	const started = performance.now();
	void snapshotBundle({ guests, bundleFile, bundleSha256, outDir, componentizeJs, sdk }).then(
		async () => {
			const { size } = await stat(path.join(outDir, 'action.wasm'));
			console.log(JSON.stringify({ ms: Math.round(performance.now() - started), bytes: size }));
		},
	);
}
