import type { User, Variables } from '@n8n/db';
import { Service } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { OwnershipService } from '@/services/ownership.service';
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

@Service()
export class VariableExporter {
	constructor(
		private readonly variablesService: VariablesService,
		private readonly ownershipService: OwnershipService,
		private readonly projectService: ProjectService,
		private readonly variableSerializer: VariableSerializer,
	) {}

	async export(request: VariableExportRequest): Promise<VariableExportResult> {
		if (request.requirements.length === 0) {
			return { entries: [], requirements: [] };
		}

		const allVariables = await this.variablesService.getAllCached();
		const accessibleVariables = await this.variablesService.getAllForUser(request.user);

		const projectIdByWorkflowId = await this.resolveWorkflowProjects(request.requirements);
		const visibleProjectIds = await this.resolveVisibleProjects(
			request.user,
			projectIdByWorkflowId,
		);

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
					? this.resolve(name, workflowProjectId, accessibleVariables, allVariables)
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

	private resolve(
		name: string,
		workflowProjectId: string | undefined,
		accessibleVariables: Variables[],
		allVariables: Variables[],
	): Variables | undefined {
		const accessibleByName = accessibleVariables.filter((variable) => variable.key === name);
		if (workflowProjectId) {
			const accessibleProjectVariable = accessibleByName.find(
				(variable) => variable.project?.id === workflowProjectId,
			);
			if (accessibleProjectVariable) return accessibleProjectVariable;

			// Runtime would pick a project-scoped row the caller cannot list; do not
			// fall back to a visible global that would misrepresent the dependency.
			const shadowedByInaccessibleProjectVariable = allVariables.some(
				(variable) => variable.key === name && variable.project?.id === workflowProjectId,
			);
			if (shadowedByInaccessibleProjectVariable) return undefined;
		}

		return accessibleByName.find((variable) => !variable.project);
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

		const visible = new Set(
			await this.projectService.getProjectIdsWithScope(user, ['projectVariable:list'], projectIds),
		);

		const personalProject = await this.projectService.getPersonalProject(user);
		if (personalProject && projectIds.includes(personalProject.id)) {
			visible.add(personalProject.id);
		}

		return visible;
	}

	private async resolveWorkflowProjects(
		requirements: WorkflowVariableRequirement[],
	): Promise<Map<string, string>> {
		const projectIdByWorkflowId = new Map<string, string>();
		for (const { workflowId } of requirements) {
			if (projectIdByWorkflowId.has(workflowId)) continue;
			const project = await this.ownershipService.getWorkflowProjectCached(workflowId);
			projectIdByWorkflowId.set(workflowId, project.id);
		}
		return projectIdByWorkflowId;
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
