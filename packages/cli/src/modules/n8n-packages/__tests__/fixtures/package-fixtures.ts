import { randomCredentialPayload, type CredentialPayload } from '@n8n/backend-test-utils';

import { TarPackageWriter } from '../../io/tar/tar-package-writer';
import { FORMAT_VERSION } from '../../spec/constants';
import type { PackageManifest } from '../../spec/manifest.schema';
import type {
	PackageCredentialRequirement,
	PackageDataTableRequirement,
} from '../../spec/requirements.schema';
import type { SerializedDataTable } from '../../spec/serialized/data-table.schema';
import type { SerializedFolder } from '../../spec/serialized/folder.schema';
import type { SerializedProject } from '../../spec/serialized/project.schema';
import type { SerializedWorkflow } from '../../spec/serialized/workflow.schema';
import { streamToBuffer } from '../utils/tar-support';

/** Credential type used in package import integration tests (matches `randomCredentialPayload` default). */
export const PACKAGE_GITHUB_CREDENTIAL_TYPE = 'githubApi';

export function githubCredentialPayload(
	overrides: Partial<CredentialPayload> = {},
): CredentialPayload {
	return {
		...randomCredentialPayload({ type: PACKAGE_GITHUB_CREDENTIAL_TYPE }),
		...overrides,
	};
}

export function serializedWorkflow(
	overrides: Partial<SerializedWorkflow> = {},
): SerializedWorkflow {
	return {
		id: 'wf-id',
		name: 'Workflow',
		nodes: [
			{
				id: 'manual-trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		versionId: 'wire-version-id',
		parentFolderId: null,
		isPublished: false,
		isArchived: false,
		...overrides,
	};
}

export function serializedWorkflowWithCredential(options: {
	id: string;
	name: string;
	credentialId: string;
	credentialName: string;
	credentialType?: string;
}): SerializedWorkflow {
	const credentialType = options.credentialType ?? PACKAGE_GITHUB_CREDENTIAL_TYPE;

	return serializedWorkflow({
		id: options.id,
		name: options.name,
		nodes: [
			{
				id: 'http-node',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: {
					[credentialType]: { id: options.credentialId, name: options.credentialName },
				},
			},
		],
	});
}

/** Builds manifest credential requirements from workflow node refs (simulates export). */
export function credentialRequirementsFromWorkflows(
	workflows: SerializedWorkflow[],
): PackageCredentialRequirement[] {
	const byId = new Map<string, PackageCredentialRequirement>();

	for (const workflow of workflows) {
		for (const node of workflow.nodes) {
			if (!node.credentials) continue;

			for (const [credentialType, details] of Object.entries(node.credentials)) {
				if (details.id === null) continue;

				const existing = byId.get(details.id);
				if (existing) {
					if (!existing.usedByWorkflows.includes(workflow.id)) {
						existing.usedByWorkflows.push(workflow.id);
					}
					continue;
				}

				byId.set(details.id, {
					id: details.id,
					name: details.name,
					type: credentialType,
					usedByWorkflows: [workflow.id],
				});
			}
		}
	}

	return [...byId.values()];
}

export async function buildImportPackageBuffer(
	workflows: SerializedWorkflow[],
	options: {
		manifestExtras?: Partial<PackageManifest>;
		sourceId?: string;
	} = {},
): Promise<Buffer> {
	const writer = new TarPackageWriter();
	const sourceId = options.sourceId ?? 'integration-test-source';

	const manifest: PackageManifest = {
		packageFormatVersion: FORMAT_VERSION,
		exportedAt: new Date().toISOString(),
		sourceN8nVersion: '1.0.0',
		sourceId,
		workflows: workflows.map((w, idx) => ({
			id: w.id,
			name: w.name,
			target: `workflows/wf-${idx}`,
		})),
		...options.manifestExtras,
	};

	const explicitCredentials = options.manifestExtras?.requirements?.credentials;
	if (explicitCredentials === undefined) {
		const derived = credentialRequirementsFromWorkflows(workflows);
		if (derived.length > 0) {
			manifest.requirements = {
				...manifest.requirements,
				credentials: derived,
			};
		}
	}

	writer.writeFile('manifest.json', JSON.stringify(manifest));
	workflows.forEach((wf, idx) => {
		writer.writeDirectory(`workflows/wf-${idx}`);
		writer.writeFile(`workflows/wf-${idx}/workflow.json`, JSON.stringify(wf));
	});

	return await streamToBuffer(writer.finalize());
}

export function serializedDataTable(
	overrides: Partial<SerializedDataTable> = {},
): SerializedDataTable {
	return {
		id: 'dtsource1',
		name: 'Customers',
		columns: [
			{ name: 'email', type: 'string', index: 0 },
			{ name: 'signed_up_at', type: 'date', index: 1 },
		],
		...overrides,
	};
}

/** Workflow whose only node references a data table via the `dataTableId` resource locator. */
export function serializedWorkflowWithDataTable(options: {
	id: string;
	name: string;
	dataTableId: string;
}): SerializedWorkflow {
	return serializedWorkflow({
		id: options.id,
		name: options.name,
		nodes: [
			{
				id: 'data-table-node',
				name: 'Data table',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					dataTableId: { __rl: true, mode: 'id', value: options.dataTableId },
				},
			},
		],
	});
}

/** Builds a manifest data table requirement (simulates export). */
export function dataTableRequirement(
	table: SerializedDataTable,
	usedByWorkflows: string[],
): PackageDataTableRequirement {
	return { id: table.id, name: table.name, usedByWorkflows };
}

export function serializedFolder(overrides: Partial<SerializedFolder> = {}): SerializedFolder {
	return { id: 'folder-id', name: 'Folder', parentFolderId: null, ...overrides };
}

export function serializedProject(overrides: Partial<SerializedProject> = {}): SerializedProject {
	return { id: 'project-id', name: 'Project', ...overrides };
}

export interface PackageFolderEntry {
	target: string;
	folder: SerializedFolder;
}

export interface PackageProjectEntry {
	target: string;
	project: SerializedProject;
}

export interface PackageWorkflowEntry {
	target: string;
	workflow: SerializedWorkflow;
}

export interface PackageDataTableEntry {
	target: string;
	dataTable: SerializedDataTable;
}

/**
 * Builds a package at explicit target paths, so tests can shape the exact package layout
 * (top-level folders, nested folders, project-namespaced entities). Manifest entries are
 * derived from each entity's id/name and the given target.
 */
export async function buildEntityPackageBuffer(options: {
	workflows?: PackageWorkflowEntry[];
	folders?: PackageFolderEntry[];
	projects?: PackageProjectEntry[];
	dataTables?: PackageDataTableEntry[];
	manifestExtras?: Partial<PackageManifest>;
	sourceId?: string;
}): Promise<Buffer> {
	const writer = new TarPackageWriter();
	const workflows = options.workflows ?? [];
	const folders = options.folders ?? [];
	const projects = options.projects ?? [];
	const dataTables = options.dataTables ?? [];

	const manifest: PackageManifest = {
		packageFormatVersion: FORMAT_VERSION,
		exportedAt: new Date().toISOString(),
		sourceN8nVersion: '1.0.0',
		sourceId: options.sourceId ?? 'integration-test-source',
		...(workflows.length > 0
			? {
					workflows: workflows.map(({ target, workflow }) => ({
						id: workflow.id,
						name: workflow.name,
						target,
					})),
				}
			: {}),
		...(folders.length > 0
			? {
					folders: folders.map(({ target, folder }) => ({
						id: folder.id,
						name: folder.name,
						target,
					})),
				}
			: {}),
		...(projects.length > 0
			? {
					projects: projects.map(({ target, project }) => ({
						id: project.id,
						name: project.name,
						target,
					})),
				}
			: {}),
		...(dataTables.length > 0
			? {
					dataTables: dataTables.map(({ target, dataTable }) => ({
						id: dataTable.id,
						name: dataTable.name,
						target,
					})),
				}
			: {}),
		...options.manifestExtras,
	};

	// Manifest first: the reader/parser resolves it before reading any referenced file.
	writer.writeFile('manifest.json', JSON.stringify(manifest));
	for (const { target, workflow } of workflows) {
		writer.writeDirectory(target);
		writer.writeFile(`${target}/workflow.json`, JSON.stringify(workflow));
	}
	for (const { target, folder } of folders) {
		writer.writeDirectory(target);
		writer.writeFile(`${target}/folder.json`, JSON.stringify(folder));
	}
	for (const { target, project } of projects) {
		writer.writeDirectory(target);
		writer.writeFile(`${target}/project.json`, JSON.stringify(project));
	}
	for (const { target, dataTable } of dataTables) {
		writer.writeDirectory(target);
		writer.writeFile(`${target}/data-table.json`, JSON.stringify(dataTable));
	}

	return await streamToBuffer(writer.finalize());
}
