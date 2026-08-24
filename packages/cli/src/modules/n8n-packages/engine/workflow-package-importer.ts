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
import type { DataTableImportRequest } from '../entities/data-table/data-table.types';
import type { TagImportRequest } from '../entities/tag/tag.types';
import type { VariableImportRequest } from '../entities/variable/variable.types';
import { WorkflowPublisher } from '../entities/workflow/workflow-publisher';
import type { PackageReader } from '../io/package-reader';
import { VariableParentPolicy } from '../n8n-packages.types';
import type {
	ImportContext,
	ImportResult,
	ResolvedImportPackageRequest,
} from '../n8n-packages.types';
import { assertPackageImportApiKeyScopes, assertTagWritesAllowed } from './import-gates';
import { ImportOrchestrator } from './import-orchestrator';
import {
	buildImportResult,
	identifyRequirements,
	toImportedWorkflowSummaries,
	toPackageSummary,
	toTagSummary,
	toVariableSummary,
} from './import-result';
import { emitPackageImportedEvent } from './import-telemetry';
import { N8nPackageParser } from './n8n-package-parser';
import { needsBundledVariableValues, placeByPolicy } from './package-layout';
import type { PackageManifest } from '../spec/manifest.schema';

/**
 * Imports loose top-level workflows, their folder shells, and credential & data table deps into a target project.
 * Resolves the target scope from the request, then delegates plan/gate/apply to ImportOrchestrator.
 */
@Service()
export class WorkflowPackageImporter {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly importOrchestrator: ImportOrchestrator,
		private readonly workflowPublisher: WorkflowPublisher,
		private readonly projectService: ProjectService,
		private readonly folderService: FolderService,
		private readonly eventService: EventService,
		private readonly licenseState: LicenseState,
	) {}

	async import(
		request: ResolvedImportPackageRequest,
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

		const dataTableRequirements = identifyRequirements(
			manifest.requirements?.dataTables,
			workflows,
		);
		if (dataTableRequirements?.length && request.dataTableMissingMode === 'create') {
			assertPackageImportApiKeyScopes(request.apiKeyScopes, ['dataTable:create']);
		}
		const dataTableRequest: DataTableImportRequest = {
			requirements: dataTableRequirements,
			packageDataTables: await this.packageParser.getDataTables(reader),
			matchingMode: request.dataTableMatchingMode,
			missingMode: request.dataTableMissingMode,
			schemaConflictPolicy: request.dataTableSchemaConflictPolicy,
		};

		const variableRequirements = identifyRequirements(manifest.requirements?.variables, workflows);
		const bundledVariables = needsBundledVariableValues(
			request,
			(variableRequirements?.length ?? 0) > 0,
		)
			? await this.packageParser.getVariables(reader)
			: undefined;
		const variableRequest: VariableImportRequest = {
			requirements: placeByPolicy({
				requirements: variableRequirements,
				manifestVariables: manifest.variables,
				policy: request.variableParentPolicy ?? VariableParentPolicy.Project,
				bundledVariables,
			}),
			missingMode: request.variableMissingMode,
			conflictPolicy: request.variableConflictPolicy,
		};

		const tagRequest: TagImportRequest = {
			requirements: manifest.requirements?.tags,
			missingMode: request.tagMissingMode,
			conflictPolicy: request.tagConflictPolicy,
		};

		const plan = await this.importOrchestrator.plan({
			context,
			folders,
			workflows,
			credentialRequest,
			dataTableRequest,
			variableRequest,
			tagRequest,
			options: request,
			subWorkflowRequirements: identifyRequirements(manifest.requirements?.workflows, workflows),
		});

		assertTagWritesAllowed(request.apiKeyScopes, [plan.tagPlan]);
		await this.importOrchestrator.assertNotBlocked([plan], { apiKeyScopes: request.apiKeyScopes });

		const content = await this.importOrchestrator.apply(plan);

		// Publishing waits until every workflow is written: activation rejects a parent whose
		// referenced sub-workflow is not yet published, so the order is resolved across the batch.
		const published = await this.workflowPublisher.applyToPackage({
			user: request.user,
			persisted: content.workflowOutcomes,
			policy: request.workflowPublishingPolicy,
			subWorkflowRequirements: plan.input.subWorkflowRequirements,
		});

		emitPackageImportedEvent(this.eventService, {
			request,
			manifest,
			scopes: [
				{
					context,
					imported: content,
					credentialRequest,
					dataTableRequest,
					variableRequest,
					tagRequest,
				},
			],
		});

		return buildImportResult({
			package: toPackageSummary(manifest),
			workflows: toImportedWorkflowSummaries(
				content.workflowOutcomes,
				context.projectId,
				published,
			),
			// Always empty: `folderConflictPolicy=overwrite` is rejected for workflow packages.
			removedWorkflows: content.removedWorkflows,
			removedFolders: content.removedFolders,
			folders: content.folderSummaries,
			projects: [],
			bindings: content.bindings,
			credentials: {
				matched: content.credentialResult.matched,
				stubbed: content.credentialResult.stubbed,
			},
			variables: toVariableSummary(content.variablePlan, content.variableResult),
			tags: toTagSummary(content.tagPlan),
		});
	}

	private assertFoldersLicensed(): void {
		if (!this.licenseState.isLicensed('feat:folders')) {
			throw new ForbiddenError(
				'Your license does not allow folders. Importing a package with folders requires a license that supports folders.',
			);
		}
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
