/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { User, WorkflowEntity } from '@n8n/db';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import {
	createSkillServices,
	PROJECT,
	expectError,
	skillRow,
	versionRow,
	resetSkillMocks,
} from './test-utils/skill-services';

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

describe('SkillAccessService', () => {
	const {
		skills,
		usage,
		txRunner,
		projectScope,
		workflowSharing,
		workflows,
		workflowsInSkillsGate,
		access,
	} = createSkillServices();
	const user = mock<User>({ id: 'user-1' });

	beforeEach(async () => await resetSkillMocks({ skills, usage, txRunner }));

	describe('canAccess for update', () => {
		it('checks projectSkill:update on the project of a project skill', async () => {
			projectScope.hasScopes.mockResolvedValue(true);

			expect(
				await access.canAccess(user, skillRow('skill_a', { projectId: PROJECT }), 'update'),
			).toBe(true);
			expect(projectScope.hasScopes).toHaveBeenCalledWith(user, PROJECT, ['projectSkill:update']);
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

		it('checks the scope of the operation on the project of a project skill', async () => {
			projectScope.hasScopes.mockResolvedValue(false);

			expect(
				await access.canAccess(user, skillRow('skill_a', { projectId: PROJECT }), 'delete'),
			).toBe(false);
			expect(projectScope.hasScopes).toHaveBeenCalledWith(user, PROJECT, ['projectSkill:delete']);
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

			expect(canUpdate(skillRow('skill_a', { projectId: PROJECT }))).toBe(true);
			expect(canUpdate(skillRow('skill_b', { projectId: 'other-project' }))).toBe(false);
			expect(projectScope.getProjectIds).toHaveBeenCalledTimes(1);
			expect(projectScope.getProjectIds).toHaveBeenCalledWith(user, ['projectSkill:update']);
			expect(projectScope.hasScopes).not.toHaveBeenCalled();
		});

		it('allows every project skill when the global role grants the scope', async () => {
			projectScope.getProjectIds.mockResolvedValue(null);

			const canDelete = await access.accessCheck(user, 'delete');

			expect(canDelete(skillRow('skill_a', { projectId: 'any-project' }))).toBe(true);
		});

		it('applies the canAccess rules to instance skills', async () => {
			projectScope.getProjectIds.mockResolvedValue([]);
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			const canUpdate = await access.accessCheck(user, 'update');
			const canRead = await access.accessCheck(user, 'read');

			expect(canUpdate(skillRow('skill_c'))).toBe(false);
			expect(canRead(skillRow('skill_c'))).toBe(true);
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

	describe('assertCanReadMentionedWorkflows', () => {
		const mention = (id: string) => `[Workflow ${id}](n8n://workflow/${id})`;

		function givenWorkflows(existing: string[], readable: string[]) {
			workflowsInSkillsGate.isEnabled.mockResolvedValue(true);
			workflows.findByIds.mockResolvedValue(existing.map((id) => mock<WorkflowEntity>({ id })));
			workflowSharing.getSharedWorkflowScopes.mockImplementation(async (ids) =>
				ids.map((id): [string, Scope[]] => [id, readable.includes(id) ? ['workflow:read'] : []]),
			);
		}

		it('passes when the author can read each added workflow', async () => {
			givenWorkflows(['wf1', 'wf2'], ['wf1', 'wf2']);

			await access.assertCanReadMentionedWorkflows(user, {
				instructions: `Use ${mention('wf1')}.`,
				references: [{ path: 'references/a.md', content: mention('wf2') }],
			});

			expect(workflowSharing.getSharedWorkflowScopes).toHaveBeenCalledWith(['wf1', 'wf2'], user);
		});

		it('refuses a workflow that the author cannot read or that does not exist, and names each one', async () => {
			givenWorkflows(['wf1', 'wf2'], ['wf1', 'wf3']);

			await expectError(
				access.assertCanReadMentionedWorkflows(user, {
					instructions: [mention('wf1'), mention('wf2'), mention('wf3')].join(' '),
				}),
				UserError,
				'Can\'t save the skill. Workflows "wf2", "wf3" don\'t exist or you don\'t have access to them. Remove the mentions, or ask the workflow owners to share them with you.',
			);
		});

		it('names one refused workflow in the singular', async () => {
			givenWorkflows([], []);

			await expectError(
				access.assertCanReadMentionedWorkflows(user, { instructions: mention('wf1') }),
				UserError,
				"Can't save the skill. Workflow \"wf1\" doesn't exist or you don't have access to it. Remove the mention, or ask the workflow owner to share it with you.",
			);
		});

		it('checks only the workflows that the previous version does not mention', async () => {
			givenWorkflows(['wf2'], ['wf2']);

			await access.assertCanReadMentionedWorkflows(
				user,
				{ instructions: `${mention('wf1')} ${mention('wf2')}` },
				{ instructions: mention('wf1') },
			);

			expect(workflowSharing.getSharedWorkflowScopes).toHaveBeenCalledWith(['wf2'], user);
		});

		it('reads nothing when the save adds no mention', async () => {
			await access.assertCanReadMentionedWorkflows(
				user,
				{ instructions: 'Shorter.' },
				{ instructions: mention('wf1') },
			);

			expect(workflowsInSkillsGate.isEnabled).not.toHaveBeenCalled();
			expect(workflowSharing.getSharedWorkflowScopes).not.toHaveBeenCalled();
		});

		it('checks nothing while the flag is off', async () => {
			workflowsInSkillsGate.isEnabled.mockResolvedValue(false);

			await access.assertCanReadMentionedWorkflows(user, { instructions: mention('wf1') });

			expect(workflowSharing.getSharedWorkflowScopes).not.toHaveBeenCalled();
		});
	});
});
