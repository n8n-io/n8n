import { Logger } from '@n8n/backend-common';
import {
	FolderRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { Folder } from '@n8n/db';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { Credentials, InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'path';

import { SOURCE_CONTROL_GIT_FOLDER } from './constants';
import {
	getPackageCredentialDir,
	getPackageDataTableDir,
	getPackageFolderDir,
	getPackageProjectDir,
	getPackageVariableDir,
	getPackageWorkflowDir,
	sanitizeCredentialData,
	slugify,
} from './source-control-helper.ee';
import type { ExportableCredential } from './types/exportable-credential';
import type { ExportableManifest } from './types/exportable-manifest';
import type { ExportableWorkflow } from './types/exportable-workflow';

interface FolderNode {
	id: string;
	name: string;
	parentFolderId: string | null;
	children: FolderNode[];
}

@Service()
export class SourceControlPackageExportService {
	private gitFolder: string;

	constructor(
		private readonly logger: Logger,
		private readonly projectRepository: ProjectRepository,
		private readonly folderRepository: FolderRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly dataTableRepository: DataTableRepository,
		instanceSettings: InstanceSettings,
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
	}

	async exportPackage(projectIds: string[], userId: string): Promise<void> {
		const manifestPath = path.join(this.gitFolder, 'manifest.json');

		const existingManifest = await this.readExistingManifest(manifestPath);

		// Only delete directories for projects being re-exported, not the entire projects/ dir
		for (const projectId of projectIds) {
			const project = await this.projectRepository.findOneBy({ id: projectId });
			if (project) {
				const projectDir = getPackageProjectDir(this.gitFolder, project.name, project.id);
				await rm(projectDir, { recursive: true, force: true }).catch(() => {});
			}
		}

		const exportedProjectIds = new Set(projectIds);
		const newProjectEntries: ExportableManifest['projects'] = [];
		const allCredentialTypes = new Set<string>();
		const allNodeTypes = new Set<string>();

		for (const projectId of projectIds) {
			const { credentialTypes, nodeTypes, projectEntry } =
				await this.exportSingleProject(projectId);
			newProjectEntries.push(projectEntry);
			credentialTypes.forEach((t) => allCredentialTypes.add(t));
			nodeTypes.forEach((t) => allNodeTypes.add(t));
		}

		// Merge with existing manifest entries for projects not being re-exported
		const preservedProjects =
			existingManifest?.projects.filter((p) => !exportedProjectIds.has(p.id)) ?? [];
		const mergedProjects = [...preservedProjects, ...newProjectEntries];

		const manifest: ExportableManifest = {
			version: '1.0.0',
			name: mergedProjects.length === 1 ? mergedProjects[0].name : 'n8n Package',
			projects: mergedProjects,
			dependencies: {
				credentialTypes: [...allCredentialTypes].sort(),
				nodeTypes: [...allNodeTypes].sort(),
			},
			exportedAt: new Date().toISOString(),
			exportedBy: userId,
		};

		await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
		this.logger.info(
			`Package export complete: ${newProjectEntries.length} project(s) exported, ${preservedProjects.length} project(s) preserved`,
		);
	}

	private async readExistingManifest(manifestPath: string): Promise<ExportableManifest | null> {
		try {
			const content = await readFile(manifestPath, 'utf-8');
			return JSON.parse(content) as ExportableManifest;
		} catch {
			return null;
		}
	}

	private async exportSingleProject(projectId: string): Promise<{
		credentialTypes: Set<string>;
		nodeTypes: Set<string>;
		projectEntry: ExportableManifest['projects'][number];
	}> {
		const project = await this.projectRepository.findOne({
			where: { id: projectId },
			relations: ['variables'],
		});

		if (!project) {
			throw new UnexpectedError(`Project ${projectId} not found`);
		}

		const projectDir = getPackageProjectDir(this.gitFolder, project.name, project.id);
		await mkdir(projectDir, { recursive: true });

		// Write project.json
		await writeFile(
			path.join(projectDir, 'project.json'),
			JSON.stringify(
				{
					id: project.id,
					name: project.name,
					icon: project.icon,
					description: project.description,
					type: project.type,
					owner: {
						type: 'team',
						teamId: project.id,
						teamName: project.name,
					},
					variableStubs: project.variables.map((v) => ({
						id: v.id,
						key: v.key,
						type: v.type,
						value: '',
					})),
				},
				null,
				2,
			),
		);

		// Get folders for this project
		const folders = await this.folderRepository.find({
			where: { homeProject: { id: projectId } },
			relations: ['parentFolder'],
			select: {
				id: true,
				name: true,
				createdAt: true,
				updatedAt: true,
				parentFolder: { id: true },
			},
		});

		// Build folder tree
		const folderTree = this.buildFolderTree(folders);

		// Get workflows owned by this project
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { projectId, role: 'workflow:owner' },
			select: { workflowId: true },
		});
		const projectWorkflowIds = sharedWorkflows.map((sw) => sw.workflowId);

		const workflows =
			projectWorkflowIds.length > 0
				? await this.workflowRepository.find({
						where: { id: In(projectWorkflowIds) },
						relations: ['parentFolder'],
					})
				: [];

		// Build workflow lookup by parentFolderId
		const workflowsByFolder = new Map<string | null, typeof workflows>();
		for (const wf of workflows) {
			const folderId = wf.parentFolder?.id ?? null;
			if (!workflowsByFolder.has(folderId)) {
				workflowsByFolder.set(folderId, []);
			}
			workflowsByFolder.get(folderId)!.push(wf);
		}

		const nodeTypes = new Set<string>();

		// Write folder tree recursively
		const foldersBaseDir = path.join(projectDir, 'folders');
		await mkdir(foldersBaseDir, { recursive: true });

		for (const rootFolder of folderTree) {
			await this.writeFolderRecursively(
				rootFolder,
				foldersBaseDir,
				workflowsByFolder,
				folders,
				project.id,
				nodeTypes,
			);
		}

		// Write root-level workflows (no folder)
		const rootWorkflows = workflowsByFolder.get(null) ?? [];
		if (rootWorkflows.length > 0) {
			const rootWorkflowsDir = path.join(projectDir, 'folders');
			for (const wf of rootWorkflows) {
				await this.writeWorkflow(wf, rootWorkflowsDir, project.id, nodeTypes);
			}
		}

		// Export credentials
		const credentialTypes = new Set<string>();
		const projectCredentials = await this.sharedCredentialsRepository.find({
			where: { projectId, role: 'credential:owner' },
			relations: { credentials: true },
		});

		for (const sharing of projectCredentials) {
			const { id, name, type, data, isGlobal = false } = sharing.credentials;
			const credentials = new Credentials({ id, name }, type, data);
			const sanitizedData = sanitizeCredentialData(credentials.getData());

			const credDir = getPackageCredentialDir(projectDir, name, id);
			await mkdir(credDir, { recursive: true });

			const stub: ExportableCredential = {
				id,
				name,
				type,
				data: sanitizedData,
				ownedBy: {
					type: 'team',
					teamId: project.id,
					teamName: project.name,
				},
				isGlobal,
			};

			await writeFile(path.join(credDir, 'credential.json'), JSON.stringify(stub, null, 2));
			credentialTypes.add(type);
		}

		// Export variables
		const variables = project.variables ?? [];
		for (const variable of variables) {
			const varDir = getPackageVariableDir(projectDir, variable.key, variable.id);
			await mkdir(varDir, { recursive: true });

			await writeFile(
				path.join(varDir, 'variable.json'),
				JSON.stringify(
					{
						id: variable.id,
						key: variable.key,
						type: variable.type,
						value: '',
						projectId: project.id,
					},
					null,
					2,
				),
			);
		}

		// Export data tables
		const dataTables = await this.dataTableRepository.find({
			where: { projectId },
			relations: ['columns'],
		});

		for (const table of dataTables) {
			const dtDir = getPackageDataTableDir(projectDir, table.name, table.id);
			await mkdir(dtDir, { recursive: true });

			await writeFile(
				path.join(dtDir, 'data-table.json'),
				JSON.stringify(
					{
						id: table.id,
						name: table.name,
						columns: table.columns
							.sort((a, b) => a.index - b.index)
							.map((col) => ({
								id: col.id,
								name: col.name,
								type: col.type,
								index: col.index,
							})),
						ownedBy: {
							type: 'team',
							teamId: project.id,
							teamName: project.name,
						},
						createdAt: table.createdAt.toISOString(),
						updatedAt: table.updatedAt.toISOString(),
					},
					null,
					2,
				),
			);
		}

		return {
			credentialTypes,
			nodeTypes,
			projectEntry: {
				id: project.id,
				name: project.name,
				dirName: slugify(project.name, project.id),
			},
		};
	}

	private buildFolderTree(folders: Folder[]): FolderNode[] {
		const folderMap = new Map<string, FolderNode>();
		for (const f of folders) {
			folderMap.set(f.id, {
				id: f.id,
				name: f.name,
				parentFolderId: f.parentFolder?.id ?? null,
				children: [],
			});
		}

		const roots: FolderNode[] = [];
		for (const node of folderMap.values()) {
			if (node.parentFolderId && folderMap.has(node.parentFolderId)) {
				folderMap.get(node.parentFolderId)!.children.push(node);
			} else {
				roots.push(node);
			}
		}

		return roots;
	}

	private async writeFolderRecursively(
		folderNode: FolderNode,
		parentPath: string,
		workflowsByFolder: Map<
			string | null,
			Array<{
				id: string;
				name: string;
				nodes: unknown[];
				connections: unknown;
				settings?: unknown;
				triggerCount: number;
				versionId?: string;
				parentFolder?: { id: string } | null;
				isArchived: boolean;
			}>
		>,
		allFolders: Folder[],
		projectId: string,
		nodeTypes: Set<string>,
	): Promise<void> {
		const folderDir = getPackageFolderDir(parentPath, folderNode.name, folderNode.id);
		await mkdir(folderDir, { recursive: true });

		const originalFolder = allFolders.find((f) => f.id === folderNode.id);

		// Write folder.json
		await writeFile(
			path.join(folderDir, 'folder.json'),
			JSON.stringify(
				{
					id: folderNode.id,
					name: folderNode.name,
					parentFolderId: folderNode.parentFolderId,
					homeProjectId: projectId,
					createdAt: originalFolder?.createdAt?.toISOString?.() ?? new Date().toISOString(),
					updatedAt: originalFolder?.updatedAt?.toISOString?.() ?? new Date().toISOString(),
				},
				null,
				2,
			),
		);

		// Write workflows in this folder
		const folderWorkflows = workflowsByFolder.get(folderNode.id) ?? [];
		for (const wf of folderWorkflows) {
			await this.writeWorkflow(wf, folderDir, projectId, nodeTypes);
		}

		// Recurse into children
		for (const child of folderNode.children) {
			await this.writeFolderRecursively(
				child,
				folderDir,
				workflowsByFolder,
				allFolders,
				projectId,
				nodeTypes,
			);
		}
	}

	private async writeWorkflow(
		wf: {
			id: string;
			name: string;
			nodes: unknown[];
			connections: unknown;
			settings?: unknown;
			triggerCount: number;
			versionId?: string;
			parentFolder?: { id: string } | null;
			isArchived: boolean;
		},
		parentDir: string,
		projectId: string,
		nodeTypes: Set<string>,
	): Promise<void> {
		const wfDir = getPackageWorkflowDir(parentDir, wf.name, wf.id);
		await mkdir(wfDir, { recursive: true });

		// Collect node types for manifest dependencies
		if (Array.isArray(wf.nodes)) {
			for (const node of wf.nodes) {
				if (typeof node === 'object' && node !== null && 'type' in node) {
					nodeTypes.add((node as { type: string }).type);
				}
			}
		}

		const exportable: ExportableWorkflow = {
			id: wf.id,
			name: wf.name,
			nodes: wf.nodes as ExportableWorkflow['nodes'],
			connections: wf.connections as ExportableWorkflow['connections'],
			settings: wf.settings as ExportableWorkflow['settings'],
			triggerCount: wf.triggerCount,
			versionId: wf.versionId,
			owner: {
				type: 'team',
				teamId: projectId,
				teamName: '',
			},
			parentFolderId: wf.parentFolder?.id ?? null,
			isArchived: wf.isArchived,
		};

		await writeFile(path.join(wfDir, 'workflow.json'), JSON.stringify(exportable, null, 2));
	}
}
