import { mockLogger } from '@n8n/backend-test-utils';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import type { Skill } from '../database/entities/skill.entity';
import type { SkillRepository } from '../database/repositories/skill.repository';
import { SkillsTelemetry } from '../services/skills-telemetry.service';

function skill(id: string, target: Partial<Pick<Skill, 'projectId'>> = {}): Skill {
	return mock<Skill>({ id, projectId: target.projectId ?? null });
}

describe('SkillsTelemetry', () => {
	const telemetry = mock<Telemetry>();
	const repository = mock<SkillRepository>();
	const service = new SkillsTelemetry(telemetry, repository, mockLogger());
	const skills = [skill('skill_instance'), skill('skill_project', { projectId: 'project-1' })];

	beforeEach(() => {
		vi.resetAllMocks();
		repository.findByIds.mockImplementation(async (ids) =>
			skills.filter((s) => ids.includes(s.id)),
		);
	});

	it('reports each created skill with its scope', async () => {
		await service.created('user-1', ['skill_instance', 'skill_project'], 'ui', 'upload');

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
		]);
	});

	it('reports the provider and access of the source of a synced skill', async () => {
		await service.created('user-1', ['skill_instance'], 'github', 'sync', {
			source_provider: 'github',
			source_access: 'credential',
		});

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_CREATED_SKILL, {
			user_id: 'user-1',
			skill_id: 'skill_instance',
			scope: 'instance',
			source: 'github',
			method: 'sync',
			source_provider: 'github',
			source_access: 'credential',
		});
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
		await service.updated('user-1', { id: 'skill_project', projectId: 'project-9' }, 'ui', 2, true);

		expect(repository.findByIds).not.toHaveBeenCalled();
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_UPDATED_SKILL,
			expect.objectContaining({ scope: 'project', project_id: 'project-9' }),
		);
	});

	it('reports a delete from the skill read before the delete', async () => {
		repository.findByIds.mockResolvedValue([]);

		await service.deleted('user-1', skills[1], 'assistant');

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_DELETED_SKILL, {
			user_id: 'user-1',
			skill_id: 'skill_project',
			scope: 'project',
			project_id: 'project-1',
			source: 'assistant',
		});
	});

	it('reports a Skill Sync connect with its reason code', async () => {
		const props = {
			provider: 'github' as const,
			access: 'public' as const,
			scope_type: 'team' as const,
			duplicate_result: 'blocked' as const,
			status: 'failure' as const,
			reason: 'duplicate_source' as const,
		};

		await service.connectedSource(props, 'user-1');

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_CONNECTED_SKILL_SOURCE,
			{ user_id: 'user-1', ...props },
		);
	});

	it('reports a flagged skill with the user at import, and without one in the background', async () => {
		const props = {
			provider: 'github' as const,
			stage: 'import' as const,
			verdict: 'needs_review' as const,
			rule_codes: ['hidden_unicode' as const],
		};

		await service.flaggedSkill(props, 'user-1');
		await service.flaggedSkill({ ...props, stage: 'update' });

		expect(telemetry.track.mock.calls).toEqual([
			[TELEMETRY_EVENT.CONTEXT.SKILL_SOURCE_CHECK_FLAGGED_SKILL, { user_id: 'user-1', ...props }],
			[TELEMETRY_EVENT.CONTEXT.SKILL_SOURCE_CHECK_FLAGGED_SKILL, { ...props, stage: 'update' }],
		]);
	});

	it('reports a Skill Sync import with its counts', async () => {
		const props = {
			provider: 'github' as const,
			access: 'credential' as const,
			scope_type: 'global' as const,
			first_or_more: 'first' as const,
			selected: 4,
			imported: 2,
			name_taken: 1,
			blocked: 1,
			needs_review: 1,
			skipped_files: 4,
			status: 'success' as const,
		};

		await service.importedFromSource(props, 'user-1');

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_IMPORTED_SKILLS_FROM_SOURCE,
			{ user_id: 'user-1', ...props },
		);
	});

	it('reports a stop of Skill Sync with whether an update waited', async () => {
		await service.stoppedSync({ provider: 'github', had_pending_update: true }, 'user-1');

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_STOPPED_SKILL_SYNC, {
			user_id: 'user-1',
			provider: 'github',
			had_pending_update: true,
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
