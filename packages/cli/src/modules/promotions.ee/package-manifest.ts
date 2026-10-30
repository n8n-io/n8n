import { BadRequestError } from '@n8n/errors';

import { N8N_VERSION } from '@/constants';
import { FORMAT_VERSION } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { BlobCache } from './blob-cache';
import { deriveLists, packageRoot, readDerivedLists, type ReadSource } from './branch-manifest';
import {
	joinWorkflowRequirements,
	parseWorkflowRequirements,
	workflowRequirementsPath,
	type WorkflowRequirements,
} from './workflow-requirements';

/** Where the package on a branch comes from. It has no manifest that names its source. */
export const BRANCH_PACKAGE_SOURCE_ID = 'promotion-branch';

/**
 * The manifest of a package that a branch holds. The branch has no `manifest.json`: the lists
 * come from the entity files, the requirements from the file of each workflow, and the header is
 * filled in here. A `manifest.json` that an older branch still holds is not read.
 * `files` are package-relative paths with their content.
 */
export function manifestFromFiles(
	files: Iterable<[path: string, content: string | Buffer]>,
): PackageManifest {
	const entries = [...files];
	const lists = deriveLists(entries);

	const contents = new Map(entries);
	const byWorkflow = new Map<string, WorkflowRequirements>();
	for (const { id, target } of lists.workflows ?? []) {
		const path = workflowRequirementsPath(target);
		const raw = contents.get(path);
		if (raw === undefined) continue;
		const requirements = parseWorkflowRequirements(raw);
		if (!requirements) {
			throw new BadRequestError(`The requirements file "${path}" in the package is not valid`);
		}
		byWorkflow.set(id, requirements);
	}
	const requirements = joinWorkflowRequirements(byWorkflow);

	return withHeader(lists, requirements);
}

function withHeader(
	lists: ReturnType<typeof deriveLists>,
	requirements: PackageManifest['requirements'],
): PackageManifest {
	return {
		packageFormatVersion: FORMAT_VERSION,
		sourceN8nVersion: N8N_VERSION,
		sourceId: BRANCH_PACKAGE_SOURCE_ID,
		...lists,
		...(requirements ? { requirements } : {}),
	};
}

const READ_CHUNK_SIZE = 100;

/** What each requirements file said, by the Git blob SHA of the file. */
const requirementsCache = new BlobCache<WorkflowRequirements>(50_000);

/**
 * The manifest of a package at one commit, built like {@link manifestFromFiles} from a listing
 * and a way to read files. `null` when a requirements file is not valid. The requirements of a
 * workflow are read only when `readsContentOf` accepts its workflow file.
 */
export async function readBranchManifest(source: ReadSource): Promise<PackageManifest | null> {
	const root = packageRoot(source.prefix);
	const paths = [...source.paths];
	const present = new Set(paths);
	const lists = await readDerivedLists({ ...source, paths });

	const byWorkflow = new Map<string, WorkflowRequirements>();
	const toRead: Array<{ id: string; file: string }> = [];
	for (const { id, target } of lists.workflows ?? []) {
		const file = `${root}${workflowRequirementsPath(target)}`;
		if (!present.has(file)) continue;
		if (source.readsContentOf && !source.readsContentOf(`${root}${target}/workflow.json`)) continue;
		const cached = requirementsCache.get(source.blobShaByPath?.get(file));
		if (cached) byWorkflow.set(id, cached);
		else toRead.push({ id, file });
	}
	for (let start = 0; start < toRead.length; start += READ_CHUNK_SIZE) {
		const chunk = toRead.slice(start, start + READ_CHUNK_SIZE);
		const contents = await source.readFiles(chunk.map(({ file }) => file));
		for (const { id, file } of chunk) {
			const requirements = parseWorkflowRequirements(contents.get(file));
			if (!requirements) return null;
			byWorkflow.set(id, requirements);
			requirementsCache.set(source.blobShaByPath?.get(file), requirements);
		}
	}
	return withHeader(lists, joinWorkflowRequirements(byWorkflow));
}
