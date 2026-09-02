import { jsonParse, UserError } from 'n8n-workflow';
import path from 'node:path';
import { z } from 'zod';

import type { PackageReader } from '../io/package-reader';
import { ENTITY_FILES, ENTITY_KINDS } from '../spec/constants';
import type { EntityKind } from '../spec/constants';
import type { ManifestEntry } from '../spec/manifest.schema';

export type PackageEntries = { [K in EntityKind]: ManifestEntry[] };

const KIND_BY_FILE = new Map<string, EntityKind>(
	ENTITY_KINDS.map((kind) => [ENTITY_FILES[kind], kind]),
);

/**
 * Every entity file carries its name and its id, except a variable: the format
 * excludes the variable id on purpose, because `$vars.<name>` resolves by name
 * and one directory holds one variable per name.
 */
const identitySchema = z.object({ id: z.string().min(1).optional(), name: z.string().min(1) });

/** Read at most this many entity files at once. */
const READ_BATCH_SIZE = 32;

/**
 * The entries of a package, derived from its files rather than its manifest.
 *
 * The manifest lists the same entries, but it is a separate statement that can
 * disagree with the files. A caller that reconciles a package with something
 * else — a Git branch, another package — needs what the files actually say.
 *
 * A variable takes its directory as its id, because the file carries none.
 */
export async function readPackageEntries(reader: PackageReader): Promise<PackageEntries> {
	const entries: PackageEntries = {
		projects: [],
		folders: [],
		workflows: [],
		credentials: [],
		dataTables: [],
		variables: [],
		tags: [],
	};

	const files = (await reader.listEntries()).flatMap((file) => {
		const kind = KIND_BY_FILE.get(path.posix.basename(file));
		const target = path.posix.dirname(file);
		return kind && target !== '.' ? [{ kind, file, target }] : [];
	});

	const read = async ({ kind, file, target }: (typeof files)[number]) => {
		const identity = identitySchema.safeParse(
			jsonParse<unknown>((await reader.readFile(file)).toString('utf-8'), { fallbackValue: null }),
		);
		const id = identity.success ? (identity.data.id ?? (kind === 'variables' ? target : '')) : '';
		if (!identity.success || !id) {
			throw new UserError(`Package holds an entity without an id or a name at "${target}".`);
		}
		entries[kind].push({ id, name: identity.data.name, target });
	};

	for (let i = 0; i < files.length; i += READ_BATCH_SIZE) {
		await Promise.all(files.slice(i, i + READ_BATCH_SIZE).map(read));
	}

	// Sort by target, so the same package always yields the same order.
	for (const kind of ENTITY_KINDS) {
		entries[kind].sort((a, b) => a.target.localeCompare(b.target));
	}

	return entries;
}
