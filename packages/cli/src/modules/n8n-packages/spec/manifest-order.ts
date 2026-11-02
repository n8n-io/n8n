import type { ManifestEntry, PackageManifest } from './manifest.schema';
import type { PackageRequirementConsumer, PackageRequirements } from './requirements.schema';

/** Compares by code unit, so the order does not depend on the locale of the process. */
function compare(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function sorted<T>(
	rows: T[] | undefined,
	compareRows: (a: NoInfer<T>, b: NoInfer<T>) => number,
): T[] | undefined {
	return rows?.toSorted(compareRows);
}

const byId = (a: { id: string }, b: { id: string }) => compare(a.id, b.id);

/** Parents first: a parent folder has a shorter target than the folders in it. Then by id. */
const byDepthThenId = (a: ManifestEntry, b: ManifestEntry) =>
	a.target.split('/').length - b.target.split('/').length || byId(a, b);

const byConsumer = (a: PackageRequirementConsumer, b: PackageRequirementConsumer) =>
	compare(a.kind, b.kind) || compare(a.id, b.id);

function withSortedConsumers<T extends { usedBy: PackageRequirementConsumer[] }>(row: T): T {
	return { ...row, usedBy: row.usedBy.toSorted(byConsumer) };
}

function sortRows<T extends { usedBy: PackageRequirementConsumer[] }>(
	rows: T[] | undefined,
	keyOf: (row: NoInfer<T>) => string,
): T[] | undefined {
	return rows
		?.map((row) => withSortedConsumers(row))
		.toSorted((a, b) => compare(keyOf(a), keyOf(b)));
}

function sortRequirements(requirements: PackageRequirements): PackageRequirements {
	const id = ({ id }: { id: string }) => id;
	return {
		...requirements,
		credentials: sortRows(requirements.credentials, id),
		dataTables: sortRows(requirements.dataTables, id),
		workflows: sortRows(requirements.workflows, id),
		agents: sortRows(requirements.agents, id),
		variables: sortRows(requirements.variables, ({ name }) => name),
		tags: sortRows(requirements.tags, id),
		nodeTypes: sortRows(
			requirements.nodeTypes,
			({ type, typeVersion }) => `${type}@${typeVersion}`,
		),
	};
}

/**
 * Puts the entries of a manifest in a fixed order, by id. A new entry then lands at a position
 * that depends on its id, and two merge requests that each add an entry to a package on a
 * branch rarely change the same lines. Without it, a new entry goes to the end of its list, and
 * two such merge requests always conflict.
 */
export function sortManifest(manifest: PackageManifest): PackageManifest {
	const { requirements } = manifest;
	return {
		...manifest,
		projects: sorted(manifest.projects, byId),
		folders: sorted(manifest.folders, byDepthThenId),
		workflows: sorted(manifest.workflows, byId),
		credentials: sorted(manifest.credentials, byId),
		dataTables: sorted(manifest.dataTables, byId),
		variables: sorted(manifest.variables, byId),
		tags: sorted(manifest.tags, byId),
		...(requirements ? { requirements: sortRequirements(requirements) } : {}),
	};
}
