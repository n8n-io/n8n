import type { FrozenVersion } from '@n8n/node-sdk/host';
import { parseCredentialManifest, parseManifest } from '@n8n/node-sdk/registry';
import { readdirSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** The bundled HEAD of each action, `<id>/`. The release build writes it (`pnpm freeze`). */
export const VERSIONS_DIR = path.resolve(__dirname, '..', 'dist', 'versions');

/** The folder of the credential manifests. Action ids have dots, so no action has this id. */
const CREDENTIALS = 'credentials';

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

/** The ids of the bundled actions, triggers and providers. */
export const bundledIdsOf = (dir = VERSIONS_DIR) =>
	readdirSync(dir).filter((name) => name !== CREDENTIALS);

/** The bundled credential manifests, with the file each one comes from. */
export const bundledCredentialsOf = (dir = VERSIONS_DIR) =>
	readdirSync(path.join(dir, CREDENTIALS)).map((id) => {
		const file = path.join(dir, CREDENTIALS, id, 'manifest.json');
		return { file, manifest: parseCredentialManifest(readFileSync(file, 'utf8')) };
	});
