import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';

import { CredentialImporter } from '../entities/credential/credential-importer';
import type {
	CredentialBindingRequest,
	CredentialResolution,
} from '../entities/credential/credential.types';
import type {
	WorkflowImportOutcome,
	WorkflowImportPlan,
} from '../entities/workflow/workflow-import.types';
import { WorkflowImporter } from '../entities/workflow/workflow-importer';
import { WorkflowPublisher } from '../entities/workflow/workflow-publisher';
import { toImportBlockedError } from './import-blocked.error';
import { N8nPackageParser } from './n8n-package-parser';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { PackageImportConfig } from '../n8n-packages.config';

import { createBindings, serializeBindings } from '../n8n-packages.types';
import type {
	BlockingIssue,
	ImportPackageRequest,
	ImportPackageSummary,
	ImportResult,
	PackageImportBindings,
} from '../n8n-packages.types';

interface ImportTarget {
	projectId: string;
	folderId: string | null;
}

@Service()
export class ImportPipeline {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly credentialImporter: CredentialImporter,
		private readonly packageImportConfig: PackageImportConfig,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly folderService: FolderService,
		private readonly eventService: EventService,
		private readonly workflowImporter: WorkflowImporter,
		private readonly workflowPublisher: WorkflowPublisher,
	) {}

	async run(request: ImportPackageRequest): Promise<ImportResult> {
		const { target, project } = await this.resolveTarget(
			request.user,
			request.projectId,
			request.folderId,
		);

		// PublishAll requires publish scope up front; other policies are checked per workflow
		await this.workflowPublisher.assertCanPublish(
			request.user,
			target.projectId,
			request.workflowPublishingPolicy,
		);

		const reader = new TarPackageReader(request.packageBuffer, this.packageImportConfig);
		const manifest = await this.packageParser.getManifest(reader);
		const workflowsForImport = await this.packageParser.getWorkflows(reader);

		const credentialRequest: CredentialBindingRequest = {
			requirements: manifest.requirements?.credentials,
			matchingMode: request.credentialMatchingMode,
			missingMode: request.credentialMissingMode,
			credentialBindings: request.credentialBindings,
			targetProject: project,
			user: request.user,
		};

		const credentialPlan = await this.credentialImporter.plan(credentialRequest);
		const workflowPlan = await this.workflowImporter.plan(
			{ user: request.user, ...target, publishingPolicy: request.workflowPublishingPolicy },
			workflowsForImport,
			request,
		);

		const blockingIssues = this.collectBlockingIssues(
			workflowPlan,
			credentialPlan,
			credentialRequest,
		);

		const packageSummary: ImportPackageSummary = {
			sourceN8nVersion: manifest.sourceN8nVersion,
			sourceId: manifest.sourceId,
			exportedAt: manifest.exportedAt,
		};

		if (blockingIssues.length > 0) {
			throw toImportBlockedError(blockingIssues);
		}

		const { outcomes, bindings } = await this.workflowImporter.apply(
			workflowPlan,
			{ user: request.user, ...target, publishingPolicy: request.workflowPublishingPolicy },
			createBindings({ credentials: credentialPlan.successes }),
		);

		const imported = outcomes.filter(({ status }) => status !== 'skipped');
		this.eventService.emit('workflows-imported', {
			user: request.user,
			projectId: target.projectId,
			workflowIds: imported.map(({ workflow }) => workflow.id),
			packageSourceId: manifest.sourceId,
			packageVersion: manifest.packageFormatVersion,
			matchedCredentialIds: [...credentialPlan.successes.values()],
		});

		return this.buildResult(packageSummary, target.projectId, outcomes, bindings);
	}

	/** Folds every subsystem's blocking conditions into one uniformly-typed list. */
	private collectBlockingIssues(
		workflowPlan: WorkflowImportPlan,
		credentialResolution: CredentialResolution,
		credentialRequest: CredentialBindingRequest,
	): BlockingIssue[] {
		const workflowConflicts: BlockingIssue[] = workflowPlan.conflicts.map((conflict) => ({
			type: 'workflow-conflict',
			...conflict,
		}));

		const workflowIdConflicts: BlockingIssue[] = workflowPlan.idConflicts.map((conflict) => ({
			type: 'workflow-id-conflict',
			...conflict,
		}));

		const workflowFolderConflicts: BlockingIssue[] = workflowPlan.folderConflicts.map(
			(conflict) => ({
				type: 'workflow-folder-conflict',
				...conflict,
			}),
		);

		const credentialFailures: BlockingIssue[] = this.credentialImporter
			.blockingFailures(credentialResolution, credentialRequest)
			.map(({ kind, sourceId, targetId, usedByWorkflows }) => ({
				type: 'credential-unresolved',
				kind,
				sourceId,
				...(targetId ? { targetId } : {}),
				usedByWorkflows,
			}));

		return [
			...workflowConflicts,
			...workflowIdConflicts,
			...workflowFolderConflicts,
			...credentialFailures,
		];
	}

	private buildResult(
		packageSummary: ImportPackageSummary,
		projectId: string,
		outcomes: WorkflowImportOutcome[],
		bindings: PackageImportBindings,
	): ImportResult {
		return {
			package: packageSummary,
			workflows: outcomes.map(({ workflow, sourceWorkflowId, status }) => ({
				sourceWorkflowId,
				localId: workflow.id,
				name: workflow.name,
				projectId,
				parentFolderId: workflow.parentFolder?.id ?? null,
				activeVersionId: workflow.activeVersionId ?? null,
				status,
			})),
			bindings: serializeBindings(bindings),
		};
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
