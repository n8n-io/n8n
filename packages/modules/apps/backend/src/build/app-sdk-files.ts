import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { AppFiles } from '../storage/app-version-stores';

let cached: Promise<AppFiles> | undefined;

async function load(): Promise<AppFiles> {
	const root = path.dirname(require.resolve('@n8n/app-sdk/package.json'));
	const files = new Map([['package.json', await readFile(path.join(root, 'package.json'))]]);
	for (const name of await readdir(path.join(root, 'dist'))) {
		if (!/\.(js|d\.ts)$/.test(name)) continue;
		files.set(`dist/${name}`, await readFile(path.join(root, 'dist', name)));
	}
	return files;
}

/**
 * The built `@n8n/app-sdk` of this instance. Each app build installs it, so the
 * SDK in a bundle always matches the API of the instance that built it.
 */
export async function loadAppSdkFiles(): Promise<AppFiles> {
	cached ??= load().catch((error: unknown) => {
		cached = undefined;
		throw error;
	});
	return await cached;
}
