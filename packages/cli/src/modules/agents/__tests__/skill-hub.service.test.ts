import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { Skill } from '../entities/skill.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ResolvedSkillRow, SkillHubRepository } from '../repositories/skill-hub.repository';
import { SkillHubService } from '../skills-hub/skill-hub.service';

function row(skillId: string, version: number, name = 'Refund policy'): ResolvedSkillRow {
	return {
		skill: { id: skillId } as Skill,
		version: { id: `${skillId}-v${version}`, skillId, version, name },
		files: [],
	} as unknown as ResolvedSkillRow;
}

function schemaWith(...skillIds: string[]): AgentJsonConfig {
	return { skills: skillIds.map((id) => ({ type: 'skill', id })) } as unknown as AgentJsonConfig;
}

function makeService(options: {
	published: Record<string, number>;
	latest: Record<string, number>;
	authors: Array<{ skillId: string; version: number; createdById: string | null }>;
}) {
	const repository = mock<SkillHubRepository>();
	repository.findPinned.mockResolvedValue(
		new Map(Object.entries(options.published).map(([id, v]) => [id, row(id, v)])),
	);
	repository.findLatestSavedVersions.mockResolvedValue(
		new Map(Object.entries(options.latest).map(([id, v]) => [id, row(id, v)])),
	);
	repository.findVersionsByIds.mockResolvedValue(new Map());
	repository.findSavedVersionAuthors.mockResolvedValue(options.authors);
	return new SkillHubService(
		mock<Logger>(),
		repository,
		mock<AgentRepository>(),
		mock<ProjectRepository>(),
		mock<ProjectRelationRepository>(),
	);
}

describe('SkillHubService.changedByOthersSinceLastPublish', () => {
	it('should list a skill another user saved since the last publish', async () => {
		const service = makeService({
			published: { skill_a: 1 },
			latest: { skill_a: 3 },
			authors: [
				{ skillId: 'skill_a', version: 1, createdById: 'user-1' },
				{ skillId: 'skill_a', version: 2, createdById: 'user-1' },
				{ skillId: 'skill_a', version: 3, createdById: 'user-2' },
			],
		});

		const result = await service.changedByOthersSinceLastPublish(
			{ schema: schemaWith('skill_a'), activeVersionId: 'agent-v1' },
			'user-1',
		);

		expect(result).toEqual([{ id: 'skill_a', name: 'Refund policy' }]);
	});

	it('should not list a skill that only the publishing user saved', async () => {
		const service = makeService({
			published: { skill_a: 1 },
			latest: { skill_a: 2 },
			authors: [
				{ skillId: 'skill_a', version: 1, createdById: 'user-2' },
				{ skillId: 'skill_a', version: 2, createdById: 'user-1' },
			],
		});

		const result = await service.changedByOthersSinceLastPublish(
			{ schema: schemaWith('skill_a'), activeVersionId: 'agent-v1' },
			'user-1',
		);

		expect(result).toEqual([]);
	});

	it('should not list unchanged skills or skills new to the agent', async () => {
		const service = makeService({
			published: { skill_a: 2 },
			latest: { skill_a: 2, skill_b: 4 },
			authors: [],
		});

		const result = await service.changedByOthersSinceLastPublish(
			{ schema: schemaWith('skill_a', 'skill_b'), activeVersionId: 'agent-v1' },
			'user-1',
		);

		expect(result).toEqual([]);
	});

	it('should return nothing for an agent that was never published', async () => {
		const service = makeService({ published: {}, latest: { skill_a: 2 }, authors: [] });

		const result = await service.changedByOthersSinceLastPublish(
			{ schema: schemaWith('skill_a'), activeVersionId: null },
			'user-1',
		);

		expect(result).toEqual([]);
	});
});
