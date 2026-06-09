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

import { CredentialImporter } from '../entities/credential/credential-importer';
import { resolvedBindingsToSummaries } from '../entities/credential/credential.types';
import type { PreparedWorkflow } from '../entities/workflow/workflow-conflict-policy.types';
import { WorkflowImporter } from '../entities/workflow/workflow-importer';
import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { createBindings, serializeBindings } from '../n8n-packages.types';
import type { ImportPackageRequest, ImportResult } from '../n8n-packages.types';
import { packageManifestSchema } from '../spec/manifest.schema';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';

const MEGABYTE_IN_BYTES = 1024 * 1024;

interface ImportTarget {
	projectId: string;
	folderId: string | null;
}

@Service()
export class ImportPipeline {
	private readonly maxUncompressedPackageBytes: number;

	constructor(
		private readonly workflowSerializer: WorkflowSerializer,
		private readonly credentialImporter: CredentialImporter,
		globalConfig: GlobalConfig,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly folderService: FolderService,
		private readonly eventService: EventService,
		private readonly workflowImporter: WorkflowImporter,
	) {
		this.maxUncompressedPackageBytes = globalConfig.endpoints.payloadSizeMax * MEGABYTE_IN_BYTES;
	}

	async run(request: ImportPackageRequest): Promise<ImportResult> {
		const reader = new TarPackageReader(request.packageBuffer, this.maxUncompressedPackageBytes);

		const manifest = await this.loadPackageManifest(reader);

		const { target, project } = await this.resolveTarget(
			request.user,
			request.projectId,
			request.folderId,
		);

		// Validates every workflow first so a malformed package aborts before the first DB write.
		const prepared = await this.prepareWorkflows(manifest.workflows ?? [], reader);

		const credentialResolution = await this.credentialImporter.resolveForImport({
			requirements: manifest.requirements?.credentials,
			matchingMode: request.credentialMatchingMode,
			missingMode: request.credentialMissingMode,
			targetProject: project,
			user: request.user,
		});

		const { outcomes, bindings } = await this.workflowImporter.importWorkflows(
			prepared,
			request.workflowConflictPolicy,
			{
				user: request.user,
				projectId: target.projectId,
				folderId: target.folderId,
			},
			createBindings({ credentials: credentialResolution.successes }),
		);

		const matchedCredentials = resolvedBindingsToSummaries(credentialResolution.successes);

		const imported = outcomes.filter(({ status }) => status !== 'skipped');
		this.eventService.emit('workflows-imported', {
			user: request.user,
			projectId: target.projectId,
			workflowIds: imported.map(({ workflow }) => workflow.id),
			packageSourceId: manifest.sourceId,
			packageVersion: manifest.packageFormatVersion,
			matchedCredentialIds: matchedCredentials.map((m) => m.targetId),
		});

		return {
			package: {
				sourceN8nVersion: manifest.sourceN8nVersion,
				sourceId: manifest.sourceId,
				exportedAt: manifest.exportedAt,
			},
			workflows: outcomes.map(({ workflow, sourceWorkflowId, status }) => ({
				sourceWorkflowId,
				localId: workflow.id,
				name: workflow.name,
				projectId: target.projectId,
				parentFolderId: workflow.parentFolder?.id ?? null,
				activeVersionId: workflow.activeVersionId ?? null,
				status,
			})),
			bindings: serializeBindings(bindings),
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

			let content: Buffer;
			try {
				content = await reader.readFile(path);
			} catch (cause) {
				throw new UserError(`Package manifest references a missing workflow file at ${path}.`, {
					cause,
				});
			}

			const wire = jsonParse<SerializedWorkflow>(content.toString('utf-8'), {
				errorMessage: `Package workflow file at ${path} is not valid JSON.`,
			});

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

			prepared.push({ entity, sourceWorkflowId: entry.id });
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
