// Fixtures for tests outside the skills module. They write and read the skill tables here,
// so those tests never import the repository or the entities.
import { Container } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import type { SkillSource } from './database/entities/skill.entity';
import { SkillRepository } from './database/repositories/skill.repository';
import type { SkillContent } from './utils/skill-content-hash';

export { skillContentHash, type SkillContent } from './utils/skill-content-hash';
export { toSkillContent } from './utils/skill-content';

export type SkillFixture = {
	id?: string;
	projectId?: string | null;
	agentId?: string | null;
	source?: SkillSource;
	createdById?: string | null;
	content?: Partial<SkillContent>;
};

const defaultContent = (content: Partial<SkillContent> = {}): SkillContent => ({
	name: 'Brand voice',
	description: 'Write in our voice',
	instructions: 'Use short sentences.',
	frontmatter: null,
	files: [],
	...content,
});

/** Creates a skill with its v1. */
export async function createSkill(
	fixture: SkillFixture = {},
): Promise<{ id: string; versionId: string }> {
	const id = fixture.id ?? `skill_${generateNanoId()}`;
	const versionId = await Container.get(SkillRepository).createSkill(
		{
			id,
			target: { projectId: fixture.projectId ?? null, agentId: fixture.agentId ?? null },
			source: fixture.source ?? 'ui',
			createdById: fixture.createdById ?? null,
		},
		defaultContent(fixture.content),
	);
	return { id, versionId };
}

/** Saves the next version of a skill. */
export async function createSkillVersion(
	skillId: string,
	content: Partial<SkillContent> = {},
	createdById: string | null = null,
): Promise<{ versionId: string; version: number }> {
	const skills = Container.get(SkillRepository);
	const version = await skills.nextVersionNumber(skillId);
	const versionId = await skills.insertSavedVersion(
		skillId,
		version,
		defaultContent(content),
		createdById,
	);
	return { versionId, version };
}

export async function findSkill(id: string) {
	const [skill] = await Container.get(SkillRepository).findByIds([id]);
	if (!skill) return null;
	const { projectId, agentId, source, availableToAssistant, createdById } = skill;
	return { id, projectId, agentId, source, availableToAssistant, createdById };
}

export async function findSkillIds(filter: { source?: SkillSource } = {}): Promise<string[]> {
	return await Container.get(SkillRepository).findAllIds(filter);
}

export async function findLatestSkillVersion(skillId: string) {
	const row = (await Container.get(SkillRepository).findLatestSaved([skillId])).get(skillId);
	if (!row) return null;
	const { id, version, name, description, instructions, frontmatter } = row.version;
	const files = row.files.map(({ path, content }) => ({ path, content }));
	return { id, version, name, description, instructions, frontmatter, files };
}

/** Every row of the skill tables, in a fixed order, to compare before and after a run. */
export async function readSkillTables(): Promise<unknown[]> {
	return await Container.get(SkillRepository).findAllRows();
}

/** Deletes one skill. Its versions, files, agent refs and pins go by cascade. */
export async function deleteSkill(id: string): Promise<void> {
	await Container.get(SkillRepository).deleteSkill(id);
}

export async function deleteAllSkills(): Promise<void> {
	await Container.get(SkillRepository).deleteAll();
}
