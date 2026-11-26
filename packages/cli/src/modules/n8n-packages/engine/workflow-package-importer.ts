import type { Project, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';

import {
	credentialUpdateScope,
	resolveCredentialConflictPolicy,
} from '../entities/credential/credential-conflict-policy';
import type { CredentialBindingRequest } from '../entities/credential/credential.types';
import type { DataTableImportRequest } from '../entities/data-table/data-table.types';
import type { TagImportRequest } from '../entities/tag/tag.types';
import type { VariableImportRequest } from '../entities/variable/variable.types';
import type { PackageReader } from '../io/package-reader';
import { VariableParentPolicy, createBindings } from '../n8n-packages.types';
import type { ImportContext, ResolvedImportRequest } from '../n8n-packages.types';
import { packageImportScopes } from './import-gates';
import { ImportOrchestrator } from './import-orchestrator';
import {
	buildImportResult,
	identifyRequirements,
	reconcileCredentialSummary,
	toImportedWorkflowSummaries,
	toPackageSummary,
	toTagSummary,
	toVariableSummary,
} from './import-result';
import type { ImportOutcome, PackageImportScope } from './import-telemetry';
import { N8nPackageParser } from './n8n-package-parser';
import { PackageImportPreflight } from './package-import-preflight';
import {
	needsBundledCredentialFiles,
	needsBundledVariableValues,
	placeByPolicy,
} from './package-layout';
import type { PackageManifest } from '../spec/manifest.schema';
import {
	planStandaloneSkills,
	applyStandaloneSkills,
	addSkillResults,
	throwWithSkillResults,
} from './package-skill-plan';

/**
 * Imports loose top-level workflows, their folder shells, and credential & data table deps into a target project.
 * Resolves the target scope from the request, then delegates plan/gate/apply to ImportOrchestrator.
 */
@Service()
export class WorkflowPackageImporter {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly importOrchestrator: ImportOrchestrator,
		private readonly importPreflight: PackageImportPreflight,
		private readonly projectService: ProjectService,
		private readonly folderService: FolderService,
	) {}

	async import(
		request: ResolvedImportRequest,
		reader: PackageReader,
		manifest: PackageManifest,
	): Promise<ImportOutcome> {
		const skillsOnly =
			manifest.skills !== undefined &&
			!Object.values(manifest.requirements ?? {}).some((entries) => entries?.length) &&
			![
				manifest.workflows,
				manifest.agents,
				manifest.folders,
				manifest.credentials,
				manifest.dataTables,
				manifest.variables,
				manifest.tags,
			].some((entries) => entries?.length);
		if (skillsOnly) {
			const skills = await this.packageParser.getSkills(reader);
			const projectId =
				request.projectId ??
				(skills.some((skill) => skill.scope === 'project')
					? (await this.resolveImportProject(request.user, undefined, [])).id
					: undefined);
			if (projectId) await this.resolveImportProject(request.user, projectId, []);
			const skillPlan = await planStandaloneSkills(request, manifest, skills, [], {
				destinationProjectId: projectId,
			});
			await this.importPreflight.prepare([], reader, request.apiKeyScopes, skillPlan);
			const outcomes = await applyStandaloneSkills(request, skillPlan);
			const result = buildImportResult({
				package: toPackageSummary(manifest),
				agentOutcomes: [],
				workflows: [],
				removedWorkflows: [],
				removedFolders: [],
				folders: [],
				projects: [],
				bindings: createBindings(),
				credentials: { matched: [], stubbed: [], seeded: [], incomplete: [], updated: [] },
				dataTables: { matched: 0, created: 0, updated: 0 },
				variables: { matched: [], created: [], stubbed: [], updated: [], missing: [] },
				tags: { matched: [], created: [], renamed: [], reconciled: [], skipped: [] },
			});
			return {
				result: addSkillResults(result, outcomes, skillPlan),
				scopes: [],
				agentOutcomes: [],
			};
		}
		const folders = await this.packageParser.getFolders(reader);
		const importLocation = await this.findImportLocation(
			request.user,
			request.projectId,
			request.folderId,
			folders.length > 0,
			packageImportScopes(manifest),
		);
		const context: ImportContext = {
			...importLocation,
			publicApi: request.publicApi,
			ctx: request.ctx,
		};

		const workflows = await this.packageParser.getWorkflows(reader);
		const agents = manifest.agents?.length ? await this.packageParser.getAgents(reader) : [];
		const credentialRequirements = identifyRequirements(
			manifest.requirements?.credentials,
			workflows,
			agents,
		);
		const credentialRequest: CredentialBindingRequest = {
			requirements: credentialRequirements,
			matchingMode: request.credentialMatchingMode,
			missingMode: request.credentialMissingMode,
			credentialBindings: request.bindings?.credentials,
			conflictPolicy: resolveCredentialConflictPolicy(request.credentialConflictPolicy),
			personalRoute: request.credentialPersonalRoute,
			packageCredentials: needsBundledCredentialFiles(
				request,
				(credentialRequirements?.length ?? 0) > 0,
			)
				? await this.packageParser.getCredentials(reader)
				: undefined,
			updateScope: credentialUpdateScope([context.projectId]),
		};

		const dataTableRequirements = identifyRequirements(
			manifest.requirements?.dataTables,
			workflows,
			agents,
		);
		const dataTableRequest: DataTableImportRequest = {
			requirements: dataTableRequirements,
			packageDataTables: await this.packageParser.getDataTables(reader),
			matchingMode: request.dataTableMatchingMode,
			missingMode: request.dataTableMissingMode,
			schemaConflictPolicy: request.dataTableSchemaConflictPolicy,
		};

		const variableRequirements = identifyRequirements(
			manifest.requirements?.variables,
			workflows,
			agents,
		);
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

		const draftPlan = await this.importOrchestrator.plan({
			context,
			folders,
			workflows,
			credentialRequest,
			agents,
			skills: manifest.skills?.length ? await this.packageParser.getSkills(reader) : [],
			standaloneSkillsOnly:
				!manifest.workflows?.length && !manifest.agents?.length && !!manifest.skills,
			agentRequirements: identifyRequirements(manifest.requirements?.agents, workflows, agents),
			dataTableRequest,
			variableRequest,
			tagRequest,
			options: request,
			subWorkflowRequirements: identifyRequirements(
				manifest.requirements?.workflows,
				workflows,
				agents,
			),
			checkRootPlacement: false,
		});

		const skillPlan = await planStandaloneSkills(
			request,
			manifest,
			draftPlan.input.skills ?? [],
			[draftPlan],
			{ destinationProjectId: context.projectId },
		);
		const [plan] = await this.importPreflight.prepare(
			[draftPlan],
			reader,
			request.apiKeyScopes,
			skillPlan,
		);
		const skillOutcomes = await applyStandaloneSkills(request, skillPlan, 'writes');
		try {
			const content = await this.importOrchestrator.apply(plan);
			skillOutcomes.push(...(await applyStandaloneSkills(request, skillPlan, 'removals')));

			const { workflows: published, agentOutcomes } = await this.importOrchestrator.publishPackage({
				user: request.user,
				publicApi: request.publicApi,
				ctx: request.ctx,
				content: [content],
				policy: request.publishingPolicy,
				subWorkflowRequirements: plan.input.subWorkflowRequirements,
			});

			const scopes: PackageImportScope[] = [
				{
					context,
					imported: content,
					credentialRequest: plan.input.credentialRequest,
					dataTableRequest: plan.input.dataTableRequest,
					variableRequest: plan.input.variableRequest,
					tagRequest,
				},
			];

			const result = buildImportResult({
				package: toPackageSummary(manifest),
				agentOutcomes,
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
				credentials: reconcileCredentialSummary(content.credentialResult),
				dataTables: {
					matched: content.dataTablePlan.matchedCount,
					created: content.dataTablePlan.creations.length,
					updated: content.dataTablePlan.updates.length,
				},
				variables: toVariableSummary(content.variablePlan, content.variableResult),
				tags: toTagSummary(content.tagPlan),
			});

			return { result: addSkillResults(result, skillOutcomes, skillPlan), scopes, agentOutcomes };
		} catch (error) {
			throwWithSkillResults(error, skillOutcomes);
		}
	}

	private async findImportLocation(
		user: User,
		projectId: string | undefined,
		folderId: string | undefined,
		needsFolderCreate: boolean,
		importScopes: Scope[],
	): Promise<Omit<ImportContext, 'publicApi'>> {
		const scopes: Scope[] = needsFolderCreate
			? [...importScopes, 'folder:create', 'folder:update']
			: importScopes;
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
			projectId = personalProject.id;
		}

		// Skill-only imports check permissions for each planned action in SkillImporter.
		const project = scopes.length
			? await this.projectService.getProjectWithScope(user, projectId, scopes)
			: await this.projectService.findProject(projectId);
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
			await this.folderService.findFolderInProjectOrFail(folderId, projectId, 'workflow');
		} catch (cause) {
			throw new UserError(`Folder not found in target project: ${folderId}`, { cause });
		}
	}
}
