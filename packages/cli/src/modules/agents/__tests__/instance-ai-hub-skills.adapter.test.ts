import { createRuntimeSkillSource } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { Skill } from '../entities/skill.entity';
import { InstanceAiHubSkillsAdapterService } from '../instance-ai-hub-skills.adapter';
import type { ResolvedSkillRow, SkillHubRepository } from '../repositories/skill-hub.repository';

const user = mock<User>({ id: 'user-1' });

const builtIn = createRuntimeSkillSource([
	{
		id: 'build-workflow',
		name: 'build-workflow',
		description: 'Build a workflow.',
		instructions: 'Built-in body.',
	},
]);

function row(
	id: string,
	name: string,
	files: Array<{ path: string; content: string }> = [],
): ResolvedSkillRow {
	return {
		skill: { id } as Skill,
		version: {
			id: `${id}-v1`,
			skillId: id,
			version: 1,
			name,
			description: `${name} description`,
			instructions: `${name} body`,
			frontmatter: null,
		},
		files,
	} as unknown as ResolvedSkillRow;
}

function makeService() {
	const repository = mock<SkillHubRepository>();
	const service = new InstanceAiHubSkillsAdapterService(mock<Logger>(), repository);
	return { service, repository };
}

describe('InstanceAiHubSkillsAdapterService', () => {
	it("reads the instance skills and the user's own skills, never project skills", async () => {
		const { service, repository } = makeService();
		repository.findVisibleSkills.mockResolvedValue([]);

		const source = await service.extendSource(user, builtIn);

		expect(repository.findVisibleSkills).toHaveBeenCalledWith({
			userId: 'user-1',
			allUsers: false,
			projectIds: [],
		});
		expect(source).toBe(builtIn);
	});

	it('serves hub skills and their reference files next to the built-in skills', async () => {
		const { service, repository } = makeService();
		repository.findVisibleSkills.mockResolvedValue([{ id: 'skill_a' }] as Skill[]);
		repository.findLatestSavedVersions.mockResolvedValue(
			new Map([
				[
					'skill_a',
					row('skill_a', 'Brand voice', [{ path: 'references/tone.md', content: 'Warm.' }]),
				],
			]),
		);

		const source = await service.extendSource(user, builtIn);

		expect(source.registry.skills.map(({ id }) => id).sort()).toEqual([
			'build-workflow',
			'skill_a',
		]);
		const entry = source.registry.skills.find(({ id }) => id === 'skill_a');
		expect(entry?.sourceDirectory).toBe('hub/skill_a');
		expect(entry?.linkedFiles.references.map(({ path }) => path)).toEqual(['references/tone.md']);
		await expect(source.loadSkill('skill_a')).resolves.toMatchObject({
			name: 'Brand voice',
			instructions: 'Brand voice body',
		});
		await expect(source.loadSkill('build-workflow')).resolves.toMatchObject({
			instructions: 'Built-in body.',
		});
		await expect(source.loadFile?.('skill_a', 'references/tone.md')).resolves.toMatchObject({
			content: 'Warm.',
		});
		await expect(source.loadFile?.('skill_a', 'references/missing.md')).resolves.toBeNull();
	});

	it('leaves out a hub skill whose name reads the same as a built-in or an earlier hub skill', async () => {
		const { service, repository } = makeService();
		repository.findVisibleSkills.mockResolvedValue([
			{ id: 'skill_a' },
			{ id: 'skill_b' },
			{ id: 'skill_c' },
		] as Skill[]);
		repository.findLatestSavedVersions.mockResolvedValue(
			new Map([
				['skill_a', row('skill_a', 'Build-Workflow')],
				['skill_b', row('skill_b', 'Brand voice')],
				['skill_c', row('skill_c', 'brand voice')],
			]),
		);

		const source = await service.extendSource(user, builtIn);

		expect(source.registry.skills.map(({ id }) => id).sort()).toEqual([
			'build-workflow',
			'skill_b',
		]);
	});

	it('returns the built-in source untouched when every hub skill is skipped', async () => {
		const { service, repository } = makeService();
		repository.findVisibleSkills.mockResolvedValue([{ id: 'skill_a' }] as Skill[]);
		repository.findLatestSavedVersions.mockResolvedValue(
			new Map([['skill_a', row('skill_a', 'build-workflow')]]),
		);

		await expect(service.extendSource(user, builtIn)).resolves.toBe(builtIn);
	});
});
