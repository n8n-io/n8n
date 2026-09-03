import { Logger } from '@n8n/backend-common';
import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';
import { ZodError } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NodeTypes } from '@/node-types';
import * as WorkflowHelpers from '@/workflow-helpers';

import {
	agentsInScope,
	deriveParentFolderId,
	foldersInScope,
	workflowsInScope,
} from './package-layout';
import type { PreparedAgent, PreparedAgentFile } from '../entities/agent/agent.types';
import type { PreparedFolder } from '../entities/folder/folder-import.types';
import type { PreparedProject } from '../entities/project/project-import.types';
import type { PreparedWorkflow } from '../entities/workflow/workflow-import.types';
import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import type { PackageReader } from '../io/package-reader';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import { packageManifestSchema } from '../spec/manifest.schema';
import { serializedAgentSchema, type SerializedAgent } from '../spec/serialized/agent.schema';
import { serializedDataTableSchema } from '../spec/serialized/data-table.schema';
import type { SerializedDataTable } from '../spec/serialized/data-table.schema';
import { serializedFolderSchema, type SerializedFolder } from '../spec/serialized/folder.schema';
import { serializedProjectSchema, type SerializedProject } from '../spec/serialized/project.schema';
import {
	serializedVariableSchema,
	type SerializedVariable,
} from '../spec/serialized/variable.schema';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';

/**
 * Parses the typed entities out of a `.n8np` package — the read-side counterpart
 * to the exporters. It reads through the {@link PackageReader} io interface (so
 * the tar format is just one implementation), knows the package layout, and
 * validates as it goes.
 */
@Service()
export class N8nPackageParser {
	constructor(
		private readonly logger: Logger,
		private readonly nodeTypes: NodeTypes,
		private readonly workflowSerializer: WorkflowSerializer,
	) {}

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

	/** Agents in scope, with their file payloads loaded. */
	async getAgents(reader: PackageReader, basePrefix = ''): Promise<PreparedAgent[]> {
		const manifest = await this.getManifest(reader);

		const agents: PreparedAgent[] = [];
		for (const entry of agentsInScope(manifest.agents, basePrefix)) {
			agents.push(await this.readAgent(reader, entry));
		}
		return agents;
	}

	/** Reads the package's data table schemas. */
	async getDataTables(reader: PackageReader): Promise<SerializedDataTable[]> {
		const manifest = await this.getManifest(reader);

		const dataTables: SerializedDataTable[] = [];
		for (const entry of manifest.dataTables ?? []) {
			dataTables.push(await this.readDataTable(reader, entry));
		}
		return dataTables;
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

	/** Bundled variable files, keyed by manifest target. */
	async getVariables(reader: PackageReader): Promise<Map<string, SerializedVariable>> {
		const manifest = await this.getManifest(reader);
		const variables = new Map<string, SerializedVariable>();

		for (const entry of manifest.variables ?? []) {
			variables.set(entry.target, await this.readVariable(reader, entry));
		}

		return variables;
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
		this.normalizeNodeGroups(entity, path);

		return {
			entity,
			sourceWorkflowId: entry.id,
			sourcePublished: wire.isPublished,
			parentFolderId,
			...(wire.tagIds !== undefined ? { tagIds: wire.tagIds } : {}),
		};
	}

	/** Drops groups that wouldn't survive the save path, so they can't fail the whole import. */
	private normalizeNodeGroups(entity: WorkflowEntity, path: string): void {
		const dropped = WorkflowHelpers.dropInvalidWorkflowGroups(
			entity,
			WorkflowHelpers.makeGetNodeTypeForGrouping(this.nodeTypes),
		);
		for (const { groupName, message } of dropped) {
			this.logger.warn(`Package workflow file at ${path} dropped group "${groupName}": ${message}`);
		}

		for (const warning of WorkflowHelpers.sanitizeNodeGroupDescriptions(entity)) {
			this.logger.warn(`Package workflow file at ${path}: ${warning}`);
		}
	}

	private async readAgent(reader: PackageReader, entry: ManifestEntry): Promise<PreparedAgent> {
		const path = `${entry.target}/agent.json`;
		const wire = await this.readJson(reader, path, 'agent');

		let agent: SerializedAgent;
		try {
			agent = serializedAgentSchema.parse(wire);
		} catch (cause) {
			if (cause instanceof ZodError) {
				throw new UserError(`Package agent file at ${path} failed schema validation.`, { cause });
			}
			throw cause;
		}

		// Agents are created under agent.json's id, but the manifest is the package's
		// index — a mismatch would import an agent under an undeclared identity.
		if (agent.id !== entry.id) {
			throw new UserError(
				`Package agent at ${path} declares id "${agent.id}" but the manifest lists it as "${entry.id}".`,
			);
		}

		const files: PreparedAgentFile[] = [];
		for (const file of agent.files) {
			let content: Buffer;
			try {
				content = await reader.readFile(file.target);
			} catch (cause) {
				throw new UserError(
					`Package agent at ${path} references a missing knowledge file at ${file.target}.`,
					{ cause },
				);
			}
			files.push({
				fileName: file.fileName,
				mimeType: file.mimeType,
				fileSizeBytes: file.fileSizeBytes,
				content,
			});
		}

		return {
			sourceAgentId: agent.id,
			name: agent.name,
			config: agent.config,
			tools: agent.tools,
			skills: agent.skills,
			tasks: agent.tasks,
			availableInMCP: agent.availableInMCP,
			files,
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

	private async readDataTable(
		reader: PackageReader,
		entry: ManifestEntry,
	): Promise<SerializedDataTable> {
		const path = `${entry.target}/data-table.json`;
		const wire = await this.readJson(reader, path, 'data table');

		let dataTable: SerializedDataTable;
		try {
			dataTable = serializedDataTableSchema.parse(wire);
		} catch (cause) {
			if (cause instanceof ZodError) {
				throw new UserError(`Package data table file at ${path} failed schema validation.`, {
					cause,
				});
			}
			throw cause;
		}

		// Requirements and workflow references key off the manifest id, but tables
		// are created under data-table.json's id — a mismatch would import a table
		// under an identity the manifest never declared.
		if (dataTable.id !== entry.id) {
			throw new UserError(
				`Package data table at ${path} declares id "${dataTable.id}" but the manifest lists it as "${entry.id}".`,
			);
		}

		return dataTable;
	}

	private async readProject(reader: PackageReader, entry: ManifestEntry): Promise<PreparedProject> {
		const path = `${entry.target}/project.json`;
		const wire = await this.readJson(reader, path, 'project');

		let project: SerializedProject;
		try {
			project = serializedProjectSchema.parse(wire);
		} catch (cause) {
			if (cause instanceof ZodError) {
				throw new UserError(`Package project file at ${path} failed schema validation.`, { cause });
			}
			throw cause;
		}

		// Project contents scope by manifest id, but the project is created/matched under project.json's
		// id — a mismatch would import folders and workflows into the wrong project.
		if (project.id !== entry.id) {
			throw new UserError(
				`Package project at ${path} declares id "${project.id}" but the manifest lists it as "${entry.id}".`,
			);
		}

		return {
			sourceProjectId: project.id,
			name: project.name,
			...(project.description !== undefined ? { description: project.description } : {}),
			...(project.icon !== undefined ? { icon: project.icon } : {}),
			...(project.customTelemetryTags !== undefined
				? { customTelemetryTags: project.customTelemetryTags }
				: {}),
		};
	}

	private async readVariable(
		reader: PackageReader,
		entry: ManifestEntry,
	): Promise<SerializedVariable> {
		const path = `${entry.target}/variable.json`;
		const wire = await this.readJson(reader, path, 'variable');

		let variable: SerializedVariable;
		try {
			variable = serializedVariableSchema.parse(wire);
		} catch (cause) {
			if (cause instanceof ZodError) {
				throw new UserError(`Package variable file at ${path} failed schema validation.`, {
					cause,
				});
			}
			throw cause;
		}

		if (variable.name !== entry.name) {
			throw new UserError(
				`Package variable at ${path} declares name "${variable.name}" but the manifest lists it as "${entry.name}".`,
			);
		}

		return variable;
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
