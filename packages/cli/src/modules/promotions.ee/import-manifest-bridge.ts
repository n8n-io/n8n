import { jsonParse } from 'n8n-workflow';
import * as fs from 'node:fs/promises';
import path from 'node:path';

import { N8N_VERSION } from '@/constants';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import type { PackageRequirements } from '@/modules/n8n-packages/spec/requirements.schema';

/**
 * TEMPORARY bridge: import still inventories a directory package from
 * `manifest.json`. Apply writes that file after overlay.
 *
 * To drop this step: delete this file, its test, and the call in
 * `applySelection`.
 */

const SNAPSHOT_FILES = {
	'project.json': 'projects',
	'folder.json': 'folders',
	'workflow.json': 'workflows',
	'credential.json': 'credentials',
	'data-table.json': 'dataTables',
	'tag.json': 'tags',
} as const;

type SnapshotKind = (typeof SNAPSHOT_FILES)[keyof typeof SNAPSHOT_FILES];

export async function readLeftoverManifest(
	exportFolder: string,
): Promise<PackageManifest | undefined> {
	let raw: string;
	try {
		raw = await fs.readFile(path.join(exportFolder, MANIFEST_FILE), 'utf-8');
	} catch {
		return undefined;
	}
	try {
		const parsed = packageManifestSchema.safeParse(jsonParse(raw));
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}

/** Drop selected workflows from leftover requirement users before merging staging. */
function dropSelectedRequirementUsers(
	leftover: PackageManifest | undefined,
	selectedWorkflowIds: readonly string[],
): PackageManifest | undefined {
	if (leftover?.requirements === undefined || selectedWorkflowIds.length === 0) {
		return leftover;
	}

	const selected = new Set(selectedWorkflowIds);
	const requirements = compactRequirements({
		credentials: dropSelectedUsers(leftover.requirements.credentials, selected),
		dataTables: dropSelectedUsers(leftover.requirements.dataTables, selected),
		workflows: dropSelectedUsers(leftover.requirements.workflows, selected),
		variables: dropSelectedUsers(leftover.requirements.variables, selected),
		tags: dropSelectedUsers(leftover.requirements.tags, selected),
		nodeTypes: dropSelectedUsers(leftover.requirements.nodeTypes, selected),
	});

	return { ...leftover, ...(requirements ? { requirements } : { requirements: undefined }) };
}

function dropSelectedUsers<T extends { usedByWorkflows: string[] }>(
	rows: T[] | undefined,
	selectedWorkflowIds: Set<string>,
): T[] | undefined {
	if (rows === undefined) return undefined;
	const kept = rows
		.map((row) => ({
			...row,
			usedByWorkflows: row.usedByWorkflows.filter((id) => !selectedWorkflowIds.has(id)),
		}))
		.filter((row) => row.usedByWorkflows.length > 0);
	return kept.length > 0 ? kept : undefined;
}

export async function writeImportManifest(options: {
	exportFolder: string;
	staging: PackageManifest;
	sourceId: string;
	selectedWorkflowIds?: readonly string[];
}): Promise<void> {
	const { exportFolder, staging, sourceId, selectedWorkflowIds = [] } = options;
	const selected = [...selectedWorkflowIds, ...(staging.workflows ?? []).map((entry) => entry.id)];
	const leftover = dropSelectedRequirementUsers(await readLeftoverManifest(exportFolder), selected);
	const collections = await walkSnapshotCollections(exportFolder);
	const remainingWorkflowIds = new Set((collections.workflows ?? []).map((entry) => entry.id));
	const selectedSet = new Set(selected);
	const variables = await collectVariables(exportFolder, leftover, staging);

	const manifest = packageManifestSchema.parse({
		packageFormatVersion: '1',
		exportedAt: new Date().toISOString(),
		sourceN8nVersion: N8N_VERSION,
		sourceId,
		...collections,
		...(variables.length > 0 ? { variables } : {}),
		...requirementsBlock(leftover, staging, remainingWorkflowIds, selectedSet),
	});

	await fs.writeFile(path.join(exportFolder, MANIFEST_FILE), JSON.stringify(manifest, null, '\t'));
}

async function walkSnapshotCollections(
	exportFolder: string,
): Promise<Pick<PackageManifest, SnapshotKind>> {
	const state: Record<SnapshotKind, ManifestEntry[]> = {
		projects: [],
		folders: [],
		workflows: [],
		credentials: [],
		dataTables: [],
		tags: [],
	};

	const walk = async (absDir: string): Promise<void> => {
		const entries = await fs.readdir(absDir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(absDir, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
				continue;
			}
			if (!entry.isFile()) continue;
			const kind = SNAPSHOT_FILES[entry.name as keyof typeof SNAPSHOT_FILES];
			if (kind === undefined) continue;
			const relativeFile = path.relative(exportFolder, fullPath).split(path.sep).join('/');
			const target = path.posix.dirname(relativeFile);
			const item = await readIdNameFile(fullPath, target);
			if (item) state[kind].push(item);
		}
	};

	await walk(exportFolder);
	return {
		...(state.projects.length > 0 ? { projects: state.projects } : {}),
		...(state.folders.length > 0 ? { folders: state.folders } : {}),
		...(state.workflows.length > 0 ? { workflows: state.workflows } : {}),
		...(state.credentials.length > 0 ? { credentials: state.credentials } : {}),
		...(state.dataTables.length > 0 ? { dataTables: state.dataTables } : {}),
		...(state.tags.length > 0 ? { tags: state.tags } : {}),
	};
}

async function readIdNameFile(file: string, target: string): Promise<ManifestEntry | undefined> {
	let parsed: unknown;
	try {
		parsed = jsonParse(await fs.readFile(file, 'utf-8'));
	} catch {
		return undefined;
	}
	if (
		typeof parsed !== 'object' ||
		parsed === null ||
		typeof (parsed as { id?: unknown }).id !== 'string' ||
		typeof (parsed as { name?: unknown }).name !== 'string'
	) {
		return undefined;
	}
	return { id: (parsed as { id: string }).id, name: (parsed as { name: string }).name, target };
}

async function collectVariables(
	exportFolder: string,
	leftover: PackageManifest | undefined,
	staging: PackageManifest,
): Promise<ManifestEntry[]> {
	const byId = new Map<string, ManifestEntry>();
	for (const entry of leftover?.variables ?? []) {
		byId.set(entry.id, entry);
	}
	for (const entry of staging.variables ?? []) {
		byId.set(entry.id, entry);
	}

	const kept: ManifestEntry[] = [];
	for (const entry of byId.values()) {
		const file = resolveContainedFile(exportFolder, entry.target, 'variable.json');
		if (file === undefined) continue;
		try {
			const info = await fs.lstat(file);
			if (!info.isFile()) continue;
			kept.push(entry);
		} catch {
			continue;
		}
	}
	return kept;
}

/** Leftover targets are untrusted. Keep only a regular file inside the export. */
function resolveContainedFile(
	exportFolder: string,
	target: string,
	fileName: string,
): string | undefined {
	const segments = target.split(/[\\/]/).filter(Boolean);
	if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
		return undefined;
	}

	const resolvedBase = path.resolve(exportFolder);
	const resolvedDir = path.resolve(exportFolder, ...segments);
	if (resolvedDir !== resolvedBase && !resolvedDir.startsWith(resolvedBase + path.sep)) {
		return undefined;
	}
	return path.join(resolvedDir, fileName);
}

function requirementsBlock(
	leftover: PackageManifest | undefined,
	staging: PackageManifest,
	remainingWorkflowIds: Set<string>,
	selectedWorkflowIds: Set<string>,
): Pick<PackageManifest, 'requirements'> {
	const requirements = compactRequirements({
		credentials: mergeRequirementRows(
			leftover?.requirements?.credentials,
			staging.requirements?.credentials,
			remainingWorkflowIds,
			selectedWorkflowIds,
			(row) => row.id,
		),
		dataTables: mergeRequirementRows(
			leftover?.requirements?.dataTables,
			staging.requirements?.dataTables,
			remainingWorkflowIds,
			selectedWorkflowIds,
			(row) => row.id,
		),
		workflows: mergeRequirementRows(
			leftover?.requirements?.workflows,
			staging.requirements?.workflows,
			remainingWorkflowIds,
			selectedWorkflowIds,
			(row) => row.id,
		),
		variables: mergeRequirementRows(
			leftover?.requirements?.variables,
			staging.requirements?.variables,
			remainingWorkflowIds,
			selectedWorkflowIds,
			(row) => row.name,
		),
		tags: mergeRequirementRows(
			leftover?.requirements?.tags,
			staging.requirements?.tags,
			remainingWorkflowIds,
			selectedWorkflowIds,
			(row) => row.id,
		),
		nodeTypes: mergeRequirementRows(
			leftover?.requirements?.nodeTypes,
			staging.requirements?.nodeTypes,
			remainingWorkflowIds,
			selectedWorkflowIds,
			(row) => `${row.type}@${row.typeVersion}`,
		),
	});
	return requirements ? { requirements } : {};
}

function mergeRequirementRows<T extends { usedByWorkflows: string[] }>(
	leftover: T[] | undefined,
	staging: T[] | undefined,
	remainingWorkflowIds: Set<string>,
	selectedWorkflowIds: Set<string>,
	keyOf: (row: T) => string,
): T[] | undefined {
	const byKey = new Map<string, T>();
	for (const row of leftover ?? []) {
		const usedByWorkflows = remainingUsers(
			row.usedByWorkflows.filter((id) => !selectedWorkflowIds.has(id)),
			remainingWorkflowIds,
		);
		if (usedByWorkflows.length === 0) continue;
		byKey.set(keyOf(row), { ...row, usedByWorkflows });
	}
	for (const row of staging ?? []) {
		const key = keyOf(row);
		const usedByWorkflows = remainingUsers(
			[...(byKey.get(key)?.usedByWorkflows ?? []), ...row.usedByWorkflows],
			remainingWorkflowIds,
		);
		if (usedByWorkflows.length === 0) {
			byKey.delete(key);
			continue;
		}
		byKey.set(key, { ...row, usedByWorkflows });
	}
	const rows = [...byKey.values()];
	return rows.length > 0 ? rows : undefined;
}

function remainingUsers(ids: string[], remainingWorkflowIds: Set<string>): string[] {
	return [...new Set(ids.filter((id) => remainingWorkflowIds.has(id)))].sort();
}

function compactRequirements(input: {
	credentials: PackageRequirements['credentials'];
	dataTables: PackageRequirements['dataTables'];
	workflows: PackageRequirements['workflows'];
	variables: PackageRequirements['variables'];
	tags: PackageRequirements['tags'];
	nodeTypes: PackageRequirements['nodeTypes'];
}): PackageRequirements | undefined {
	const { credentials, dataTables, workflows, variables, tags, nodeTypes } = input;
	const requirements: PackageRequirements = {
		...(credentials?.length ? { credentials } : {}),
		...(dataTables?.length ? { dataTables } : {}),
		...(workflows?.length ? { workflows } : {}),
		...(variables?.length ? { variables } : {}),
		...(tags?.length ? { tags } : {}),
		...(nodeTypes?.length ? { nodeTypes } : {}),
	};
	return Object.keys(requirements).length > 0 ? requirements : undefined;
}
