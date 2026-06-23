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
import { workflowsBlockedFromPublish } from '../entities/credential/credential-missing-mode';
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
	ImportContext,
	ImportCredentialSummary,
	ImportPackageRequest,
	ImportPackageSummary,
	ImportResult,
	PackageImportBindings,
} from '../n8n-packages.types';

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
		const context = await this.resolveTarget(request.user, request.projectId, request.folderId);

		// PublishAll requires publish scope up front; other policies are checked per workflow
		await this.workflowPublisher.assertCanPublish(
			context.user,
			context.projectId,
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
		};

		const credentialPlan = await this.credentialImporter.plan(context, credentialRequest);
		const workflowPlan = await this.workflowImporter.plan(context, workflowsForImport, request);

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

		const credentialApply = await this.credentialImporter.apply(
			context,
			credentialRequest,
			credentialPlan,
		);
		const publishBlockedSourceWorkflowIds = workflowsBlockedFromPublish(
			credentialRequest.requirements,
			new Set(credentialApply.stubbed),
		);

		const { outcomes, bindings } = await this.workflowImporter.apply(
			{
				...context,
				publishingPolicy: request.workflowPublishingPolicy,
				publishBlockedSourceWorkflowIds,
			},
			workflowPlan,
			createBindings({ credentials: credentialApply.bindings }),
		);

		const imported = outcomes.filter(({ status }) => status !== 'skipped');
		this.eventService.emit('workflows-imported', {
			user: context.user,
			projectId: context.projectId,
			folderId: context.folderId,
			workflowIds: imported.map(({ workflow }) => workflow.id),
			options: {
				workflowConflictPolicy: request.workflowConflictPolicy,
				workflowIdPolicy: request.workflowIdPolicy,
				credentialMatchingMode: request.credentialMatchingMode,
				credentialMissingMode: request.credentialMissingMode,
				workflowPublishingPolicy: request.workflowPublishingPolicy,
			},
			packageSourceId: manifest.sourceId,
			packageVersion: manifest.packageFormatVersion,
			credentialIds: {
				matched: credentialApply.matched.map((sourceId) => credentialApply.bindings.get(sourceId)!),
				created: credentialApply.stubbed.map((sourceId) => credentialApply.bindings.get(sourceId)!),
				updated: [],
			},
		});

		return this.buildResult(packageSummary, context.projectId, outcomes, bindings, {
			matched: credentialApply.matched,
			stubbed: credentialApply.stubbed,
		});
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
			.blockingFailures(credentialRequest, credentialResolution)
			.map(({ kind, sourceId, targetId, expectedType, actualType, usedByWorkflows }) => ({
				type: 'credential-unresolved',
				kind,
				sourceId,
				...(targetId ? { targetId } : {}),
				...(expectedType ? { expectedType } : {}),
				...(actualType ? { actualType } : {}),
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
		credentials: ImportCredentialSummary,
	): ImportResult {
		return {
			package: packageSummary,
			workflows: outcomes.map(({ workflow, sourceWorkflowId, status, publishing }) => ({
				sourceWorkflowId,
				localId: workflow.id,
				name: workflow.name,
				projectId,
				parentFolderId: workflow.parentFolder?.id ?? null,
				activeVersionId: workflow.activeVersionId ?? null,
				publishing,
				status,
			})),
			bindings: serializeBindings(bindings),
			credentials,
		};
	}

	private async resolveTarget(
		user: User,
		projectId: string | undefined,
		folderId: string | undefined,
	): Promise<ImportContext> {
		const project = await this.resolveImportProject(user, projectId);
		await this.assertFolderExistsInProject(folderId, project.id);

		return { user, projectId: project.id, folderId: folderId ?? null };
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
