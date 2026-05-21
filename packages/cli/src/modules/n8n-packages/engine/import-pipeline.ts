import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { ProjectRepository, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';
import { ZodError } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';

import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import type { ImportPackageRequest, ImportResult } from '../n8n-packages.types';
import { packageManifestSchema } from '../spec/manifest.schema';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';

const MEGABYTE_IN_BYTES = 1024 * 1024;

interface ImportTarget {
	projectId: string;
	folderId: string | null;
}

interface PreparedWorkflow {
	entity: WorkflowEntity;
	sourceId: string;
}

@Service()
export class ImportPipeline {
	private readonly maxUncompressedPackageBytes: number;

	constructor(
		private readonly workflowSerializer: WorkflowSerializer,
		private readonly workflowCreationService: WorkflowCreationService,
		globalConfig: GlobalConfig,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly folderService: FolderService,
		private readonly eventService: EventService,
	) {
		this.maxUncompressedPackageBytes = globalConfig.endpoints.payloadSizeMax * MEGABYTE_IN_BYTES;
	}

	async run(request: ImportPackageRequest): Promise<ImportResult> {
		const reader = new TarPackageReader(request.packageBuffer, this.maxUncompressedPackageBytes);

		const manifest = await this.loadPackageManifest(reader);

		const { target } = await this.resolveTarget(request.user, request.projectId, request.folderId);

		// Validates every workflow first so a malformed package aborts before the first DB write.
		const prepared = await this.prepareWorkflows(manifest.workflows ?? [], reader);

		const { manager: dbManager } = this.projectRepository;
		const created = await dbManager.transaction(async (transactionManager) => {
			const savedWorkflows: WorkflowEntity[] = [];
			for (const { entity, sourceId } of prepared) {
				const saved = await this.workflowCreationService.createWorkflow(request.user, entity, {
					projectId: target.projectId,
					parentFolderId: target.folderId ?? undefined,
					publicApi: true,
					source: 'import',
					sourceWorkflowId: sourceId,
					transactionManager,
				});
				savedWorkflows.push(saved);
			}
			return savedWorkflows;
		});

		this.eventService.emit('workflows-imported', {
			user: request.user,
			projectId: target.projectId,
			workflowIds: created.map((w) => w.id),
			packageSourceId: manifest.sourceId,
			packageVersion: manifest.packageFormatVersion,
		});

		return {
			package: {
				sourceN8nVersion: manifest.sourceN8nVersion,
				sourceId: manifest.sourceId,
				exportedAt: manifest.exportedAt,
			},
			workflows: created.map((w) => ({
				sourceId: w.sourceWorkflowId ?? '',
				localId: w.id,
				name: w.name,
				projectId: target.projectId,
				parentFolderId: w.parentFolder?.id ?? null,
				activeVersionId: w.activeVersionId ?? null,
			})),
		};
	}

	private async loadPackageManifest(reader: TarPackageReader) {
		try {
			const rawManifest = await reader.readManifest();
			return packageManifestSchema.parse(rawManifest);
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			if (error instanceof ZodError) {
				throw new BadRequestError('Package manifest failed validation');
			}
			throw new BadRequestError('Failed to read package manifest');
		}
	}

	private async prepareWorkflows(
		entries: ReadonlyArray<{ id: string; target: string }>,
		reader: TarPackageReader,
	): Promise<PreparedWorkflow[]> {
		const prepared: PreparedWorkflow[] = [];

		for (const entry of entries) {
			const path = `${entry.target}/workflow.json`;

			try {
				const content = await reader.readFile(path);
				const wire = jsonParse<SerializedWorkflow>(content.toString('utf-8'), {
					errorMessage: `Package workflow file at ${path} is not valid JSON.`,
				});

				const partial = this.workflowSerializer.deserialize(wire);
				const entity = Object.assign(new WorkflowEntity(), partial);

				WorkflowHelpers.validateWorkflowStructure(entity);

				prepared.push({ entity, sourceId: entry.id });
			} catch (cause) {
				throw new UserError(`Package manifest references a missing workflow file at ${path}.`, {
					cause,
				});
			}
		}

		return prepared;
	}

	private async resolveTarget(
		user: User,
		projectId: string | undefined,
		folderId: string | undefined,
	): Promise<{ target: ImportTarget; project: Project }> {
		const project = await this.resolveImportProject(user, projectId);
		await this.assertFolderExistsInProject(folderId, project.id);

		return {
			project,
			target: { projectId: project.id, folderId: folderId ?? null },
		};
	}

	private async resolveImportProject(user: User, projectId: string | undefined): Promise<Project> {
		if (projectId === undefined) {
			return await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
		}

		const project = await this.projectService.getProjectWithScope(user, projectId, [
			'workflow:import',
		]);
		if (project) {
			return project;
		}

		if (!(await this.projectRepository.existsBy({ id: projectId }))) {
			throw new NotFoundError(`Project not found: ${projectId}`);
		}
		throw new ForbiddenError('You do not have permission to import workflows into this project.');
	}

	private async assertFolderExistsInProject(
		folderId: string | undefined,
		projectId: string,
	): Promise<void> {
		if (folderId === undefined) {
			return;
		}

		try {
			await this.folderService.findFolderInProjectOrFail(folderId, projectId);
		} catch (cause) {
			throw new UserError(`Folder not found in target project: ${folderId}`, { cause });
		}
	}
}
