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

/**
 * Variable rows indexed once so per-workflow resolution is a map lookup instead
 * of a scan over every variable. Project-scoped maps are keyed by project id
 * then name. `projectNamesInAnyScope` covers rows the caller cannot list too,
 * so we can detect a global shadowed by a hidden project row.
 */
interface VariableIndex {
	accessibleGlobalByName: Map<string, Variables>;
	accessibleProjectByName: Map<string, Map<string, Variables>>;
	projectNamesInAnyScope: Map<string, Set<string>>;
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

		for (const [name, usedByWorkflows] of this.groupByName(request.requirements)) {
			let aggregateValue: string | undefined;
			let everyWorkflowResolvedToSameValue = true;

			for (const workflowId of usedByWorkflows) {
				const workflowProjectId = projectIdByWorkflowId.get(workflowId);
				const canInspectProjectScope =
					workflowProjectId !== undefined && visibleProjectIds.has(workflowProjectId);
				const variable = canInspectProjectScope
					? this.resolve(name, workflowProjectId, index)
					: undefined;

				if (!variable || variable.type !== 'string') {
					everyWorkflowResolvedToSameValue = false;
					continue;
				}

				if (aggregateValue === undefined) {
					aggregateValue = variable.value;
				} else if (aggregateValue !== variable.value) {
					everyWorkflowResolvedToSameValue = false;
				}

				if (!request.includeVariableValues || bundledVariableIds.has(variable.id)) continue;
				bundledVariableIds.add(variable.id);

				const baseDir = this.resolveBaseDir(variable, request.projectTargetsById);
				const target = allocatorFor(baseDir).allocate(variable.key);
				request.writer.writeDirectory(target);
				request.writer.writeFile(
					`${target}/variable.json`,
					JSON.stringify(this.variableSerializer.serialize(variable), null, '\t'),
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
	 * Resolves the variable a workflow's `$vars.<name>` hits at runtime: the
	 * project-scoped row wins over a global of the same name. Returns `undefined`
	 * when that row is a project variable the caller cannot list, so we never
	 * export a misleading global in its place.
	 */
	private resolve(
		name: string,
		workflowProjectId: string | undefined,
		index: VariableIndex,
	): Variables | undefined {
		if (workflowProjectId) {
			const scoped = index.accessibleProjectByName.get(workflowProjectId)?.get(name);
			if (scoped) return scoped;
			if (index.projectNamesInAnyScope.get(workflowProjectId)?.has(name)) return undefined;
		}

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
