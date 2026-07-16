import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';
import { ZodError } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import * as WorkflowHelpers from '@/workflow-helpers';

import { deriveParentFolderId, foldersInScope, workflowsInScope } from './package-layout';
import type { PreparedFolder } from '../entities/folder/folder-import.types';
import type { PreparedProject } from '../entities/project/project-import.types';
import type { PreparedWorkflow } from '../entities/workflow/workflow-import.types';
import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import type { PackageReader } from '../io/package-reader';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import { packageManifestSchema } from '../spec/manifest.schema';
import { serializedFolderSchema, type SerializedFolder } from '../spec/serialized/folder.schema';
import { serializedProjectSchema } from '../spec/serialized/project.schema';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';

/**
 * Parses the typed entities out of a `.n8np` package — the read-side counterpart
 * to the exporters. It reads through the {@link PackageReader} io interface (so
 * the tar format is just one implementation), knows the package layout, and
 * validates as it goes.
 */
@Service()
export class N8nPackageParser {
	constructor(private readonly workflowSerializer: WorkflowSerializer) {}

	async getManifest(reader: PackageReader): Promise<PackageManifest> {
		try {
			return packageManifestSchema.parse(await reader.readManifest());
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			if (error instanceof ZodError)
				throw new BadRequestError('Package manifest failed validation');
			throw new BadRequestError('Failed to read package manifest');
		}
	}

	async getWorkflows(reader: PackageReader, basePrefix = ''): Promise<PreparedWorkflow[]> {
		const manifest = await this.getManifest(reader);
		const folderTargetToId = new Map((manifest.folders ?? []).map((f) => [f.target, f.id]));

		const workflows: PreparedWorkflow[] = [];
		for (const entry of workflowsInScope(manifest.workflows, basePrefix)) {
			const parentFolderId = deriveParentFolderId(entry.target, folderTargetToId);
			workflows.push(await this.readWorkflow(reader, entry, parentFolderId));
		}
		return workflows;
	}

	async getFolders(reader: PackageReader, basePrefix = ''): Promise<PreparedFolder[]> {
		const manifest = await this.getManifest(reader);

		const folders: PreparedFolder[] = [];
		for (const entry of foldersInScope(manifest.folders, basePrefix)) {
			folders.push(await this.readFolder(reader, entry));
		}
		return folders;
	}

	/** Reads the package's project shells. */
	async getProjects(reader: PackageReader): Promise<PreparedProject[]> {
		const manifest = await this.getManifest(reader);

		const projects: PreparedProject[] = [];
		for (const entry of manifest.projects ?? []) {
			projects.push(await this.readProject(reader, entry));
		}
		return projects;
	}

	private async readWorkflow(
		reader: PackageReader,
		entry: ManifestEntry,
		parentFolderId: string | null,
	): Promise<PreparedWorkflow> {
		const path = `${entry.target}/workflow.json`;
		const wire = await this.readJson<SerializedWorkflow>(reader, path, 'workflow');

		let entity: WorkflowEntity;
		try {
			const partial = this.workflowSerializer.deserialize(wire);
			entity = Object.assign(new WorkflowEntity(), partial);
		} catch (cause) {
			if (cause instanceof ZodError) {
				throw new UserError(`Package workflow file at ${path} failed schema validation.`, {
					cause,
				});
			}
			throw cause;
		}

		WorkflowHelpers.validateWorkflowStructure(entity);

		return {
			entity,
			sourceWorkflowId: entry.id,
			sourcePublished: wire.isPublished,
			parentFolderId,
		};
	}

	private async readFolder(reader: PackageReader, entry: ManifestEntry): Promise<PreparedFolder> {
		const path = `${entry.target}/folder.json`;
		const wire = await this.readJson(reader, path, 'folder');

		let folder: SerializedFolder;
		try {
			folder = serializedFolderSchema.parse(wire);
		} catch (cause) {
			if (cause instanceof ZodError) {
				throw new UserError(`Package folder file at ${path} failed schema validation.`, { cause });
			}
			throw cause;
		}

		// Nested workflows route to folders by manifest id, but folders are created
		// under folder.json's id — a mismatch would place a workflow in the wrong folder.
		if (folder.id !== entry.id) {
			throw new UserError(
				`Package folder at ${path} declares id "${folder.id}" but the manifest lists it as "${entry.id}".`,
			);
		}

		return {
			sourceFolderId: folder.id,
			name: folder.name,
			parentFolderId: folder.parentFolderId,
		};
	}

	private async readProject(reader: PackageReader, entry: ManifestEntry): Promise<PreparedProject> {
		const path = `${entry.target}/project.json`;
		const wire = await this.readJson(reader, path, 'project');

		try {
			const project = serializedProjectSchema.parse(wire);
			return {
				sourceProjectId: project.id,
				name: project.name,
				...(project.description !== undefined ? { description: project.description } : {}),
				...(project.icon !== undefined ? { icon: project.icon } : {}),
			};
		} catch (cause) {
			if (cause instanceof ZodError) {
				throw new UserError(`Package project file at ${path} failed schema validation.`, { cause });
			}
			throw cause;
		}
	}

	private async readJson<T = unknown>(
		reader: PackageReader,
		path: string,
		label: string,
	): Promise<T> {
		let content: Buffer;
		try {
			content = await reader.readFile(path);
		} catch (cause) {
			throw new UserError(`Package manifest references a missing ${label} file at ${path}.`, {
				cause,
			});
		}

		return jsonParse<T>(content.toString('utf-8'), {
			errorMessage: `Package ${label} file at ${path} is not valid JSON.`,
		});
	}
}
