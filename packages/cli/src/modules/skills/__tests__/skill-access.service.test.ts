/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import {
	createSkillServices,
	PROJECT,
	expectError,
	skillRow,
	versionRow,
	resetSkillMocks,
} from './test-utils/skill-services';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

describe('SkillAccessService', () => {
	const { skills, skillUsage, txRunner, projectScope, access } = createSkillServices();
	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => resetSkillMocks({ skills, skillUsage, txRunner }));

	describe('canAccess for update', () => {
		it('checks projectSkill:update on the project of a project skill', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);

			expect(
				await access.canAccess(user, skillRow('skill_a', { projectId: PROJECT }), 'update'),
			).toBe(true);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:update'], false, {
				projectId: PROJECT,
			});
		});

		it('checks projectSkill:update on the project of the agent of an agent skill', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
			skillUsage.findAgents.mockResolvedValue(
				new Map([['agent-1', { name: 'Support bot', projectId: PROJECT }]]),
			);

			expect(
				await access.canAccess(user, skillRow('skill_a', { agentId: 'agent-1' }), 'update'),
			).toBe(true);
			expect(skillUsage.findAgents).toHaveBeenCalledWith(['agent-1'], {});
			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:update'], false, {
				projectId: PROJECT,
			});
		});

		it('needs skill:update for an instance skill', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			expect(await access.canAccess(user, skillRow('skill_a'), 'update')).toBe(true);
			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:update');
		});

		it('refuses an instance skill without skill:update', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			expect(await access.canAccess(user, skillRow('skill_a'), 'update')).toBe(false);
		});
	});

	describe('canAccess', () => {
		it('lets every user read an instance skill', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			expect(await access.canAccess(user, skillRow('skill_a'), 'read')).toBe(true);
		});

		it('needs skill:read for an agent skill whose agent is gone', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);
			skillUsage.findAgents.mockResolvedValue(new Map());

			expect(await access.canAccess(user, skillRow('skill_a', { agentId: 'gone' }), 'read')).toBe(
				false,
			);
			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:read');
		});

		it('checks the scope of the operation on the project of a project skill', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			expect(
				await access.canAccess(user, skillRow('skill_a', { projectId: PROJECT }), 'delete'),
			).toBe(false);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:delete'], false, {
				projectId: PROJECT,
			});
		});

		it('needs skill:delete to delete an instance skill', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			expect(await access.canAccess(user, skillRow('skill_a'), 'delete')).toBe(true);
			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:delete');
		});
	});

	describe('accessCheck', () => {
		it('reads the projects of the operation once and checks project skills against them', async () => {
			projectScope.getProjectIds.mockResolvedValue([PROJECT]);
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			const canUpdate = await access.accessCheck(user, 'update');

			expect(canUpdate(skillRow('skill_a', { projectId: PROJECT }), PROJECT)).toBe(true);
			expect(canUpdate(skillRow('skill_b', { projectId: 'other-project' }), 'other-project')).toBe(
				false,
			);
			// An agent skill is checked against the project of its agent.
			expect(canUpdate(skillRow('skill_c', { agentId: 'agent-1' }), PROJECT)).toBe(true);
			expect(projectScope.getProjectIds).toHaveBeenCalledTimes(1);
			expect(projectScope.getProjectIds).toHaveBeenCalledWith(user, ['projectSkill:update']);
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('allows every project skill when the global role grants the scope', async () => {
			projectScope.getProjectIds.mockResolvedValue(null);

			const canDelete = await access.accessCheck(user, 'delete');

			expect(canDelete(skillRow('skill_a', { projectId: 'any-project' }), 'any-project')).toBe(
				true,
			);
		});

		it('applies the canAccess rules to instance skills', async () => {
			projectScope.getProjectIds.mockResolvedValue([]);
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			const canUpdate = await access.accessCheck(user, 'update');
			const canRead = await access.accessCheck(user, 'read');

			expect(canUpdate(skillRow('skill_c'), null)).toBe(false);
			expect(canRead(skillRow('skill_c'), null)).toBe(true);
		});
	});

	describe('assertCanEdit', () => {
		it('names the skills the user cannot edit', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 1, { name: 'Tone' })]]),
			);

			await expectError(
				access.assertCanEdit(user, ['skill_a']),
				ForbiddenError,
				'You can use but not edit "Tone" (skill_a). Ask someone who can edit this skill, or detach it from this agent.',
			);
		});

		it('names each skill it refuses, by id when no version is found', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);
			skills.findByIds.mockResolvedValue([skillRow('skill_a'), skillRow('skill_b')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 1, { name: 'Tone' })]]),
			);

			await expectError(
				access.assertCanEdit(user, ['skill_a', 'skill_b']),
				ForbiddenError,
				'You can use but not edit "Tone" (skill_a), "skill_b" (skill_b). Ask someone who can edit these skills, or detach it from this agent.',
			);
		});
	});

	describe('assertCanMove', () => {
		it('throws NotFoundError for a missing skill', async () => {
			await expect(access.assertCanMove(user, 'skill_gone')).rejects.toThrow(NotFoundError);
		});
	});
});
