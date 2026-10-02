import { randomCredentialPayload, type CredentialPayload } from '@n8n/backend-test-utils';
import type { WorkflowEntity } from '@n8n/db';
import { EXECUTE_WORKFLOW_NODE_TYPE, getSubworkflowId, type INode } from 'n8n-workflow';

import { DirectoryPackageWriter } from '../../io/directory/directory-package-writer';
import { entityFilePath, workflowMetadataFilePath } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import { TarPackageWriter } from '../../io/tar/tar-package-writer';
import { FORMAT_VERSION } from '../../spec/constants';
import type { PackageManifest } from '../../spec/manifest.schema';
import type {
	PackageCredentialRequirement,
	PackageDataTableRequirement,
	PackageWorkflowRequirement,
} from '../../spec/requirements.schema';
import type { SerializedDataTable } from '../../spec/serialized/data-table.schema';
import type { SerializedFolder } from '../../spec/serialized/folder.schema';
import type { SerializedProject } from '../../spec/serialized/project.schema';
import type { SerializedVariable } from '../../spec/serialized/variable.schema';
import type { SerializedWorkflowMetadata } from '../../spec/serialized/workflow-metadata.schema';
import type { SerializedWorkflow } from '../../spec/serialized/workflow.schema';
import { streamToBuffer } from '../utils/tar-support';

/** `versionId` every workflow fixture carries, so a test can name it as published. */
export const WIRE_VERSION_ID = 'wire-version-id';

export type PackageWorkflow = SerializedWorkflow & SerializedWorkflowMetadata;

function workflowFiles(workflow: PackageWorkflow): {
	content: SerializedWorkflow;
	metadata: SerializedWorkflowMetadata;
} {
	const { versionId, publishedVersionId, ...content } = workflow;

	return { content, metadata: { versionId, publishedVersionId: publishedVersionId ?? null } };
}

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

export function serializedWorkflow(overrides: Partial<PackageWorkflow> = {}): PackageWorkflow {
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
		versionId: WIRE_VERSION_ID,
		parentFolderId: null,
		publishedVersionId: null,
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
}): PackageWorkflow {
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

/**
 * Builds a workflow whose Execute Sub-workflow node references another workflow by
 * id, optionally carrying `callerIds`/`callerPolicy` settings.
 */
export function serializedWorkflowWithSubWorkflow(options: {
	id: string;
	name: string;
	subWorkflowId: string;
	mode?: 'id' | 'list';
	callerIds?: string;
	callerPolicy?: string;
}): PackageWorkflow {
	const settings =
		options.callerIds !== undefined || options.callerPolicy !== undefined
			? {
					...(options.callerPolicy !== undefined ? { callerPolicy: options.callerPolicy } : {}),
					...(options.callerIds !== undefined ? { callerIds: options.callerIds } : {}),
				}
			: undefined;

	return serializedWorkflow({
		id: options.id,
		name: options.name,
		nodes: [
			{
				id: 'execute-workflow',
				name: 'Execute Sub-workflow',
				type: EXECUTE_WORKFLOW_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					workflowId: { __rl: true, mode: options.mode ?? 'id', value: options.subWorkflowId },
				},
			},
		],
		...(settings ? { settings } : {}),
	});
}

/**
 * Builds manifest workflow requirements from each workflow's sub-workflow node refs and
 * `settings.errorWorkflow` (simulates export — mirrors `extractWorkflowRequirements`).
 */
export function workflowRequirementsFromWorkflows(
	workflows: SerializedWorkflow[],
): PackageWorkflowRequirement[] {
	const nameById = new Map(workflows.map((workflow) => [workflow.id, workflow.name]));
	const byId = new Map<string, PackageWorkflowRequirement>();

	const addRequirement = (referencedId: string | undefined, workflowId: string) => {
		if (!referencedId) return;
		const existing = byId.get(referencedId);
		if (existing) {
			if (!existing.usedByWorkflows.includes(workflowId)) existing.usedByWorkflows.push(workflowId);
			return;
		}
		byId.set(referencedId, {
			id: referencedId,
			name: nameById.get(referencedId) ?? referencedId,
			usedByWorkflows: [workflowId],
		});
	};

	for (const workflow of workflows) {
		for (const node of workflow.nodes) addRequirement(getSubworkflowId(node as INode), workflow.id);
		addRequirement(errorWorkflowRef(workflow), workflow.id);
	}

	return [...byId.values()];
}

/** Static `settings.errorWorkflow` id referenced by a workflow, if any (mirrors the exporter). */
function errorWorkflowRef(workflow: SerializedWorkflow): string | undefined {
	const errorWorkflow = workflow.settings?.errorWorkflow;
	if (
		typeof errorWorkflow !== 'string' ||
		errorWorkflow === 'DEFAULT' ||
		errorWorkflow.startsWith('=')
	) {
		return undefined;
	}
	return errorWorkflow;
}

/** Returns the id the workflow's Execute Sub-workflow node points at. */
export function subWorkflowRefOf(workflow: WorkflowEntity): string | undefined {
	for (const node of workflow.nodes) {
		const referencedId = getSubworkflowId(node);
		if (referencedId) return referencedId;
	}
	return undefined;
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
	workflows: PackageWorkflow[],
	options: {
		manifestExtras?: Partial<PackageManifest>;
		sourceId?: string;
		/** Replaces every metadata file, or leaves it out, so tests can drive the rejections. */
		workflowMetadata?: 'omit' | Record<string, unknown>;
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
		const { content, metadata } = workflowFiles(wf);
		const target = `workflows/wf-${idx}`;
		writer.writeDirectory(target);
		writer.writeFile(entityFilePath('workflows', target), JSON.stringify(content));
		if (options.workflowMetadata !== 'omit') {
			writer.writeFile(
				workflowMetadataFilePath(target),
				JSON.stringify(options.workflowMetadata ?? metadata),
			);
		}
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
}): PackageWorkflow {
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
	workflow: PackageWorkflow;
}

export interface PackageDataTableEntry {
	target: string;
	dataTable: SerializedDataTable;
}

export interface PackageVariableEntry {
	id: string;
	target: string;
	variable: SerializedVariable;
}

export interface EntityPackageOptions {
	workflows?: PackageWorkflowEntry[];
	folders?: PackageFolderEntry[];
	projects?: PackageProjectEntry[];
	dataTables?: PackageDataTableEntry[];
	variables?: PackageVariableEntry[];
	manifestExtras?: Partial<PackageManifest>;
	sourceId?: string;
}

async function writeEntityPackage(
	writer: PackageWriter,
	options: EntityPackageOptions,
): Promise<void> {
	const workflows = options.workflows ?? [];
	const folders = options.folders ?? [];
	const projects = options.projects ?? [];
	const dataTables = options.dataTables ?? [];
	const variables = options.variables ?? [];

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
		...(variables.length > 0
			? {
					variables: variables.map(({ id, target, variable }) => ({
						id,
						name: variable.name,
						target,
					})),
				}
			: {}),
		...options.manifestExtras,
	};

	// Manifest first: the reader/parser resolves it before reading any referenced file.
	await writer.writeFile('manifest.json', JSON.stringify(manifest));
	for (const { target, workflow } of workflows) {
		const { content, metadata } = workflowFiles(workflow);
		await writer.writeDirectory(target);
		await writer.writeFile(entityFilePath('workflows', target), JSON.stringify(content));
		await writer.writeFile(workflowMetadataFilePath(target), JSON.stringify(metadata));
	}
	for (const { target, folder } of folders) {
		await writer.writeDirectory(target);
		await writer.writeFile(entityFilePath('folders', target), JSON.stringify(folder));
	}
	for (const { target, project } of projects) {
		await writer.writeDirectory(target);
		await writer.writeFile(entityFilePath('projects', target), JSON.stringify(project));
	}
	for (const { target, dataTable } of dataTables) {
		await writer.writeDirectory(target);
		await writer.writeFile(entityFilePath('dataTables', target), JSON.stringify(dataTable));
	}
	for (const { target, variable } of variables) {
		await writer.writeDirectory(target);
		await writer.writeFile(entityFilePath('variables', target), JSON.stringify(variable));
	}
}

/**
 * Builds a package at explicit target paths, so tests can shape the exact package layout
 * (top-level folders, nested folders, project-namespaced entities). Manifest entries are
 * derived from each entity's id/name and the given target.
 */
export async function buildEntityPackageBuffer(options: EntityPackageOptions): Promise<Buffer> {
	const writer = new TarPackageWriter();
	await writeEntityPackage(writer, options);
	return await streamToBuffer(writer.finalize());
}

/** Use the same package layout for directory and tar imports. */
export async function buildEntityPackageDirectory(
	targetDir: string,
	options: EntityPackageOptions,
): Promise<void> {
	const writer = new DirectoryPackageWriter(targetDir);
	await writeEntityPackage(writer, options);
	await writer.finalize();
}
