import type { TelemetryProxy } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { Skill } from '../database/entities/skill.entity';
import type { SkillFile } from '../database/entities/skill-file.entity';
import type { SkillVersion } from '../database/entities/skill-version.entity';
import type { SkillRepository } from '../database/repositories/skill.repository';
import { flaggedCodes, SkillsTelemetry } from '../services/skills-telemetry.service';
import type { WorkflowsInSkillsFlagGate } from '../services/workflows-in-skills-flag-gate';
import type { ResolvedSkillRow } from '../utils/skill-content';

function savedRow(instructions: string, references: string[] = []): ResolvedSkillRow {
	return {
		skill: mock<Skill>(),
		version: mock<SkillVersion>({
			name: 'Skill',
			description: 'A skill',
			instructions,
			frontmatter: null,
		}),
		files: references.map((content, index) =>
			mock<SkillFile>({ path: `references/${index}.md`, content }),
		),
	};
}

function mention(workflowId: string): string {
	return `[Workflow ${workflowId}](n8n://workflow/${workflowId})`;
}

function skill(id: string, target: Partial<Pick<Skill, 'projectId'>> = {}): Skill {
	return mock<Skill>({ id, projectId: target.projectId ?? null });
}

describe('SkillsTelemetry', () => {
	const telemetry = mock<TelemetryProxy>();
	const repository = mock<SkillRepository>();
	const workflowsInSkillsFlagGate = mock<WorkflowsInSkillsFlagGate>();
	const service = new SkillsTelemetry(
		telemetry,
		repository,
		mockLogger(),
		workflowsInSkillsFlagGate,
	);
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

	describe('workflow mentions', () => {
		beforeEach(() => {
			workflowsInSkillsFlagGate.isEnabled.mockResolvedValue(true);
		});

		it('counts each mentioned workflow once on create, in SKILL.md and in references', async () => {
			repository.findLatestSaved.mockResolvedValue(
				new Map([
					[
						'skill_instance',
						savedRow(`${mention('wf1')} and ${mention('wf2')}`, [mention('wf1'), mention('wf3')]),
					],
				]),
			);

			await service.created('user-1', ['skill_instance'], 'mcp', 'ai');

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_CREATED_SKILL,
				expect.objectContaining({ skill_id: 'skill_instance', workflow_mention_count: 3 }),
			);
		});

		it('counts the mentions that an update added and removed', async () => {
			repository.findVersionByNumber.mockImplementation(async (_skillId, version) =>
				version === 3
					? savedRow(`${mention('wf1')} ${mention('wf3')}`, [mention('wf4')])
					: savedRow(`${mention('wf1')} ${mention('wf2')}`),
			);

			await service.updated('user-1', 'skill_project', 'assistant', 3, false);

			expect(repository.findVersionByNumber).toHaveBeenCalledWith('skill_project', 3);
			expect(repository.findVersionByNumber).toHaveBeenCalledWith('skill_project', 2);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_UPDATED_SKILL,
				expect.objectContaining({
					workflow_mention_count: 3,
					workflow_mentions_added: 2,
					workflow_mentions_removed: 1,
				}),
			);
		});

		it('sends only the count when the previous version is missing', async () => {
			repository.findVersionByNumber.mockImplementation(async (_skillId, version) =>
				version === 1 ? savedRow(mention('wf1')) : undefined,
			);

			await service.updated('user-1', 'skill_project', 'ui', 1, false);

			const [, props] = telemetry.track.mock.calls[0];
			expect(props).toMatchObject({ workflow_mention_count: 1 });
			expect(props).not.toHaveProperty('workflow_mentions_added');
		});

		it('sends no mention properties when the flag is off', async () => {
			workflowsInSkillsFlagGate.isEnabled.mockResolvedValue(false);

			await service.created('user-1', ['skill_instance'], 'ui', 'manual');
			await service.updated('user-1', 'skill_project', 'ui', 2, false);

			expect(repository.findLatestSaved).not.toHaveBeenCalled();
			expect(repository.findVersionByNumber).not.toHaveBeenCalled();
			expect(telemetry.track.mock.calls).toEqual([
				[
					TELEMETRY_EVENT.CONTEXT.USER_CREATED_SKILL,
					{
						user_id: 'user-1',
						skill_id: 'skill_instance',
						scope: 'instance',
						source: 'ui',
						method: 'manual',
					},
				],
				[
					TELEMETRY_EVENT.CONTEXT.USER_UPDATED_SKILL,
					{
						user_id: 'user-1',
						skill_id: 'skill_project',
						scope: 'project',
						project_id: 'project-1',
						source: 'ui',
						version: 2,
						scope_changed: false,
					},
				],
			]);
		});

		it('sends the events without mention properties when the count fails', async () => {
			repository.findLatestSaved.mockRejectedValue(new Error('read failed'));
			repository.findVersionByNumber.mockRejectedValue(new Error('read failed'));

			await service.created('user-1', ['skill_instance'], 'ui', 'manual');
			await service.updated('user-1', 'skill_project', 'ui', 2, false);

			expect(telemetry.track.mock.calls.map(([event]) => event)).toEqual([
				TELEMETRY_EVENT.CONTEXT.USER_CREATED_SKILL,
				TELEMETRY_EVENT.CONTEXT.USER_UPDATED_SKILL,
			]);
			for (const [, props] of telemetry.track.mock.calls) {
				expect(props).not.toHaveProperty('workflow_mention_count');
			}
		});
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

	it('identifies credential changes and leaves health changes without a user for warehouse-only delivery', async () => {
		await service.updatedSourceCredential({ provider: 'github', status: 'success' }, 'user-1');
		await service.sourceHealthChanged({
			provider: 'github',
			previous_health: 'connected',
			health: 'delayed',
		});
		expect(telemetry.track.mock.calls).toEqual([
			[
				TELEMETRY_EVENT.CONTEXT.USER_UPDATED_SKILL_SOURCE_CREDENTIAL,
				{ user_id: 'user-1', provider: 'github', status: 'success' },
			],
			[
				TELEMETRY_EVENT.CONTEXT.SKILL_SOURCE_HEALTH_CHANGED,
				{ provider: 'github', previous_health: 'connected', health: 'delayed' },
			],
		]);
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

	it('gives each rule and each link reason of the flagged findings one time', () => {
		const link = { rule: 'risky_url', severity: 'needs_review', detail: '' } as const;

		expect(
			flaggedCodes([
				{ ...link, linkReason: 'not_https' },
				{ ...link, linkReason: 'not_https' },
				{ ...link, linkReason: 'ip_address' },
				{ rule: 'new_url', severity: 'info', detail: '' },
			]),
		).toEqual({ rule_codes: ['risky_url'], link_reason_codes: ['not_https', 'ip_address'] });
		expect(
			flaggedCodes([{ rule: 'hidden_unicode', severity: 'needs_review', detail: '' }]),
		).toEqual({ rule_codes: ['hidden_unicode'] });
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
			skipped_file_extensions: { '.py': 2, '.png': 1, none: 1 },
			skipped_script_files: 2,
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
	it('reports update review outcomes without content or agent names', async () => {
		await service.reviewedUpdate(
			{
				provider: 'github',
				kind: 'update',
				action: 'accept',
				verdict: 'needs_review',
				bulk: true,
				status: 'failure',
				reason: 'stale',
			},
			'user-1',
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_REVIEWED_SKILL_UPDATE,
			{
				user_id: 'user-1',
				provider: 'github',
				kind: 'update',
				action: 'accept',
				verdict: 'needs_review',
				bulk: true,
				status: 'failure',
				reason: 'stale',
			},
		);
	});
});
