import type { ListHubSkillsQueryDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { Skill } from '../entities/skill.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ResolvedSkillRow, SkillHubRepository } from '../repositories/skill-hub.repository';
import type { SkillHubService } from '../skills-hub/skill-hub.service';
import { SkillsHubApiService } from '../skills-hub/skills-hub-api.service';

const user = mock<User>({ id: 'user-1', role: { scopes: [] } });

/** Instance skills, so visibility and edit rights need no scopes on the user. */
function skill(id: string): Skill {
	return {
		id,
		userId: null,
		projectId: null,
		source: 'ui',
		createdAt: new Date('2026-10-01T00:00:00.000Z'),
		updatedAt: new Date('2026-10-01T00:00:00.000Z'),
	} as unknown as Skill;
}

function row(id: string, name: string): ResolvedSkillRow {
	return {
		skill: skill(id),
		version: { id: `${id}-v1`, skillId: id, version: 1, name, description: `${name} desc` },
		files: [],
	} as unknown as ResolvedSkillRow;
}

const NAMES: Record<string, string> = {
	skill_a: 'Brand voice',
	skill_b: 'Cite sources',
	skill_c: 'Triage rules',
};

function makeService() {
	const repository = mock<SkillHubRepository>();
	const projectScopeService = mock<ProjectScopeService>();
	projectScopeService.getProjectIds.mockResolvedValue([]);
	repository.findVisibleSkills.mockResolvedValue(Object.keys(NAMES).map(skill));
	repository.findLatestVersionSummaries.mockImplementation(async (ids) => {
		return await Promise.resolve(
			new Map(ids.map((id) => [id, { name: NAMES[id], description: `${NAMES[id]} desc` }])),
		);
	});
	repository.findLatestSavedVersions.mockImplementation(async (ids) => {
		return await Promise.resolve(new Map(ids.map((id) => [id, row(id, NAMES[id])])));
	});
	repository.findDrafts.mockImplementation(async (ids) => {
		return await Promise.resolve(new Map(ids.map((id) => [id, row(id, NAMES[id])])));
	});
	repository.countUsingAgents.mockResolvedValue(new Map());
	repository.findProjectNames.mockResolvedValue(new Map());
	const service = new SkillsHubApiService(
		mock<Logger>(),
		mock<SkillHubService>(),
		repository,
		mock<AgentRepository>(),
		projectScopeService,
		mock<AgentUpdateBroadcaster>(),
	);
	return { service, repository };
}

const query = (overrides: Partial<ListHubSkillsQueryDto>) =>
	({ skip: 0, ...overrides }) as ListHubSkillsQueryDto;

describe('SkillsHubApiService.list', () => {
	it('returns every visible skill when no page size is given', async () => {
		const { service, repository } = makeService();

		const result = await service.list(user, query({}));

		expect(result.count).toBe(3);
		expect(result.data.map(({ id }) => id)).toEqual(['skill_a', 'skill_b', 'skill_c']);
		// Only the page is shaped into list items.
		expect(repository.findLatestSavedVersions).toHaveBeenCalledWith([
			'skill_a',
			'skill_b',
			'skill_c',
		]);
	});

	it('cuts the page after the filters, and counts the whole match', async () => {
		const { service, repository } = makeService();

		const result = await service.list(user, query({ skip: 1, take: 1 }));

		expect(result.count).toBe(3);
		expect(result.data.map(({ id }) => id)).toEqual(['skill_b']);
		expect(repository.findLatestSavedVersions).toHaveBeenCalledWith(['skill_b']);
	});

	it('searches the latest version names before paging', async () => {
		const { service, repository } = makeService();

		const result = await service.list(user, query({ search: 'rules', take: 10 }));

		expect(result.count).toBe(1);
		expect(result.data.map(({ name }) => name)).toEqual(['Triage rules']);
		expect(repository.findLatestVersionSummaries).toHaveBeenCalledWith([
			'skill_a',
			'skill_b',
			'skill_c',
		]);
	});

	it('answers an empty page past the end with the full count', async () => {
		const { service } = makeService();

		const result = await service.list(user, query({ skip: 10, take: 5 }));

		expect(result.count).toBe(3);
		expect(result.data).toEqual([]);
	});
});
