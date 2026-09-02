import { LicenseState } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { CredentialBindingRequest } from '../entities/credential/credential.types';
import { removesUnpackagedWorkflows } from '../entities/folder/folder-conflict-policy';
import type { DataTableImportRequest } from '../entities/data-table/data-table.types';
import { ProjectImporter } from '../entities/project/project-importer';
import type { TagImportRequest } from '../entities/tag/tag.types';
import type { VariableImportRequest } from '../entities/variable/variable.types';
import { collectPlannedWorkflowBindings } from '../entities/workflow/workflow-importer';
import { WorkflowPublisher } from '../entities/workflow/workflow-publisher';
import type { PackageReader } from '../io/package-reader';
import type {
	RemovedFolderSummary,
	RemovedWorkflowSummary,
	BlockingIssue,
	ImportBindingMap,
	ImportedFolderSummary,
	ImportedWorkflowSummary,
	ResolvedImportRequest,
	ImportTagSummary,
	PackageImportBindings,
	PackageImportSource,
} from '../n8n-packages.types';
import { mergeBindings } from '../n8n-packages.types';
import { assertPackageImportApiKeyScopes, assertTagWritesAllowed } from './import-gates';
import { toImportBlockedError } from './import-blocked.error';
import { needsBundledVariableValues, placeByLayout } from './package-layout';
import {
	ImportOrchestrator,
	type ImportContentResult,
	type ImportOrchestrationInput,
	type ImportPlan,
} from './import-orchestrator';
import {
	buildImportResult,
	identifyRequirements,
	reconcileVariableSummary,
	scopeCredentialBindingsToRequirements,
	toImportedWorkflowSummaries,
	toPackageSummary,
	toTagSummary,
	unionTagSummaries,
} from './import-result';
import type { ImportOutcome, PackageImportScope } from './import-telemetry';
import { N8nPackageParser } from './n8n-package-parser';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import type { SerializedVariable } from '../spec/serialized/variable.schema';

@Service()
export class ProjectPackageImporter {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly projectImporter: ProjectImporter,
		private readonly importOrchestrator: ImportOrchestrator,
		private readonly workflowPublisher: WorkflowPublisher,
		private readonly licenseState: LicenseState,
	) {}

	async import(
		request: ResolvedImportRequest,
		reader: PackageReader,
		manifest: PackageManifest,
		importSource: PackageImportSource,
	): Promise<ImportOutcome> {
		this.assertAdequatePermissions(request, manifest);

		const projects = await this.packageParser.getProjects(reader);
		const projectPlan = await this.projectImporter.plan(
			request.user,
			projects,
			request.projectConflictPolicy,
		);
		// A refused project decides the whole import, so report it before reading any project's
		// contents — planning work that is certain to be discarded only delays the same failure.
		if (projectPlan.conflicts.length > 0) {
			throw toImportBlockedError(
				projectPlan.conflicts.map(
					(conflict): BlockingIssue => ({ type: 'project-conflict', ...conflict }),
				),
			);
		}

		const bundledVariables = needsBundledVariableValues(
			request,
			(manifest.requirements?.variables?.length ?? 0) > 0,
		)
			? await this.packageParser.getVariables(reader)
			: undefined;
		// Projects the user is creating (vs matching an existing one). They will be admin of these,
		// so publish is always allowed and the project need not exist while its contents are planned.
		const pendingCreateIds = new Set(
			projectPlan.items
				.filter((item) => item.action === 'create')
				.map((item) => item.sourceProjectId),
		);

		// Plan and validate every project's contents before writing anything, so a blocking issue in
		// any project leaves nothing behind — not folders, workflows, nor the project shells.
		const planned: Array<{ project: ManifestEntry; plan: ImportPlan }> = [];
		for (const project of manifest.projects ?? []) {
			const input = await this.buildImportContextForProject(
				request,
				reader,
				manifest,
				project,
				pendingCreateIds.has(project.id),
				bundledVariables,
				importSource,
			);
			const plan = await this.importOrchestrator.plan(input);
			planned.push({ project, plan });
		}

		assertTagWritesAllowed(
			request.apiKeyScopes,
			planned.map(({ plan }) => plan.tagPlan),
		);
		await this.importOrchestrator.assertNotBlocked(
			planned.map(({ plan }) => plan),
			{ apiKeyScopes: request.apiKeyScopes },
		);

		const projectSummaries = await this.projectImporter.apply(request.user, projectPlan.items);

		// Resolve every project's workflow ids up front so a sub-workflow reference
		// that points into another project resolves when its parent is applied.
		const packageWorkflowBindings: ImportBindingMap = new Map(
			planned.flatMap(({ plan }) => [...collectPlannedWorkflowBindings(plan.workflowPlan.items)]),
		);

		// Write every project's content first. Publishing waits for the sweep below, so a project's
		// position here does not decide whether a cross-project sub-workflow exists in time.
		const applied: Array<{
			project: ManifestEntry;
			plan: ImportPlan;
			content: ImportContentResult;
		}> = [];
		for (const { project, plan } of planned) {
			applied.push({
				project,
				plan,
				content: await this.importOrchestrator.apply(plan, packageWorkflowBindings),
			});
		}

		// Publishing spans projects: activation rejects a parent whose sub-workflow is not yet
		// published, and that dependency can point into any project — so it is one package-wide,
		// dependency-ordered sweep over everything just written.
		const published = await this.workflowPublisher.applyToPackage({
			user: request.user,
			persisted: applied.flatMap(({ content }) => content.workflowOutcomes),
			policy: request.workflowPublishingPolicy,
			subWorkflowRequirements: manifest.requirements?.workflows,
		});

		const workflows: ImportedWorkflowSummary[] = [];
		const removedWorkflows: RemovedWorkflowSummary[] = [];
		const removedFolders: RemovedFolderSummary[] = [];
		const folders: ImportedFolderSummary[] = [];
		const scopedBindings: PackageImportBindings[] = [];
		const matched: string[] = [];
		const stubbed: string[] = [];
		let dataTablesMatched = 0;
		let dataTablesCreated = 0;
		const variablesMatched: string[] = [];
		const variablesMissing: string[] = [];
		const variablesCreated: string[] = [];
		const variablesStubbed: string[] = [];
		const variablesSkipped: string[] = [];
		const variablesUpdated: string[] = [];
		const tagSummaries: ImportTagSummary[] = [];
		const scopes: PackageImportScope[] = [];

		for (const { project, plan, content } of applied) {
			workflows.push(
				...toImportedWorkflowSummaries(content.workflowOutcomes, project.id, published),
			);
			removedWorkflows.push(...content.removedWorkflows);
			removedFolders.push(...content.removedFolders);
			folders.push(...content.folderSummaries);
			scopedBindings.push(content.bindings);
			matched.push(...content.credentialResult.matched);
			stubbed.push(...content.credentialResult.stubbed);
			dataTablesMatched += content.dataTablePlan.matchedCount;
			dataTablesCreated += content.dataTablePlan.creations.length;
			variablesMatched.push(...content.variablePlan.matched);
			variablesMissing.push(...content.variablePlan.missing.map(({ name }) => name));
			variablesCreated.push(...content.variableResult.created);
			variablesStubbed.push(...content.variableResult.stubbed);
			variablesSkipped.push(...content.variableResult.skippedExisting);
			variablesUpdated.push(...content.variableResult.updated);
			tagSummaries.push(toTagSummary(content.tagPlan));
			scopes.push({
				context: plan.input.context,
				imported: content,
				credentialRequest: plan.input.credentialRequest,
				dataTableRequest: plan.input.dataTableRequest,
				variableRequest: plan.input.variableRequest,
				tagRequest: plan.input.tagRequest,
			});
		}

		const result = buildImportResult({
			package: toPackageSummary(manifest),
			workflows,
			removedWorkflows,
			removedFolders,
			folders,
			projects: projectSummaries,
			bindings: mergeBindings(...scopedBindings),
			credentials: { matched, stubbed },
			dataTables: { matched: dataTablesMatched, created: dataTablesCreated },
			variables: reconcileVariableSummary({
				matched: variablesMatched,
				missing: variablesMissing,
				created: variablesCreated,
				stubbed: variablesStubbed,
				skipped: variablesSkipped,
				updated: variablesUpdated,
			}),
			tags: unionTagSummaries(tagSummaries),
		});

		return { result, scopes };
	}

	private async buildImportContextForProject(
		request: ResolvedImportRequest,
		reader: PackageReader,
		manifest: PackageManifest,
		project: ManifestEntry,
		projectPendingCreation: boolean,
		bundledVariables: Map<string, SerializedVariable> | undefined,
		importSource: PackageImportSource,
	): Promise<ImportOrchestrationInput> {
		const basePrefix = `${project.target}/`;
		const folders = await this.packageParser.getFolders(reader, basePrefix);
		const workflows = await this.packageParser.getWorkflows(reader, basePrefix);

		// Requirements and bindings are both scoped to this project's workflows so another project's
		// binding is not seen as an orphan here (which would block the whole multi-project import).
		const requirements = identifyRequirements(manifest.requirements?.credentials, workflows);
		const credentialRequest: CredentialBindingRequest = {
			requirements,
			matchingMode: request.credentialMatchingMode,
			missingMode: request.credentialMissingMode,
			credentialBindings: scopeCredentialBindingsToRequirements(
				request.bindings?.credentials,
				requirements,
			),
		};

		const dataTableRequest: DataTableImportRequest = {
			requirements: identifyRequirements(manifest.requirements?.dataTables, workflows),
			packageDataTables: await this.packageParser.getDataTables(reader),
			matchingMode: request.dataTableMatchingMode,
			missingMode: request.dataTableMissingMode,
			schemaConflictPolicy: request.dataTableSchemaConflictPolicy,
		};

		const variableRequest: VariableImportRequest = {
			requirements: placeByLayout({
				requirements: identifyRequirements(manifest.requirements?.variables, workflows),
				manifestVariables: manifest.variables,
				scopePrefix: basePrefix,
				bundledVariables,
			}),
			missingMode: request.variableMissingMode,
			conflictPolicy: request.variableConflictPolicy,
		};

		// Untrimmed on purpose: the tag importer scopes by this project's workflows' own
		// `tagIds`, so another project's requirements are simply never referenced here.
		const tagRequest: TagImportRequest = {
			requirements: manifest.requirements?.tags,
			missingMode: request.tagMissingMode,
			conflictPolicy: request.tagConflictPolicy,
		};

		return {
			context: {
				user: request.user,
				projectId: project.id,
				folderId: null,
			},
			folders,
			workflows,
			credentialRequest,
			dataTableRequest,
			variableRequest,
			tagRequest,
			options: request,
			projectPendingCreation,
			importSource,
			// Scoped like the requirements above: reconciliation must retain a referenced-but-not-carried
			// sub-workflow, or it would archive a dependency and leave its packaged parent unpublishable.
			subWorkflowRequirements: identifyRequirements(manifest.requirements?.workflows, workflows),
		};
	}

	private assertAdequatePermissions(
		request: ResolvedImportRequest,
		manifest: PackageManifest,
	): void {
		// A project package can create new projects or update matched ones (by source id), so require both —
		// mirroring the folder create+update assertion below.
		assertPackageImportApiKeyScopes(request.apiKeyScopes, ['project:create', 'project:update']);

		if ((manifest.folders?.length ?? 0) > 0) {
			if (!this.licenseState.isLicensed('feat:folders')) {
				throw new ForbiddenError(
					'Your license does not allow folders. Importing a package with folders requires a license that supports folders.',
				);
			}
			assertPackageImportApiKeyScopes(request.apiKeyScopes, ['folder:create', 'folder:update']);
		}

		if ((manifest.workflows?.length ?? 0) > 0) {
			assertPackageImportApiKeyScopes(request.apiKeyScopes, ['workflow:import']);
		}

		// `overwrite` archives workflows the package omits, so require the scope up front rather than
		// discovering mid-import that the caller may not remove what reconciliation demands.
		if (removesUnpackagedWorkflows(request.folderConflictPolicy)) {
			// Folders it empties go too, so it needs both removal scopes up front.
			assertPackageImportApiKeyScopes(request.apiKeyScopes, ['workflow:delete', 'folder:delete']);
		}
	}
}
