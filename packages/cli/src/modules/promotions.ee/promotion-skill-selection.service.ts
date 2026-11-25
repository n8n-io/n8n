import type { PromotionBindingConflict } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';

import type { ImportSelection } from '@/modules/n8n-packages/n8n-packages.types';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import {
	SkillAccessService,
	SkillService,
	SkillRuntimeService,
	SkillsGate,
} from '@/modules/skills';

import { projectHolding } from './branch-placement';

@Service()
export class PromotionSkillSelectionService {
	constructor(
		private readonly gate: SkillsGate,
		private readonly skills: SkillService,
		private readonly access: SkillAccessService,
		private readonly runtime: SkillRuntimeService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	get enabled(): boolean {
		return this.gate.isEnabled;
	}

	async projectDeletionConflicts(projectIds: string[]): Promise<PromotionBindingConflict[]> {
		if (projectIds.length === 0 || !this.moduleRegistry.isActive('skills')) return [];
		// Project deletion must not bypass Skill permissions, source ownership, or consumer guards.
		const ids = await this.skills.findIdsInProjects(projectIds);
		return ids.map((id) => ({
			kind: 'skill',
			code: 'skill-conflict',
			id,
			reason: 'project-deletion',
		}));
	}

	async forPromote(user: User, projectId: string, ids: string[]) {
		if (ids.length === 0) return {};
		this.assertEnabled();
		const current = await this.runtime.findTargets(ids);
		const canRead = await this.access.accessCheck(user, 'read');
		for (const target of current.values()) {
			if (target.projectId !== null && target.projectId !== projectId) {
				throw new BadRequestError('A selected Skill belongs to another project.');
			}
			if (!canRead(target)) throw new ForbiddenError('You cannot read a selected Skill.');
		}
		return {
			skillIds: ids.filter((id) => current.has(id)),
			deletedSkillIds: ids.filter((id) => !current.has(id)),
		};
	}

	async forApply(
		manifest: PackageManifest,
		projectIds: string[],
		requestedIds?: string[],
	): Promise<Pick<ImportSelection, 'selectedSkillIds' | 'deletedSkillIds'>> {
		if (requestedIds?.length === 0) return {};
		if (manifest.packageFormatVersion !== '2' || manifest.skills === undefined) {
			if (requestedIds?.length)
				throw new BadRequestError('This package has no standalone Skills collection.');
			return {};
		}
		// Keep the import plan responsible for reporting an unavailable destination.
		if (requestedIds?.length) this.assertEnabled();
		const projects = new Set(projectIds);
		const inScope = new Set(
			manifest.skills
				.filter(
					({ target }) =>
						target.startsWith('skills/') ||
						projects.has(projectHolding(manifest.projects, target)?.id ?? ''),
				)
				.map(({ id }) => id),
		);
		const localIds = this.enabled
			? [
					...(await this.skills.findIdsInProjects(projectIds)),
					...(await this.skills.findInstanceIds()),
				]
			: [];
		const local = new Set(localIds);
		const branchIds = new Set(manifest.skills.map(({ id }) => id));
		const selectedSkillIds: string[] = [];
		const deletedSkillIds: string[] = [];
		for (const id of requestedIds ?? new Set([...inScope, ...local])) {
			if (inScope.has(id)) selectedSkillIds.push(id);
			else if (local.has(id) && !branchIds.has(id)) deletedSkillIds.push(id);
			else
				throw new BadRequestError('A selected Skill is outside this project or no longer exists.');
		}
		return { selectedSkillIds, deletedSkillIds };
	}

	private assertEnabled(): void {
		if (!this.enabled) throw new BadRequestError('Skills are unavailable on this instance.');
	}
}
