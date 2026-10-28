import { LicenseState } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import { ForbiddenError } from '@n8n/errors';
import { ProjectService } from '@/services/project.service.ee';

import { decideMatchedProject } from './project-conflict-policy';
import type {
	PreparedProject,
	ProjectImportPlan,
	ProjectPlanFields,
	ProjectPlanItem,
} from './project-import.types';
import type {
	ImportedProjectSummary,
	ProjectConflict,
	ProjectConflictPolicy,
} from '../../n8n-packages.types';

@Service()
export class ProjectImporter {
	constructor(
		private readonly projectService: ProjectService,
		private readonly licenseState: LicenseState,
	) {}

	async plan(
		user: User,
		projects: PreparedProject[],
		policy: ProjectConflictPolicy,
	): Promise<ProjectImportPlan> {
		const items: ProjectPlanItem[] = [];
		const conflicts: ProjectConflict[] = [];
		const decision = decideMatchedProject(policy);

		for (const project of projects) {
			const existing = await this.projectService.findProject(project.sourceProjectId);

			const conflict = { sourceProjectId: project.sourceProjectId, name: project.name };
			if (existing) {
				// Never import over a personal project
				if (existing.type !== 'team') {
					conflicts.push({ kind: 'not-team', ...conflict });
					continue;
				}
				// Required for `merge` too: the package's contents are still written into the project.
				const authorized = await this.projectService.getProjectWithScope(user, existing.id, [
					'project:update',
				]);
				if (!authorized) {
					conflicts.push({ kind: 'update-forbidden', ...conflict });
					continue;
				}

				if (decision.blocked) {
					conflicts.push({ kind: 'fail-policy', ...conflict });
					continue;
				}

				items.push(
					decision.action === 'update'
						? { action: 'update', ...toFields(project) }
						: { action: 'skip', existingName: existing.name, ...toFields(project) },
				);
			} else {
				const refusal = this.createRefusal(user);
				if (refusal) {
					conflicts.push({ kind: refusal, ...conflict });
					continue;
				}
				items.push({ action: 'create', ...toFields(project) });
			}
		}

		return { items, conflicts };
	}

	async apply(user: User, items: ProjectPlanItem[]): Promise<ImportedProjectSummary[]> {
		const summaries: ImportedProjectSummary[] = [];

		for (const item of items) {
			switch (item.action) {
				case 'skip':
					// `merge`: the existing project is left untouched; only its contents come in.
					summaries.push({
						sourceProjectId: item.sourceProjectId,
						localId: item.sourceProjectId,
						name: item.existingName,
						status: 'skipped',
					});
					break;

				case 'create': {
					const project = await this.projectService.createTeamProject(
						user,
						{ name: item.name, icon: item.icon },
						{
							id: item.sourceProjectId,
							description: item.description ?? null,
							customTelemetryTags: item.customTelemetryTags,
						},
					);
					summaries.push({
						sourceProjectId: item.sourceProjectId,
						localId: project.id,
						name: project.name,
						status: 'created',
					});
					break;
				}

				case 'update':
					await this.projectService.updateProject(
						user,
						item.sourceProjectId,
						{
							name: item.name,
							icon: item.icon,
							description: item.description,
							customTelemetryTags: item.customTelemetryTags,
						},
						{ preserveCustomTelemetryTags: true },
					);
					summaries.push({
						sourceProjectId: item.sourceProjectId,
						localId: item.sourceProjectId,
						name: item.name,
						status: 'updated',
					});
					break;

				default: {
					// A new action must decide for itself whether it writes; never fall into `update`.
					const unhandled: never = item;
					throw new UnexpectedError(
						`Unhandled project import action: ${JSON.stringify(unhandled)}`,
					);
				}
			}
		}

		return summaries;
	}

	private createRefusal(user: User): 'create-forbidden' | 'license' | undefined {
		if (!hasGlobalScope(user, 'project:create')) return 'create-forbidden';
		if (!this.licenseState.isLicensed('feat:projectRole:admin')) return 'license';
		return undefined;
	}
}

/**
 * The error that an import throws for a refused project. `fail-policy` has none: another policy
 * can resolve it, so the import reports it as a blocking issue.
 */
export function projectRefusalError(conflict: ProjectConflict): ForbiddenError | undefined {
	switch (conflict.kind) {
		case 'not-team':
			return new ForbiddenError(
				`Cannot import project "${conflict.name}": its id belongs to a non-team project on this instance.`,
			);
		case 'update-forbidden':
			return new ForbiddenError(
				`You do not have permission to update the existing project "${conflict.name}".`,
			);
		case 'create-forbidden':
			return new ForbiddenError('You do not have permission to create projects.');
		case 'license':
			return new ForbiddenError(
				'Your license does not allow creating team projects. Project import requires a license that supports team projects.',
			);
		case 'fail-policy':
			return undefined;
	}
}

function toFields(project: PreparedProject): ProjectPlanFields {
	return {
		sourceProjectId: project.sourceProjectId,
		name: project.name,
		...(project.description !== undefined ? { description: project.description } : {}),
		...(project.icon !== undefined ? { icon: project.icon } : {}),
		...(project.customTelemetryTags !== undefined
			? { customTelemetryTags: project.customTelemetryTags }
			: {}),
	};
}
