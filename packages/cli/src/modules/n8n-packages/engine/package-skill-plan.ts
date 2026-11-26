import { skillNameKey, type ImportedSkillSummary } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import { countSkillOutcomes, type StandaloneSkillPlan } from '../entities/skill/skill-import.types';
import type { ImportRequest, ImportResult } from '../n8n-packages.types';
import type { PackageManifest } from '../spec/manifest.schema';
import type { SerializedSkill } from '../spec/serialized/skill.schema';
import type { ImportPlan } from './import-orchestrator';
import { SkillImportFailedError } from './import-blocked.error';

export async function planStandaloneSkills(
	request: ImportRequest,
	manifest: PackageManifest,
	skills: SerializedSkill[],
	plans: ImportPlan[],
	options: { destinationProjectId?: string; pendingProjectIds?: Set<string> } = {},
): Promise<StandaloneSkillPlan | undefined> {
	const explicit = request.selection?.selectedSkillIds ?? request.skillIds;
	const requestedIds =
		explicit ??
		(request.selection
			? []
			: (manifest.selectedSkillIds ?? (manifest.agents?.length ? [] : skills.map(({ id }) => id))));
	const deletedIds = request.selection?.deletedSkillIds ?? request.deletedSkillIds ?? [];
	const ids = explicit ?? requestedIds.filter((id) => !deletedIds.includes(id));
	if (ids.length === 0 && deletedIds.length === 0) return undefined;
	if (manifest.skills === undefined) {
		throw new BadRequestError('This package has no Skills collection.');
	}
	const selectedProjectId = request.selection?.selectedProjectId;
	const entries = new Map(manifest.skills.map((entry) => [entry.id, entry]));
	const byId = new Map(skills.map((skill) => [skill.id, skill]));
	const selected: { skill: SerializedSkill; projectId: string | null }[] = [];
	for (const id of new Set(ids)) {
		const skill = byId.get(id);
		const entry = entries.get(id);
		if (!skill || !entry)
			throw new BadRequestError(`Selected Skill "${id}" is absent from the package.`);
		const project = manifest.projects?.find(({ target }) =>
			entry.target.startsWith(`${target}/skills/`),
		);
		if (skill.scope === 'instance' && !entry.target.startsWith('skills/')) {
			throw new BadRequestError('An instance Skill must be at the package root.');
		}
		if (skill.scope === 'project' && manifest.projects?.length && !project) {
			throw new BadRequestError('A project Skill must belong to a package project.');
		}
		if (selectedProjectId && project && project.id !== selectedProjectId) {
			if (explicit)
				throw new BadRequestError('A selected Skill belongs to another package project.');
			continue;
		}
		selected.push({ skill, projectId: project?.id ?? options.destinationProjectId ?? null });
	}
	const { SkillImporter } = await import('../entities/skill/skill-importer.js');
	const plan = await Container.get(SkillImporter).planStandalone(
		request.user,
		selected,
		deletedIds,
		request.conflictPolicy,
		{
			pendingProjectIds: options.pendingProjectIds,
			allowedProjectIds: new Set(
				selectedProjectId
					? [selectedProjectId]
					: (manifest.projects?.map(({ id }) => id) ??
							(options.destinationProjectId ? [options.destinationProjectId] : [])),
			),
		},
	);
	const selectedIds = new Set(plan.outcomes.map(({ localId }) => localId));
	const deleted = new Set(deletedIds);
	const names = new Map(
		plan.writes.shared.map(({ skill, target }) => [
			JSON.stringify([target.projectId, skillNameKey(skill.skill.name)]),
			skill.id,
		]),
	);
	for (const scope of plans) {
		for (const item of scope.agentPlan?.items ?? []) {
			if (item.action === 'skip') continue;
			for (const { id } of item.config?.skills ?? []) {
				if (deleted.has(id))
					plan.issues.push({
						type: 'skill-conflict',
						skillId: id,
						message: 'An imported Agent requires this Skill.',
					});
			}
		}
		const dependencySkillPlan = scope.agentPlan?.skills;
		if (!dependencySkillPlan) continue;
		for (const write of dependencySkillPlan.shared) {
			if (deleted.has(write.skill.id)) {
				plan.issues.push({
					type: 'skill-conflict',
					skillId: write.skill.id,
					message: 'An imported Agent requires this Skill.',
				});
			}
			const key = JSON.stringify([write.target.projectId, skillNameKey(write.skill.skill.name)]);
			const first = names.get(key);
			if (first && first !== write.skill.id) {
				plan.issues.push({
					type: 'skill-conflict',
					skillId: write.skill.id,
					message: 'Two package Skills have the same name in this scope.',
				});
			}
			names.set(key, write.skill.id);
		}
		// The standalone batch writes these Skills once. Agents retain their change markers.
		dependencySkillPlan.shared = dependencySkillPlan.shared.filter(
			({ skill }) => !selectedIds.has(skill.id),
		);
	}
	return plan;
}

export async function applyStandaloneSkills(
	request: ImportRequest,
	plan?: StandaloneSkillPlan,
	phase: 'all' | 'writes' | 'removals' = 'all',
): Promise<ImportedSkillSummary[]> {
	if (!plan) return [];
	if (phase !== 'all') {
		const outcomes = plan.outcomes.filter(({ status }) =>
			phase === 'removals' ? status === 'deleted' : status !== 'deleted',
		);
		const ids = new Set(outcomes.map(({ localId }) => localId));
		plan = {
			...plan,
			writes: phase === 'writes' ? plan.writes : { shared: [], sharedUsers: new Set() },
			removals: phase === 'removals' ? plan.removals : [],
			checked: plan.checked.filter(({ id }) => ids.has(id)),
			outcomes,
		};
	}
	const { SkillImporter } = await import('../entities/skill/skill-importer.js');
	return await Container.get(SkillImporter).applyStandalone(request.user, plan);
}

export function addSkillResults(
	result: ImportResult,
	skills: ImportedSkillSummary[],
	plan?: StandaloneSkillPlan,
): ImportResult {
	return plan
		? { ...result, skills, counts: { ...result.counts, skills: countSkillOutcomes(skills) } }
		: result;
}

export function throwWithSkillResults(error: unknown, skills: ImportedSkillSummary[]): never {
	if (!skills.some(({ status }) => ['created', 'updated', 'deleted'].includes(status))) throw error;
	throw new SkillImportFailedError(error, skills);
}
