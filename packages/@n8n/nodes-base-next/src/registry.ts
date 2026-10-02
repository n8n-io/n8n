import type { FrozenVersion } from '@n8n/node-sdk/host';
import { parseManifest } from '@n8n/node-sdk/registry';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** The bundled HEAD of each action, `<id>/`. The release build writes it (`pnpm freeze`). */
export const VERSIONS_DIR = path.resolve(__dirname, '..', 'dist', 'versions');

/** The bundled versions of an action: its HEAD. Other versions come from the registry. */
export function versionsOf(actionId: string, dir = VERSIONS_DIR): FrozenVersion[] {
	const files = path.join(dir, actionId);
	return [
		{
			manifest: parseManifest(readFileSync(path.join(files, 'manifest.json'), 'utf8')),
			readBundle: async () => await readFile(path.join(files, 'bundle.cjs'), 'utf8'),
		},
	];
}
