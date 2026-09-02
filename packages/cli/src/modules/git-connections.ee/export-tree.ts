import { jsonParse, UserError } from 'n8n-workflow';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import type { ManifestEntry } from '@/modules/n8n-packages/spec/manifest.schema';

import type { BranchState } from './manifest-merge';

/** The file that marks a directory as one exported entity of that kind. */
const MARKER_FILES = {
	projects: 'project.json',
	folders: 'folder.json',
	workflows: 'workflow.json',
	credentials: 'credential.json',
	dataTables: 'data-table.json',
	variables: 'variable.json',
	tags: 'tag.json',
} as const;

type EntryKind = keyof typeof MARKER_FILES;

const KIND_BY_MARKER = new Map<string, EntryKind>(
	Object.entries(MARKER_FILES).map(([kind, file]) => [file, kind as EntryKind]),
);

/**
 * Every entity file carries its name and its id, except a variable: the
 * package format excludes the variable id on purpose, because `$vars.<name>`
 * resolves by name and one directory holds one variable per name. A variable
 * is therefore identified by its directory.
 */
const identitySchema = z.object({ id: z.string().min(1).optional(), name: z.string().min(1) });

/** Read at most this many entity files at once, to stay under the fd limit. */
const READ_BATCH_SIZE = 32;

/**
 * Read the entries of an exported working copy from the directories on disk.
 *
 * The branch also carries a `manifest.json` that lists the same entries, but
 * that file is a merge-conflict magnet and is on its way out. The tree is what
 * a pull actually reads, so a push reconciles against the tree and treats the
 * manifest as an output.
 */
export async function readExportTree(exportFolder: string): Promise<BranchState> {
	const markers: Array<{ kind: EntryKind; file: string; target: string }> = [];

	const walk = async (dir: string): Promise<void> => {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			// An export never writes a symbolic link. Following one would read a
			// file outside the working copy.
			if (entry.isSymbolicLink()) continue;

			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
				continue;
			}

			const kind = entry.isFile() ? KIND_BY_MARKER.get(entry.name) : undefined;
			const target = path.relative(exportFolder, dir).split(path.sep).join('/');
			if (kind && target) markers.push({ kind, file: full, target });
		}
	};
	await walk(exportFolder);

	const state: { [K in EntryKind]: ManifestEntry[] } = {
		projects: [],
		folders: [],
		workflows: [],
		credentials: [],
		dataTables: [],
		variables: [],
		tags: [],
	};

	const read = async ({ kind, file, target }: (typeof markers)[number]) => {
		const raw = jsonParse<unknown>(await readFile(file, 'utf-8'), { fallbackValue: null });
		const identity = identitySchema.safeParse(raw);
		// A variable is the only kind without an id, so its directory is its id.
		const id = identity.success ? (identity.data.id ?? (kind === 'variables' ? target : '')) : '';
		if (!identity.success || !id) {
			throw new UserError(
				`The branch holds an unreadable export file at "${target}". Push the whole project to repair the branch.`,
			);
		}
		state[kind].push({ id, name: identity.data.name, target });
	};

	for (let i = 0; i < markers.length; i += READ_BATCH_SIZE) {
		await Promise.all(markers.slice(i, i + READ_BATCH_SIZE).map(read));
	}

	// Sort by target so a regenerated manifest keeps a stable order and two
	// pushes of the same tree produce the same file.
	for (const entries of Object.values(state)) {
		entries.sort((a, b) => a.target.localeCompare(b.target));
	}

	return state;
}
