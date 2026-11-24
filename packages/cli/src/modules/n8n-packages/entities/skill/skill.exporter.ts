import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { SkillAccessService, SkillService, skillScopeOf, type LatestSkill } from '@/modules/skills';

import { projectScopedDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { serializedSkillSchema, type SerializedSkill } from '../../spec/serialized/skill.schema';
import { PackageExportBlockedError } from '../package-export.errors';

export interface SkillExportRequest {
	user: User;
	writer: PackageWriter;
	/** The exported Agents and the skills they reference. */
	agents: { agentId: string; projectId: string; skillIds: string[] }[];
	/** Skills selected without an Agent. */
	skillIds?: string[];
	/** Project package targets. Without them, every skill goes to the top-level `skills/`. */
	projectTargetsById?: Map<string, string>;
}

/** Writes each selected Skill or Agent dependency at its latest saved version. */
@Service()
export class SkillExporter {
	constructor(
		private readonly skillService: SkillService,
		private readonly skillAccess: SkillAccessService,
	) {}

	async export(request: SkillExportRequest): Promise<ManifestEntry[]> {
		const skillIds = [
			...new Set([
				...(request.skillIds ?? []),
				...request.agents.flatMap(({ skillIds: ids }) => ids),
			]),
		];
		if (skillIds.length === 0) return [];
		const rows = await this.skillService.findLatest(skillIds);
		const canRead = await this.skillAccess.accessCheck(request.user, 'read');
		const entries: ManifestEntry[] = [];
		for (const id of skillIds) {
			const row = rows.get(id);
			if (!row) {
				throw new PackageExportBlockedError(
					`Skill "${id}" does not exist. Remove it from the selection or Agent, then export again.`,
				);
			}
			const ownerProjectId = row.target.projectId ?? undefined;
			if (
				request.skillIds?.includes(id) &&
				ownerProjectId &&
				request.projectTargetsById?.size &&
				!request.projectTargetsById.has(ownerProjectId)
			) {
				throw new PackageExportBlockedError(
					'A selected Skill belongs to a project outside this export.',
				);
			}
			if (!canRead(row.target)) {
				throw new PackageExportBlockedError(
					`You cannot read skill "${id}". Ask for access to the skill, or remove it from the export.`,
				);
			}
			const directory = projectScopedDirectory(
				'skills',
				ownerProjectId,
				request.projectTargetsById,
			);
			entries.push(
				await writeManifestEntry(
					request.writer,
					'skills',
					directory,
					{ id, name: row.skill.name },
					serializeSkill(row),
				),
			);
		}
		return entries;
	}
}

function serializeSkill(row: LatestSkill): SerializedSkill {
	return serializedSkillSchema.parse({
		id: row.id,
		scope: skillScopeOf(row.target),
		skill: row.skill,
		frontmatter: row.frontmatter,
	});
}
