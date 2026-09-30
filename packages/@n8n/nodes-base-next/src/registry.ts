import { parseManifest, type FrozenVersion } from '@n8n/node-sdk';
import { readdirSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Frozen action versions, `<id>/<version>/`. `pnpm freeze` writes them. */
export const VERSIONS_DIR = path.resolve(__dirname, '..', 'versions');

export const versionsOf = (actionId: string, dir = VERSIONS_DIR): FrozenVersion[] =>
	readdirSync(path.join(dir, actionId))
		.filter((version) => /^\d+$/.test(version))
		.map((version) => {
			const files = path.join(dir, actionId, version);
			return {
				manifest: parseManifest(readFileSync(path.join(files, 'manifest.json'), 'utf8')),
				readBundle: async () => await readFile(path.join(files, 'bundle.cjs'), 'utf8'),
			};
		});
