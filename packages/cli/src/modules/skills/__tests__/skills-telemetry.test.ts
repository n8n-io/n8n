import { mockLogger } from '@n8n/backend-test-utils';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import type { SkillUsageProxy } from '../services/skill-usage-proxy.service';
import type { Skill } from '../database/entities/skill.entity';
import type { SkillRepository } from '../database/repositories/skill.repository';
import { SkillsTelemetry } from '../services/skills-telemetry.service';

function skill(id: string, target: Partial<Pick<Skill, 'projectId' | 'agentId'>> = {}): Skill {
	return mock<Skill>({ id, projectId: target.projectId ?? null, agentId: target.agentId ?? null });
}

describe('SkillsTelemetry', () => {
	const telemetry = mock<Telemetry>();
	const repository = mock<SkillRepository>();
	const skillUsage = mock<SkillUsageProxy>();
	const service = new SkillsTelemetry(telemetry, repository, mockLogger(), skillUsage);
	const skills = [
		skill('skill_instance'),
		skill('skill_project', { projectId: 'project-1' }),
		skill('skill_agent', { agentId: 'agent-1' }),
	];

	beforeEach(() => {
		vi.resetAllMocks();
		repository.findByIds.mockImplementation(async (ids) =>
			skills.filter((s) => ids.includes(s.id)),
		);
		skillUsage.findAgents.mockImplementation(
			async (ids) =>
				new Map(
					ids
						.filter((id) => id === 'agent-1')
						.map((id) => [id, { name: 'Support bot', projectId: 'project-2' }] as const),
				),
		);
	});

	it('reports each created skill with its scope, and an agent skill with the project of its agent', async () => {
		await service.created(
			'user-1',
			['skill_instance', 'skill_project', 'skill_agent'],
			'ui',
			'upload',
		);

		const base = { user_id: 'user-1', source: 'ui', method: 'upload' };
		expect(telemetry.track.mock.calls).toEqual([
			[
				TELEMETRY_EVENT.CONTEXT.USER_CREATED_SKILL,
				{ ...base, skill_id: 'skill_instance', scope: 'instance' },
			],
			[
				TELEMETRY_EVENT.CONTEXT.USER_CREATED_SKILL,
				{ ...base, skill_id: 'skill_project', scope: 'project', project_id: 'project-1' },
			],
			[
				TELEMETRY_EVENT.CONTEXT.USER_CREATED_SKILL,
				{ ...base, skill_id: 'skill_agent', scope: 'agent', project_id: 'project-2' },
			],
		]);
	});

	it('reports an update with the scope after the save', async () => {
		await service.updated('user-1', 'skill_project', 'mcp', 4, true);

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_SKILL, {
			user_id: 'user-1',
			skill_id: 'skill_project',
			scope: 'project',
			project_id: 'project-1',
			source: 'mcp',
			version: 4,
			scope_changed: true,
		});
	});

	it('reports the place the caller passed without reading the skill back', async () => {
		await service.updated(
			'user-1',
			{ id: 'skill_project', projectId: 'project-9', agentId: null },
			'ui',
			2,
			true,
		);

		expect(repository.findByIds).not.toHaveBeenCalled();
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_UPDATED_SKILL,
			expect.objectContaining({ scope: 'project', project_id: 'project-9' }),
		);
	});

	it('reports a delete from the skill read before the delete', async () => {
		repository.findByIds.mockResolvedValue([]);

		await service.deleted('user-1', skills[2], 'assistant');

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_DELETED_SKILL, {
			user_id: 'user-1',
			skill_id: 'skill_agent',
			scope: 'agent',
			project_id: 'project-2',
			source: 'assistant',
		});
	});

	it('never fails the write it reports', async () => {
		repository.findByIds.mockRejectedValue(new Error('connection lost'));

		await expect(service.created('user-1', ['skill_project'], 'ui', 'manual')).resolves.toBe(
			undefined,
		);
		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
