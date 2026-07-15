import type { User, Variables } from '@n8n/db';
import { SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ProjectService } from '@/services/project.service.ee';

import { VariableSerializer } from './variable.serializer';
import type {
	VariableExportRequest,
	VariableExportResult,
	WorkflowVariableRequirement,
} from './variable.types';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageVariableRequirement } from '../../spec/requirements.schema';
import { PackageExportBlockedError } from '../package-export.errors';

interface VariableIndex {
	accessibleGlobalByName: Map<string, Variables>;
	accessibleProjectByName: Map<string, Map<string, Variables>>;
	projectNamesInAnyScope: Map<string, Set<string>>;
}

interface ResolvedName {
	name: string;
	usedByWorkflows: string[];
	variables: Array<Variables | undefined>;
}

/**
 * A variable is bundled (and so counts towards a name collision) only when the
 * caller could resolve it; an unresolved name still travels as a name-only
 * requirement.
 */
function isBundleableVariable(variable: Variables | undefined): variable is Variables {
	return variable !== undefined;
}

@Service()
export class VariableExporter {
	constructor(
		private readonly variablesService: VariablesService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectService: ProjectService,
		private readonly variableSerializer: VariableSerializer,
	) {}

	async export(request: VariableExportRequest): Promise<VariableExportResult> {
		if (request.requirements.length === 0) {
			return { entries: [], requirements: [] };
		}

		const workflowIds = [...new Set(request.requirements.map((r) => r.workflowId))];
		// `allVariables` (unfiltered) exists solely to detect names shadowed by a
		// project variable the caller cannot list: without it, `resolve` would fall
		// back to a same-named accessible global that runtime would never pick.
		const [allVariables, accessibleVariables, projectIdByWorkflowId] = await Promise.all([
			this.variablesService.getAllCached(),
			this.variablesService.getAllForUser(request.user),
			this.resolveWorkflowProjects(workflowIds),
		]);

		const visibleProjectIds = await this.resolveVisibleProjects(
			request.user,
			projectIdByWorkflowId,
		);
		const index = this.indexVariables(accessibleVariables, allVariables);

		const resolvedNames = this.resolveRequirements(
			request.requirements,
			projectIdByWorkflowId,
			visibleProjectIds,
			index,
		);

		if (request.includeVariableValues) {
			this.assertNoBundledVariableCollision(resolvedNames, request.projectTargetsById);
		}

		// One allocator per base directory: `variables/` and each
		// `projects/<slug>/variables/` suffix collisions independently.
		const allocators = new Map<string, UniqueFilenameAllocator>();
		const allocatorFor = (baseDir: string) => {
			const existing = allocators.get(baseDir);
			if (existing) return existing;
			const created = new UniqueFilenameAllocator(baseDir, 'variable');
			allocators.set(baseDir, created);
			return created;
		};

		const entries: ManifestEntry[] = [];
		const bundledVariableIds = new Set<string>();
		const requirements: PackageVariableRequirement[] = [];

		for (const { name, usedByWorkflows, variables } of resolvedNames) {
			let aggregateValue: string | undefined;
			let everyWorkflowResolvedToSameValue = true;

			for (const variable of variables) {
				if (!isBundleableVariable(variable)) {
					everyWorkflowResolvedToSameValue = false;
					continue;
				}

				if (aggregateValue === undefined) {
					aggregateValue = variable.value;
				} else if (aggregateValue !== variable.value) {
					everyWorkflowResolvedToSameValue = false;
				}

				if (bundledVariableIds.has(variable.id)) continue;
				bundledVariableIds.add(variable.id);

				const baseDir = this.resolveBaseDir(variable, request.projectTargetsById);
				const target = allocatorFor(baseDir).allocate(variable.key);
				request.writer.writeDirectory(target);
				request.writer.writeFile(
					`${target}/variable.json`,
					JSON.stringify(
						this.variableSerializer.serialize(variable, {
							includeValue: request.includeVariableValues,
						}),
						null,
						'\t',
					),
				);
				entries.push({ id: variable.id, name: variable.key, target });
			}

			requirements.push({
				name,
				...(request.includeVariableValues &&
				everyWorkflowResolvedToSameValue &&
				aggregateValue !== undefined
					? { value: aggregateValue }
					: {}),
				usedByWorkflows,
			});
		}

		return { entries, requirements };
	}

	/**
	 * Turns the flat requirement list into one entry per variable name.
	 * Each entry records which workflows use the name and, for each of those
	 * workflows, the actual variable its `$vars.<name>` would read at runtime.
	 * That lookup yields `undefined` when the caller cannot see into the
	 * workflow's project.
	 */
	private resolveRequirements(
		requirements: WorkflowVariableRequirement[],
		projectIdByWorkflowId: Map<string, string>,
		visibleProjectIds: Set<string>,
		index: VariableIndex,
	): ResolvedName[] {
		const resolveForWorkflow = (name: string, workflowId: string) => {
			const projectId = projectIdByWorkflowId.get(workflowId);
			if (projectId === undefined || !visibleProjectIds.has(projectId)) return undefined;
			return this.resolve(name, projectId, index);
		};

		return [...this.groupByName(requirements)].map(([name, usedByWorkflows]) => ({
			name,
			usedByWorkflows,
			variables: usedByWorkflows.map((workflowId) => resolveForWorkflow(name, workflowId)),
		}));
	}

	/**
	 * Resolves the variable a workflow's `$vars.<name>` hits at runtime: the
	 * project-scoped row wins over a global of the same name. Returns `undefined`
	 * when that row is a project variable the caller cannot list, so we never
	 * export a misleading global in its place.
	 */
	private resolve(name: string, projectId: string, index: VariableIndex): Variables | undefined {
		const scoped = index.accessibleProjectByName.get(projectId)?.get(name);
		if (scoped) return scoped;
		if (index.projectNamesInAnyScope.get(projectId)?.has(name)) return undefined;

		return index.accessibleGlobalByName.get(name);
	}

	private indexVariables(accessible: Variables[], all: Variables[]): VariableIndex {
		const accessibleGlobalByName = new Map<string, Variables>();
		const accessibleProjectByName = new Map<string, Map<string, Variables>>();
		for (const variable of accessible) {
			if (variable.project) {
				const byName =
					accessibleProjectByName.get(variable.project.id) ?? new Map<string, Variables>();
				byName.set(variable.key, variable);
				accessibleProjectByName.set(variable.project.id, byName);
			} else {
				accessibleGlobalByName.set(variable.key, variable);
			}
		}

		const projectNamesInAnyScope = new Map<string, Set<string>>();
		for (const variable of all) {
			if (!variable.project) continue;
			const names = projectNamesInAnyScope.get(variable.project.id) ?? new Set<string>();
			names.add(variable.key);
			projectNamesInAnyScope.set(variable.project.id, names);
		}

		return { accessibleGlobalByName, accessibleProjectByName, projectNamesInAnyScope };
	}

	private resolveBaseDir(variable: Variables, projectTargetsById?: Map<string, string>): string {
		if (!projectTargetsById || projectTargetsById.size === 0) return 'variables';
		const prefix = variable.project ? projectTargetsById.get(variable.project.id) : undefined;
		return prefix ? `${prefix}/variables` : 'variables';
	}

	private async resolveVisibleProjects(
		user: User,
		projectIdByWorkflowId: Map<string, string>,
	): Promise<Set<string>> {
		const projectIds = [...new Set(projectIdByWorkflowId.values())];
		if (projectIds.length === 0) return new Set();

		const [listableProjectIds, personalProject] = await Promise.all([
			this.projectService.getProjectIdsWithScope(user, ['projectVariable:list'], projectIds),
			this.projectService.getPersonalProject(user),
		]);

		const visible = new Set(listableProjectIds);
		if (personalProject && projectIds.includes(personalProject.id)) {
			visible.add(personalProject.id);
		}

		return visible;
	}

	private async resolveWorkflowProjects(workflowIds: string[]): Promise<Map<string, string>> {
		const owners = await this.sharedWorkflowRepository.findByWorkflowIds(workflowIds);
		return new Map(owners.map((owner) => [owner.workflowId, owner.project.id]));
	}

	/**
	 * A name that resolves to two different variables in the same package
	 * directory cannot be bundled: the second copy would be renamed `<name>-2`
	 * and the import could not tell which one satisfies the requirement.
	 * Collisions are checked per directory, so project exports — where each
	 * project's variables live in their own namespace — stay unaffected.
	 */
	private assertNoBundledVariableCollision(
		resolvedNames: ResolvedName[],
		projectTargetsById: Map<string, string> | undefined,
	): void {
		const conflictingNames = resolvedNames
			.filter(({ variables }) => this.hasDirectoryCollision(variables, projectTargetsById))
			.map(({ name }) => name);

		if (conflictingNames.length === 0) return;

		const displayedNames = conflictingNames.slice(0, 20);
		const omittedCount = conflictingNames.length - displayedNames.length;

		throw new PackageExportBlockedError(
			`${conflictingNames.length} variable name(s) resolve to different variables that would collide in the package. Export aborted.`,
			{
				description: `Conflicting variable name(s): ${displayedNames.join(', ')}${
					omittedCount > 0 ? `, and ${omittedCount} more` : ''
				}. Export the projects as a project package, or export without variable values.`,
			},
		);
	}

	/** True when two distinct variables would be written into the same directory. */
	private hasDirectoryCollision(
		variables: Array<Variables | undefined>,
		projectTargetsById: Map<string, string> | undefined,
	): boolean {
		const idByDir = new Map<string, string>();
		for (const variable of variables) {
			if (!isBundleableVariable(variable)) continue;
			const dir = this.resolveBaseDir(variable, projectTargetsById);
			const previousId = idByDir.get(dir);
			if (previousId !== undefined && previousId !== variable.id) return true;
			idByDir.set(dir, variable.id);
		}
		return false;
	}

	private groupByName(requirements: WorkflowVariableRequirement[]): Map<string, string[]> {
		const grouped = new Map<string, string[]>();
		for (const requirement of requirements) {
			const workflowIds = grouped.get(requirement.variableName);
			if (workflowIds) {
				if (!workflowIds.includes(requirement.workflowId)) {
					workflowIds.push(requirement.workflowId);
				}
			} else {
				grouped.set(requirement.variableName, [requirement.workflowId]);
			}
		}
		return grouped;
	}
}
