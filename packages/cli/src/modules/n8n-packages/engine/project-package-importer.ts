import { LicenseState } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';

import type { CredentialBindingRequest } from '../entities/credential/credential.types';
import type { DataTableImportRequest } from '../entities/data-table/data-table.types';
import { ProjectImporter } from '../entities/project/project-importer';
import {
	computeVariableLimitFailure,
	dedupeCreationsByDestination,
	isRequirementAGlobalVariable,
} from '../entities/variable/variable.types';
import type { VariableImportRequest } from '../entities/variable/variable.types';
import type { PackageReader } from '../io/package-reader';
import type {
	BlockingIssue,
	ImportedFolderSummary,
	ImportedWorkflowSummary,
	ImportPackageRequest,
	ImportResult,
	PackageImportBindings,
} from '../n8n-packages.types';
import { mergeBindings } from '../n8n-packages.types';
import { toImportBlockedError } from './import-blocked.error';
import {
	ImportOrchestrator,
	type ImportOrchestrationInput,
	type ImportPlan,
} from './import-orchestrator';
import {
	assertPackageImportApiKeyScopes,
	buildImportResult,
	identifyRequirements,
	scopeCredentialBindingsToRequirements,
	toImportedWorkflowSummaries,
	toPackageSummary,
} from './import-result';
import { emitPackageImportedEvent, type PackageImportScope } from './import-telemetry';
import { N8nPackageParser } from './n8n-package-parser';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';

@Service()
export class ProjectPackageImporter {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly projectImporter: ProjectImporter,
		private readonly importOrchestrator: ImportOrchestrator,
		private readonly eventService: EventService,
		private readonly licenseState: LicenseState,
		private readonly variablesService: VariablesService,
	) {}

	async import(
		request: ImportPackageRequest,
		reader: PackageReader,
		manifest: PackageManifest,
	): Promise<ImportResult> {
		this.assertAdequatePermissions(request, manifest);

		const projects = await this.packageParser.getProjects(reader);
		const projectPlan = await this.projectImporter.plan(request.user, projects);
		// Projects the user is creating (vs matching an existing one). They will be admin of these,
		// so publish is always allowed and the project need not exist while its contents are planned.
		const pendingCreateIds = new Set(
			projectPlan.filter((item) => item.action === 'create').map((item) => item.sourceProjectId),
		);

		// Plan and validate every project's contents before writing anything, so a blocking issue in
		// any project leaves nothing behind — not folders, workflows, nor the project shells.
		const planned: Array<{ project: ManifestEntry; plan: ImportPlan }> = [];
		const blockingIssues: BlockingIssue[] = [];
		for (const project of manifest.projects ?? []) {
			const input = await this.buildImportContextForProject(
				request,
				reader,
				manifest,
				project,
				pendingCreateIds.has(project.id),
			);
			const plan = await this.importOrchestrator.plan(input);
			planned.push({ project, plan });
			blockingIssues.push(...plan.blockingIssues);
		}

		// One instance-wide quota check across every scope. Per-scope checks are disabled
		// (checkQuota: false) so each scope cannot pass while the package total exceeds the cap and
		// so a single overrun is not reported N times. Planned creations are deduplicated by their
		// exact destination — a global variable planned by several consuming scopes is one new row.
		const plannedCreations = dedupeCreationsByDestination(
			planned.flatMap(({ plan }) => plan.variablePlan.creations),
		);
		// Warm by now: every scope's plan already resolved variables through the same cache.
		const existingVariableCount = (await this.variablesService.getAllCached()).length;
		const aggregateLimitFailure = computeVariableLimitFailure(
			plannedCreations,
			existingVariableCount,
			this.licenseState.getMaxVariables(),
		);
		if (aggregateLimitFailure) {
			blockingIssues.push({ type: 'variable-limit-exceeded', ...aggregateLimitFailure });
		}

		if (blockingIssues.length > 0) {
			throw toImportBlockedError(blockingIssues);
		}

		const projectSummaries = await this.projectImporter.apply(request.user, projectPlan);

		const workflows: ImportedWorkflowSummary[] = [];
		const folders: ImportedFolderSummary[] = [];
		const scopedBindings: PackageImportBindings[] = [];
		const matched: string[] = [];
		const stubbed: string[] = [];
		const variablesMatched = new Set<string>();
		const variablesMissing = new Set<string>();
		const variablesStubbed = new Set<string>();
		const variablesSkipped = new Set<string>();
		const scopes: PackageImportScope[] = [];

		for (const { project, plan } of planned) {
			const imported = await this.importOrchestrator.apply(plan);
			workflows.push(...toImportedWorkflowSummaries(imported.workflowOutcomes, project.id));
			folders.push(...imported.folderSummaries);
			scopedBindings.push(imported.bindings);
			matched.push(...imported.credentialResult.matched);
			stubbed.push(...imported.credentialResult.stubbed);
			imported.variablePlan.matched.forEach((name) => variablesMatched.add(name));
			imported.variablePlan.missing.forEach(({ name }) => variablesMissing.add(name));
			imported.variableResult.stubbed.forEach((name) => variablesStubbed.add(name));
			imported.variableResult.skippedExisting.forEach((name) => variablesSkipped.add(name));
			scopes.push({
				context: plan.input.context,
				imported,
				credentialRequest: plan.input.credentialRequest,
				dataTableRequest: plan.input.dataTableRequest,
				variableRequest: plan.input.variableRequest,
			});
		}

		// A skip means apply found the variable's destination already occupied, so this scope created
		// nothing even though the name now resolves. If no scope stubbed the name, the occupying row
		// came from outside this import, so the name counts as matched. If a scope did stub it, the
		// occupier was this import's own creation (e.g. an earlier scope's global stub); the name is
		// already reported as stubbed, and also reporting it as matched would imply it pre-existed.
		for (const name of variablesSkipped) {
			if (!variablesStubbed.has(name)) variablesMatched.add(name);
		}
		const variablesMissingFinal = [...variablesMissing].filter(
			(name) => !variablesStubbed.has(name) && !variablesSkipped.has(name),
		);

		emitPackageImportedEvent(this.eventService, { request, manifest, scopes });

		return buildImportResult({
			package: toPackageSummary(manifest),
			workflows,
			folders,
			projects: projectSummaries,
			bindings: mergeBindings(...scopedBindings),
			credentials: { matched, stubbed },
			variables: {
				matched: [...variablesMatched],
				missing: variablesMissingFinal,
				stubbed: [...variablesStubbed],
			},
		});
	}

	private async buildImportContextForProject(
		request: ImportPackageRequest,
		reader: PackageReader,
		manifest: PackageManifest,
		project: ManifestEntry,
		projectPendingCreation: boolean,
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
			requirements: identifyRequirements(manifest.requirements?.variables, workflows)?.map(
				(requirement) => ({
					...requirement,
					globalPlacement: isRequirementAGlobalVariable(
						manifest.variables,
						project.target,
						requirement.name,
					),
				}),
			),
			missingMode: request.variableMissingMode,
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
			options: request,
			projectPendingCreation,
			checkQuota: false,
		};
	}

	private assertAdequatePermissions(
		request: ImportPackageRequest,
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

		if (
			(manifest.requirements?.variables?.length ?? 0) > 0 &&
			request.variableMissingMode === 'create-stub'
		) {
			assertPackageImportApiKeyScopes(request.apiKeyScopes, ['variable:create']);
		}
	}
}
