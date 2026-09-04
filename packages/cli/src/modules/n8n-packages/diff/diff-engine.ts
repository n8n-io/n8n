import { createHash } from 'node:crypto';

export interface Snapshot {
	path: string;
	hash: string;
}

export type SideMap = Map<string, Snapshot>;

export type ChangeStatus = 'created' | 'deleted' | 'modified';
export type InternalChangeStatus = ChangeStatus | 'moved' | 'moved+modified';

export interface DiffEntry {
	id: string;
	status: ChangeStatus;
	internalStatus: InternalChangeStatus;
	basePath?: string;
	desiredPath?: string;
}

// generateNanoId() always yields 16 alphanumeric characters, so the id is the
// fixed-width tail of `<slug>-<id>.json` and the parse is exact.
const ID_LENGTH = 16;

export function parseIdFromPath(path: string): string {
	const withoutExt = path.endsWith('.json') ? path.slice(0, -'.json'.length) : path;
	return withoutExt.slice(-ID_LENGTH);
}

export function gitBlobHash(content: string): string {
	const bytes = Buffer.from(content, 'utf-8');
	const header = Buffer.from(`blob ${bytes.length}\0`, 'utf-8');
	return createHash('sha1')
		.update(Buffer.concat([header, bytes]))
		.digest('hex');
}

export function parseLsTree(lsTreeOutput: string): SideMap {
	const base: SideMap = new Map();
	for (const line of lsTreeOutput.split('\n').filter(Boolean)) {
		const [meta, path] = line.split('\t');
		const hash = meta.split(' ')[2];
		base.set(parseIdFromPath(path), { path, hash });
	}
	return base;
}

export function diffSnapshots(base: SideMap, desired: SideMap): DiffEntry[] {
	const results: DiffEntry[] = [];

	for (const [id, d] of desired) {
		const b = base.get(id);
		if (!b) {
			results.push({ id, status: 'created', internalStatus: 'created', desiredPath: d.path });
			continue;
		}

		const hashSame = b.hash === d.hash;
		const pathSame = b.path === d.path;
		if (hashSame && pathSame) continue;

		const internalStatus: InternalChangeStatus = hashSame
			? 'moved'
			: pathSame
				? 'modified'
				: 'moved+modified';
		// The UI has no distinct "Moved" badge yet, so moved folds into modified
		// externally while internalStatus keeps the real classification.
		results.push({
			id,
			status: 'modified',
			internalStatus,
			basePath: b.path,
			desiredPath: d.path,
		});
	}

	for (const [id, b] of base) {
		if (!desired.has(id)) {
			results.push({ id, status: 'deleted', internalStatus: 'deleted', basePath: b.path });
		}
	}

	return results;
}
