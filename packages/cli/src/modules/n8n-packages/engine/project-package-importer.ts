import type { SerializedCredential, SerializedVariable } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { UnexpectedError } from '@n8n/errors';

import {
	credentialUpdateScope,
	resolveCredentialConflictPolicy,
} from '../entities/credential/credential-conflict-policy';
import {
	followsPackageOwner,
	packageCredentialHomes,
	scopeCredentialDependencies,
} from '../entities/credential/credential-dependencies';
import type {
	CredentialBindingRequest,
	CredentialUpdateScope,
} from '../entities/credential/credential.types';
import type { DataTableImportRequest } from '../entities/data-table/data-table.types';
import { ProjectImporter, projectRefusalError } from '../entities/project/project-importer';
import type { ProjectImportPlan } from '../entities/project/project-import.types';
import type { TagImportRequest } from '../entities/tag/tag.types';
import type { VariableImportRequest } from '../entities/variable/variable.types';
import { collectPlannedWorkflowBindings } from '../entities/workflow/workflow-importer';
import type { PackageReader } from '../io/package-reader';
import type {
	RemovedFolderSummary,
	RemovedWorkflowSummary,
	BlockingIssue,
	ImportBindingMap,
	ImportedFolderSummary,
	ImportedWorkflowSummary,
	ImportPlanMode,
	ResolvedImportRequest,
	ImportTagSummary,
	PackageImportBindings,
	PackageImportSource,
} from '../n8n-packages.types';
import { importSelectionProjects, mergeBindings } from '../n8n-packages.types';
import { assertPackageImportApiKeyScopes, assertProjectWritesAllowed } from './import-gates';
import { CrossProjectMover, type CrossProjectMovePlan } from './cross-project-mover';
import { toImportBlockedError } from './import-blocked.error';
import {
	needsBundledCredentialFiles,
	needsBundledVariableValues,
	placeByLayout,
} from './package-layout';
import {
	ImportOrchestrator,
	type ImportContentResult,
	type ImportOrchestrationInput,
	type ImportPlan,
} from './import-orchestrator';
import {
	buildImportResult,
	credentialsUpdatedAcrossScopes,
	credentialDependencySummary,
	identifyRequirements,
	reconcileCredentialSummary,
	type CredentialDependencyResult,
	reconcileVariableSummary,
	scopeCredentialBindingsToRequirements,
	toImportedWorkflowSummaries,
	toPackageSummary,
	toTagSummary,
	unionTagSummaries,
} from './import-result';
import type { ImportOutcome, PackageImportScope } from './import-telemetry';
import { N8nPackageParser } from './n8n-package-parser';
import { PackageImportPreflight } from './package-import-preflight';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../spec/requirements.schema';
import type { SerializedSkill } from '../spec/serialized/skill.schema';

/** Everything an import will do, read before its first write. */
export interface PackageImportPlan {
	request: ResolvedImportRequest;
	manifest: PackageManifest;
	projectPlan: ProjectImportPlan;
	/** Empty when a project conflict stops the import before its contents are planned. */
	scopes: Array<{ project: ManifestEntry; plan: ImportPlan }>;
	/** Everything that blocks the import, from every stage that could run. */
	issues: BlockingIssue[];
	/**
	 * The moves between projects (`crossProjectMovePolicy=transfer`). `moves` lists each workflow
	 * and folder that changes project, with both project ids. Absent when a project conflict
	 * stopped the plan.
	 */
	crossProjectMoves?: CrossProjectMovePlan;
}

@Service()
export class ProjectPackageImporter {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly projectImporter: ProjectImporter,
		private readonly importOrchestrator: ImportOrchestrator,
		private readonly importPreflight: PackageImportPreflight,
		private readonly crossProjectMover: CrossProjectMover,
	) {}

	async import(
		request: ResolvedImportRequest,
		reader: PackageReader,
		manifest: PackageManifest,
		importSource: PackageImportSource,
	): Promise<ImportOutcome> {
		const plan = await this.planImport(request, reader, manifest, importSource, 'enforce');
		const refusal = plan.projectPlan.conflicts.map(projectRefusalError).find((error) => error);
		if (refusal) throw refusal;
		if (plan.issues.length > 0) throw toImportBlockedError(plan.issues);
		return await this.applyPlan(plan);
	}

	/**
	 * Plans every project of the import and collects the issues that block it. Writes no data.
	 * In `enforce` mode, policy checks write audit events. A refused project is an issue in both
	 * modes, so Apply can report it with the other blockers.
	 */
	async planImport(
		request: ResolvedImportRequest,
		reader: PackageReader,
		manifest: PackageManifest,
		importSource: PackageImportSource,
		mode: ImportPlanMode,
	): Promise<PackageImportPlan> {
		this.assertAdequatePermissions(request, manifest);

		const { selection } = request;
		const selectedProjectIds =
			selection &&
			new Set(importSelectionProjects(selection).map(({ selectedProjectId }) => selectedProjectId));
		const selectedProjects = selectedProjectIds
			? (manifest.projects ?? []).filter((project) => selectedProjectIds.has(project.id))
			: (manifest.projects ?? []);

		const allProjects = await this.packageParser.getProjects(reader);
		const projects = selectedProjectIds
			? allProjects.filter((project) => selectedProjectIds.has(project.sourceProjectId))
			: allProjects;
		const projectPlan = await this.projectImporter.plan(
			request.user,
			projects,
			request.projectConflictPolicy,
		);
		assertProjectWritesAllowed(request.apiKeyScopes, projectPlan.items);
		// A refused project decides the whole import, so report it before reading any project's
		// contents — planning work that is certain to be discarded only delays the same failure.
		if (projectPlan.conflicts.length > 0) {
			return {
				request,
				manifest,
				projectPlan,
				scopes: [],
				issues: projectPlan.conflicts.map(
					(conflict): BlockingIssue => ({ type: 'project-conflict', ...conflict }),
				),
			};
		}

		const bundledVariables = needsBundledVariableValues(
			request,
			(manifest.requirements?.variables?.length ?? 0) > 0,
		)
			? await this.packageParser.getVariables(reader)
			: undefined;
		// Read once for the whole import: every scope looks its credentials up by id.
		const selectsCredentials =
			selection !== undefined &&
			importSelectionProjects(selection).some(
				({ selectedCredentialIds }) => (selectedCredentialIds?.length ?? 0) > 0,
			);
		const packageCredentials = needsBundledCredentialFiles(
			request,
			selectsCredentials || (manifest.requirements?.credentials?.length ?? 0) > 0,
			followsPackageOwner(request.credentialDependencies) &&
				(manifest.credentials?.length ?? 0) > 0,
		)
			? await this.packageParser.getCredentials(reader)
			: undefined;
		const credentialHomes = packageCredentialHomes(
			manifest,
			request.credentialDependencies?.credentialHomes,
		);
		// Read once: Agents in any project can reference an instance skill.
		const packageSkills =
			!request.selection && manifest.agents?.length
				? await this.packageParser.getSkills(reader)
				: [];
		// Projects match by id, so a package project id is also its destination project id.
		const updateScope = credentialUpdateScope(selectedProjects.map(({ id }) => id));
		// Projects the user is creating (vs matching an existing one). They will be admin of these,
		// so publish is always allowed and the project need not exist while its contents are planned.
		const pendingCreateIds = new Set(
			projectPlan.items
				.filter((item) => item.action === 'create')
				.map((item) => item.sourceProjectId),
		);

		// Plan and validate every project's contents before writing anything, so a blocking issue in
		// any project leaves nothing behind — not folders, workflows, nor the project shells.
		const inputs: ImportOrchestrationInput[] = [];
		for (const project of selectedProjects) {
			const input = await this.buildImportContextForProject(
				request,
				reader,
				manifest,
				project,
				pendingCreateIds.has(project.id),
				{
					bundledVariables,
					packageCredentials,
					packageSkills,
					credentialUpdateScope: updateScope,
					credentialHomes,
				},
				importSource,
			);
			inputs.push(input);
		}
		// Across scopes and before them: a move changes what two projects hold.
		const crossProjectMoves = await this.crossProjectMover.plan(inputs);
		for (const input of inputs) {
			input.crossProjectMoves = crossProjectMoves.scopes.get(input.context.projectId);
		}
		const draftPlans = await this.importOrchestrator.planPackage(inputs, mode);
		const { plans, issues } = await this.importPreflight.check(
			draftPlans,
			reader,
			request.apiKeyScopes,
			mode,
		);
		const scopes = selectedProjects.map((project, index) => ({ project, plan: plans[index] }));

		return {
			request,
			manifest,
			projectPlan,
			scopes,
			issues: [...issues, ...crossProjectMoves.issues],
			crossProjectMoves,
		};
	}

	/** Writes a plan that has no issues. */
	async applyPlan(plan: PackageImportPlan): Promise<ImportOutcome> {
		const { request, manifest, projectPlan, scopes: planned } = plan;
		if (plan.issues.length > 0) {
			throw new UnexpectedError('An import plan with blocking issues cannot be applied');
		}

		await this.importOrchestrator.assertCanUpdateCredentials(planned.map(({ plan }) => plan));

		const projectSummaries = await this.projectImporter.apply(request.user, projectPlan.items);

		// After the projects exist and before any content: each scope planned a moved item as an
		// item of its own project. A later deletion of the old project then finds it gone.
		const moves = plan.crossProjectMoves
			? await this.crossProjectMover.apply(request.user, plan.crossProjectMoves)
			: [];

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

		const { workflows: published, agentOutcomes } = await this.importOrchestrator.publishPackage({
			user: request.user,
			publicApi: request.publicApi,
			ctx: request.ctx,
			content: applied.map(({ content }) => content),
			policy: request.publishingPolicy,
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
		let dataTablesUpdated = 0;
		const seeded: string[] = [];
		const incomplete: string[] = [];
		const variablesMatched: string[] = [];
		const variablesMissing: string[] = [];
		const variablesCreated: string[] = [];
		const variablesStubbed: string[] = [];
		const variablesSkipped: string[] = [];
		const variablesUpdated: string[] = [];
		const tagSummaries: ImportTagSummary[] = [];
		const credentialDependencyResults: CredentialDependencyResult[] = [];
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
			dataTablesUpdated += content.dataTablePlan.updates.length;
			seeded.push(...content.credentialResult.seeded);
			incomplete.push(...content.credentialResult.incomplete);
			credentialDependencyResults.push(content.credentialResult);
			variablesMatched.push(...content.variablePlan.matched.map(({ name }) => name));
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
			agentOutcomes,
			workflows,
			removedWorkflows,
			removedFolders,
			folders,
			projects: projectSummaries,
			bindings: mergeBindings(...scopedBindings),
			credentials: {
				...reconcileCredentialSummary({
					matched,
					stubbed,
					seeded,
					incomplete,
					updated: credentialsUpdatedAcrossScopes(
						applied.map(({ content }) => content.credentialResult),
					),
				}),
				// Only an import with these decisions reports them, so other results keep their shape.
				...(request.credentialDependencies
					? credentialDependencySummary(credentialDependencyResults)
					: {}),
			},
			dataTables: {
				matched: dataTablesMatched,
				created: dataTablesCreated,
				updated: dataTablesUpdated,
			},
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
		if (moves.length > 0) result.moves = moves;

		return { result, scopes, agentOutcomes };
	}

	private async buildImportContextForProject(
		request: ResolvedImportRequest,
		reader: PackageReader,
		manifest: PackageManifest,
		project: ManifestEntry,
		projectPendingCreation: boolean,
		/** Read or resolved once for every scope of the import. */
		importWide: {
			bundledVariables: Map<string, SerializedVariable> | undefined;
			packageCredentials: Map<string, SerializedCredential> | undefined;
			packageSkills: SerializedSkill[];
			credentialUpdateScope: CredentialUpdateScope;
			credentialHomes: ReadonlyMap<string, string>;
		},
		importSource: PackageImportSource,
	): Promise<ImportOrchestrationInput> {
		const basePrefix = `${project.target}/`;
		const allFolders = await this.packageParser.getFolders(reader, basePrefix);
		const allWorkflows = await this.packageParser.getWorkflows(reader, basePrefix);
		const agents =
			!request.selection && manifest.agents?.length
				? await this.packageParser.getAgents(reader, basePrefix)
				: [];

		// A selection can hold several projects. Each project reads its own part.
		const selection =
			request.selection &&
			importSelectionProjects(request.selection).find(
				({ selectedProjectId }) => selectedProjectId === project.id,
			);
		// Do not expand the selection to include referenced sub-workflows.
		const workflows = selection
			? allWorkflows.filter((workflow) =>
					selection.selectedWorkflowIds.includes(workflow.sourceWorkflowId),
				)
			: allWorkflows;
		const selectedFolderIds = selection
			? foldersInSelection(allFolders, workflows, selection.selectedFolderIds ?? [])
			: undefined;
		const folders = selectedFolderIds
			? allFolders.filter(({ sourceFolderId }) => selectedFolderIds.has(sourceFolderId))
			: allFolders;

		// Requirements and bindings are both scoped to this project's workflows so another project's
		// binding is not seen as an orphan here (which would block the whole multi-project import).
		const requirements = withSelectedCredentials(
			identifyRequirements(manifest.requirements?.credentials, workflows, agents),
			selection?.selectedCredentialIds,
			importWide.packageCredentials,
		);
		const credentialRequest: CredentialBindingRequest = {
			requirements,
			matchingMode: request.credentialMatchingMode,
			missingMode: request.credentialMissingMode,
			credentialBindings: scopeCredentialBindingsToRequirements(
				request.bindings?.credentials,
				requirements,
			),
			conflictPolicy: resolveCredentialConflictPolicy(request.credentialConflictPolicy),
			personalRoute: request.credentialPersonalRoute,
			packageCredentials: importWide.packageCredentials,
			updateScope: importWide.credentialUpdateScope,
			dependencies: scopeCredentialDependencies(
				request.credentialDependencies,
				importWide.credentialHomes,
				{
					project,
					projectPendingCreation,
					requiredCredentialIds: new Set((requirements ?? []).map(({ id }) => id)),
					isSelection: request.selection !== undefined,
				},
			),
		};

		const dataTableRequest: DataTableImportRequest = {
			requirements: identifyRequirements(manifest.requirements?.dataTables, workflows, agents),
			packageDataTables: await this.packageParser.getDataTables(reader),
			matchingMode: request.dataTableMatchingMode,
			missingMode: request.dataTableMissingMode,
			schemaConflictPolicy: request.dataTableSchemaConflictPolicy,
		};

		const variableRequest: VariableImportRequest = {
			requirements: placeByLayout({
				requirements: identifyRequirements(manifest.requirements?.variables, workflows, agents),
				manifestVariables: manifest.variables,
				scopePrefix: basePrefix,
				bundledVariables: importWide.bundledVariables,
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
				ctx: request.ctx,
				projectId: project.id,
				folderId: null,
				publicApi: request.publicApi,
			},
			folders,
			workflows,
			agents,
			skills: importWide.packageSkills,
			agentRequirements: identifyRequirements(manifest.requirements?.agents, workflows, agents),
			credentialRequest,
			dataTableRequest,
			variableRequest,
			tagRequest,
			options: request,
			projectPendingCreation,
			importSource,
			// Scoped like the requirements above: reconciliation must retain a referenced-but-not-carried
			// sub-workflow, or it would archive a dependency and leave its packaged parent unpublishable.
			subWorkflowRequirements: identifyRequirements(
				manifest.requirements?.workflows,
				workflows,
				agents,
			),
			explicitDeleteWorkflowIds: selection?.deletedWorkflowIds,
			checkRootPlacement: true,
		};
	}

	private assertAdequatePermissions(
		request: ResolvedImportRequest,
		manifest: PackageManifest,
	): void {
		if ((manifest.workflows?.length ?? 0) > 0) {
			assertPackageImportApiKeyScopes(request.apiKeyScopes, ['workflow:import']);
		}

		// Selection imports preserve folders, so explicit deletions need only workflow:delete.
		if (
			request.selection &&
			importSelectionProjects(request.selection).some(
				({ deletedWorkflowIds }) => (deletedWorkflowIds?.length ?? 0) > 0,
			)
		) {
			assertPackageImportApiKeyScopes(request.apiKeyScopes, ['workflow:delete']);
		}
	}
}

/**
 * A selected credential needs no consumer in the import. It joins the requirements of its
 * project without consumers, so the plan matches it and compares it with its package file.
 */
function withSelectedCredentials(
	requirements: PackageCredentialRequirement[] | undefined,
	selectedCredentialIds: string[] | undefined,
	packageCredentials: Map<string, SerializedCredential> | undefined,
): PackageCredentialRequirement[] | undefined {
	if (!selectedCredentialIds?.length) return requirements;
	const required = new Set((requirements ?? []).map(({ id }) => id));
	const selected = selectedCredentialIds.flatMap((id): PackageCredentialRequirement[] => {
		const credential = packageCredentials?.get(id);
		if (!credential || required.has(id)) return [];
		return [{ id, name: credential.name, type: credential.type, usedBy: [] }];
	});
	return [...(requirements ?? []), ...selected];
}

/**
 * The folders that a selection creates, moves or renames: the selected folders and the folders
 * that hold a selected workflow, with every folder above them. Other folders stay as they are.
 */
function foldersInSelection(
	folders: Array<{ sourceFolderId: string; parentFolderId: string | null }>,
	workflows: Array<{ parentFolderId: string | null }>,
	selectedFolderIds: string[],
): Set<string> {
	const parentOf = new Map(
		folders.map(({ sourceFolderId, parentFolderId }) => [sourceFolderId, parentFolderId]),
	);
	const result = new Set<string>();
	for (const start of [...selectedFolderIds, ...workflows.map((w) => w.parentFolderId)]) {
		// A visited folder ends the walk, which also stops a cycle.
		for (
			let current = start;
			current !== null && !result.has(current);
			current = parentOf.get(current) ?? null
		) {
			result.add(current);
		}
	}
	return result;
}
