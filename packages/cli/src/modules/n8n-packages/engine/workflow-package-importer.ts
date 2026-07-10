import { LicenseState } from '@n8n/backend-common';
import type { Project, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';

import type { CredentialBindingRequest } from '../entities/credential/credential.types';
import type {
	PreparedWorkflow,
	WorkflowImportOutcome,
} from '../entities/workflow/workflow-import.types';
import type { ImportContext, ImportPackageRequest, ImportResult } from '../n8n-packages.types';
import type { PackageReader } from '../io/package-reader';
import type { PackageManifest } from '../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../spec/requirements.schema';
import { ImportOrchestrator, type ImportOrchestrationResult } from './import-orchestrator';
import {
	assertPackageImportApiKeyScopes,
	buildImportResult,
	toPackageSummary,
} from './import-result';
import { N8nPackageParser } from './n8n-package-parser';

/**
 * Imports loose top-level workflows, their folder shells, and credential deps into a target project.
 * Resolves the target scope from the request, then delegates plan/gate/apply to ImportOrchestrator.
 */
@Service()
export class WorkflowPackageImporter {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly importOrchestrator: ImportOrchestrator,
		private readonly projectService: ProjectService,
		private readonly folderService: FolderService,
		private readonly eventService: EventService,
		private readonly licenseState: LicenseState,
	) {}

	async import(
		request: ImportPackageRequest,
		reader: PackageReader,
		manifest: PackageManifest,
	): Promise<ImportResult> {
		const folders = await this.packageParser.getFolders(reader);
		if (folders.length > 0) {
			this.assertFoldersLicensed();
			assertPackageImportApiKeyScopes(request.apiKeyScopes, ['folder:create', 'folder:update']);
		}

		const context = await this.findImportLocation(
			request.user,
			request.projectId,
			request.folderId,
			folders.length > 0,
		);

		const workflows = await this.packageParser.getWorkflows(reader);
		const credentialRequest: CredentialBindingRequest = {
			requirements: identifyRequirements(manifest.requirements?.credentials, workflows),
			matchingMode: request.credentialMatchingMode,
			missingMode: request.credentialMissingMode,
			credentialBindings: request.bindings?.credentials,
		};

		const imported = await this.importOrchestrator.import({
			context,
			folders,
			workflows,
			credentialRequest,
			options: request,
		});

		this.emitImportedEvent(request, context, manifest, imported, credentialRequest);

		return buildImportResult({
			package: toPackageSummary(manifest),
			projectId: context.projectId,
			workflows: imported.workflowOutcomes,
			folders: imported.folderSummaries,
			bindings: imported.bindings,
			credentials: {
				matched: imported.credentialResult.matched,
				stubbed: imported.credentialResult.stubbed,
			},
		});
	}

	private assertFoldersLicensed(): void {
		if (!this.licenseState.isLicensed('feat:folders')) {
			throw new ForbiddenError(
				'Your license does not allow folders. Importing a package with folders requires a license that supports folders.',
			);
		}
	}

	private emitImportedEvent(
		request: ImportPackageRequest,
		context: ImportContext,
		manifest: PackageManifest,
		imported: ImportOrchestrationResult,
		credentialRequest: CredentialBindingRequest,
	): void {
		const { workflowOutcomes, credentialResult } = imported;
		const importedWorkflows = workflowOutcomes.filter(({ status }) => status !== 'skipped');
		const countByStatus = (status: WorkflowImportOutcome['status']) =>
			workflowOutcomes.filter((outcome) => outcome.status === status).length;

		this.eventService.emit('n8n-package-imported', {
			user: context.user,
			projectId: context.projectId,
			folderId: context.folderId,
			workflowIds: importedWorkflows.map(({ workflow }) => workflow.id),
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
				matched: credentialResult.matched.map(
					(sourceId) => credentialResult.bindings.get(sourceId)!,
				),
				created: credentialResult.stubbed.map(
					(sourceId) => credentialResult.bindings.get(sourceId)!,
				),
				updated: [],
			},
			counts: {
				workflows: {
					created: countByStatus('created'),
					updated: countByStatus('updated'),
					skipped: countByStatus('skipped'),
				},
				credentials: {
					matched: credentialResult.matched.length,
					created: credentialResult.stubbed.length,
					requirements: credentialRequest.requirements?.length ?? 0,
				},
			},
		});
	}

	private async findImportLocation(
		user: User,
		projectId: string | undefined,
		folderId: string | undefined,
		needsFolderCreate: boolean,
	): Promise<ImportContext> {
		const scopes: Scope[] = needsFolderCreate
			? ['workflow:import', 'folder:create', 'folder:update']
			: ['workflow:import'];
		const project = await this.resolveImportProject(user, projectId, scopes);
		await this.assertFolderExistsInProject(folderId, project.id);

		return { user, projectId: project.id, folderId: folderId ?? null };
	}

	private async resolveImportProject(
		user: User,
		projectId: string | undefined,
		scopes: Scope[],
	): Promise<Project> {
		if (projectId === undefined) {
			const personalProject = await this.projectService.getPersonalProject(user);
			if (!personalProject) {
				throw new NotFoundError('Personal project not found');
			}
			return personalProject;
		}

		const project = await this.projectService.getProjectWithScope(user, projectId, scopes);
		if (project) {
			return project;
		}

		if (!(await this.projectService.findProject(projectId))) {
			throw new NotFoundError(`Project not found: ${projectId}`);
		}
		throw new ForbiddenError('You do not have permission to import into this project.');
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

/** Keeps only the credential requirements used by the imported workflows, trimming `usedByWorkflows` to match. */
function identifyRequirements(
	requirements: PackageCredentialRequirement[] | undefined,
	workflows: PreparedWorkflow[],
): PackageCredentialRequirement[] | undefined {
	if (!requirements) return undefined;

	const importedIds = new Set(workflows.map((workflow) => workflow.sourceWorkflowId));
	return requirements
		.map((requirement) => ({
			...requirement,
			usedByWorkflows: requirement.usedByWorkflows.filter((id) => importedIds.has(id)),
		}))
		.filter((requirement) => requirement.usedByWorkflows.length > 0);
}
