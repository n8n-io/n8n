import type { Variables } from '@n8n/db';
import { SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { pickVariableForProject } from 'n8n-workflow';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';

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
		private readonly variableSerializer: VariableSerializer,
	) {}

	async export(request: VariableExportRequest): Promise<VariableExportResult> {
		if (request.requirements.length === 0) {
			return { entries: [], requirements: [] };
		}

		const workflowIds = [...new Set(request.requirements.map((r) => r.workflowId))];
		// The unfiltered list is what runtime resolves against; the user-filtered
		// list defines what the caller may bundle. Resolving on the unfiltered list
		// and then gating on accessibility keeps export in lockstep with runtime
		// while never bundling a row the caller cannot see.
		const [allVariables, accessibleVariables, projectIdByWorkflowId] = await Promise.all([
			this.variablesService.getAllCached(),
			this.variablesService.getAllForUser(request.user),
			this.resolveWorkflowProjects(workflowIds),
		]);
		const accessibleIds = new Set(accessibleVariables.map((variable) => variable.id));

		const resolvedNames = this.resolveRequirements(
			request.requirements,
			projectIdByWorkflowId,
			allVariables,
			accessibleIds,
		);

		this.assertNoBundledVariableCollision(resolvedNames, request.projectTargetsById);

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
	 * workflows, the variable its `$vars.<name>` would read at runtime —
	 * project-scoped beats a same-key global, via the same precedence rule
	 * runtime uses. A pick the caller cannot see yields `undefined`, so a
	 * hidden project variable never falls back to the global it shadows.
	 */
	private resolveRequirements(
		requirements: WorkflowVariableRequirement[],
		projectIdByWorkflowId: Map<string, string>,
		allVariables: Variables[],
		accessibleIds: Set<string>,
	): ResolvedName[] {
		const variablesByKey = new Map<string, Variables[]>();
		for (const variable of allVariables) {
			const bucket = variablesByKey.get(variable.key);
			if (bucket) bucket.push(variable);
			else variablesByKey.set(variable.key, [variable]);
		}

		const resolveForWorkflow = (name: string, workflowId: string) => {
			const workflowProjectId = projectIdByWorkflowId.get(workflowId);
			const picked = pickVariableForProject(
				variablesByKey.get(name) ?? [],
				name,
				workflowProjectId,
			);
			return picked && accessibleIds.has(picked.id) ? picked : undefined;
		};

		return [...this.groupByName(requirements)].map(([name, usedByWorkflows]) => ({
			name,
			usedByWorkflows,
			variables: usedByWorkflows.map((workflowId) => resolveForWorkflow(name, workflowId)),
		}));
	}

	private resolveBaseDir(variable: Variables, projectTargetsById?: Map<string, string>): string {
		if (!projectTargetsById || projectTargetsById.size === 0) return 'variables';
		const prefix = variable.project ? projectTargetsById.get(variable.project.id) : undefined;
		return prefix ? `${prefix}/variables` : 'variables';
	}

	private async resolveWorkflowProjects(workflowIds: string[]): Promise<Map<string, string>> {
		const owners = await this.sharedWorkflowRepository.findByWorkflowIds(workflowIds);
		return new Map(owners.map((owner) => [owner.workflowId, owner.project.id]));
	}

	/**
	 * A name that resolves to two different variables in the same package
	 * directory cannot be bundled: only one of them could ever land in the
	 * single target project at import, so the package cannot be satisfied no
	 * matter which copy is picked. This holds even for value-less stubs, so the
	 * check does not depend on `includeVariableValues`. Collisions are checked
	 * per directory, so project exports — where each project's variables live
	 * in their own namespace — stay unaffected.
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
				}. Export the projects as a project package instead.`,
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
