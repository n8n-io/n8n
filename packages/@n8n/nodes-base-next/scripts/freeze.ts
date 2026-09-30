import { freezeAction } from '@n8n/node-sdk/freeze';
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { actions } from '../src/index';
import { VERSIONS_DIR, versionsOf } from '../src/registry';

const NODES_DIR = path.resolve(__dirname, '..', 'src', 'nodes');

/** Freezes each action that a module under `src/nodes` exports. */
export async function freezeAll(outDir: string) {
	const files = readdirSync(NODES_DIR, { recursive: true, encoding: 'utf8' }).filter(
		(file) => file.endsWith('.ts') && !file.endsWith('.node.ts'),
	);
	const entries = await Promise.all(
		files.map(async (file) => {
			const entry = path.join(NODES_DIR, file);
			const module: unknown = await import(entry);
			const exported = typeof module === 'object' && module !== null ? Object.entries(module) : [];
			return exported
				.filter(([, value]) => actions.some((action) => action === value))
				.map(([name]) => ({ entry, name }));
		}),
	);
	return await Promise.all(
		entries.flat().map(async ({ entry, name }) => await freezeAction(entry, name, outDir)),
	);
}

/** `lock.json` lists every frozen version with its hashes, for review and drift checks. */
export function writeLock(dir: string) {
	const ids = readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	const lock = Object.fromEntries(
		ids.flatMap((id) =>
			versionsOf(id, dir)
				.map(({ manifest }) => manifest)
				.sort((a, b) => a.version - b.version)
				.map(({ version, abi, bundleHash, contractHash }) => [
					`${id}@${version}`,
					{ abi, bundleHash, contractHash },
				]),
		),
	);
	writeFileSync(path.join(dir, 'lock.json'), `${JSON.stringify(lock, null, '\t')}\n`);
}

if (require.main === module) {
	void freezeAll(VERSIONS_DIR).then(() => writeLock(VERSIONS_DIR));
}
