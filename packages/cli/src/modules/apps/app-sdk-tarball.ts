import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { create as createTar } from 'tar';

/** Name the app template's `package.json` points at (`file:vendor/n8n-app-sdk.tgz`). */
export const APP_SDK_TARBALL_FILENAME = 'n8n-app-sdk.tgz';

/**
 * Packs `@n8n/app-sdk` (package.json + dist) as an npm-installable tarball. Fixed mtime
 * and sorted entries keep the bytes identical across processes, so the integrity hash in
 * an app's lockfile does not drift between builds.
 */
export async function buildAppSdkTarball(): Promise<Buffer> {
	const packageDir = path.dirname(require.resolve('@n8n/app-sdk/package.json'));
	const distEntries = await readdir(path.join(packageDir, 'dist'), {
		recursive: true,
		withFileTypes: true,
	});
	const distFiles = distEntries
		.filter((entry) => entry.isFile() && !entry.name.endsWith('.tsbuildinfo'))
		.map((entry) => path.relative(packageDir, path.join(entry.parentPath, entry.name)));

	const stream = createTar(
		{
			cwd: packageDir,
			gzip: { portable: true },
			portable: true,
			mtime: new Date(0),
			// npm expects every entry under `package/`.
			prefix: 'package',
			noDirRecurse: true,
		},
		['package.json', ...distFiles].sort(),
	);
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk);
	return Buffer.concat(chunks);
}

let cached: Promise<Buffer> | undefined;

export async function getAppSdkTarball(): Promise<Buffer> {
	cached ??= buildAppSdkTarball();
	return await cached;
}
