/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { CreateSkillDto, ListSkillsQueryDto, SaveSkillDto } from '@n8n/api-types';
import type { ProjectScopeService } from '@n8n/backend-services';
import type { OperationContext, TransactionRunner, User, UserRepository } from '@n8n/db';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { SkillAgentsProxy } from '../skill-agents-proxy.service';
import type { SkillFile } from '../skill-file.entity';
import { getSkillHash } from '../skill-hash';
import type { SkillVersion } from '../skill-version.entity';
import type { Skill } from '../skill.entity';
import type { ResolvedSkillRow, SkillRepository } from '../skill.repository';
import type { SkillService } from '../skill.service';
import { SkillsApiService } from '../skills-api.service';
import type { SkillsTelemetry } from '../skills-telemetry';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

const user = mock<User>({ id: 'user-1' });
const DATE = new Date('2026-10-01T00:00:00.000Z');

function skill(
	id: string,
	target: Partial<Pick<Skill, 'projectId' | 'agentId' | 'createdById'>> = {},
): Skill {
	return mock<Skill>({
		id,
		projectId: target.projectId ?? null,
		agentId: target.agentId ?? null,
		source: 'ui',
		createdById: target.createdById ?? null,
		createdAt: DATE,
		updatedAt: DATE,
	});
}

function row(
	owner: Skill,
	version: number,
	fields: { name?: string; instructions?: string } = {},
): ResolvedSkillRow {
	const name = fields.name ?? NAMES[owner.id] ?? 'Skill';
	return {
		skill: owner,
		version: mock<SkillVersion>({
			id: `${owner.id}-v${version}`,
			skillId: owner.id,
			version,
			name,
			description: `${name} desc`,
			instructions: fields.instructions ?? 'Do it.',
			frontmatter: null,
			contentHash: 'hash',
		}),
		files: [] as SkillFile[],
	};
}

const NAMES: Record<string, string> = {
	skill_a: 'Brand voice',
	skill_b: 'Cite sources',
	skill_c: 'Triage rules',
};

const query = (overrides: Partial<ListSkillsQueryDto> = {}) =>
	({ skip: 0, ...overrides }) as ListSkillsQueryDto;

describe('SkillsApiService', () => {
	const repository = mock<SkillRepository>();
	const skillService = mock<SkillService>();
	const projectScopeService = mock<ProjectScopeService>();
	const txRunner = mock<TransactionRunner>();
	const userRepository = mock<UserRepository>();
	const skillsTelemetry = mock<SkillsTelemetry>();
	const skillAgents = mock<SkillAgentsProxy>();
	const service = new SkillsApiService(
		skillService,
		repository,
		projectScopeService,
		txRunner,
		userRepository,
		skillsTelemetry,
		skillAgents,
	);
	const TX_CTX = { trx: {} } as OperationContext;
	let visible: Skill[];

	beforeEach(() => {
		vi.resetAllMocks();
		txRunner.run.mockImplementation(async (_ctx, fn) => await fn(TX_CTX));
		visible = Object.keys(NAMES).map((id) => skill(id));
		projectScopeService.getProjectIds.mockResolvedValue(['project-1']);
		vi.mocked(hasGlobalScope).mockReturnValue(false);
		repository.findVisiblePage.mockImplementation(async () => ({
			skills: visible,
			count: visible.length,
		}));
		repository.findByIds.mockImplementation(async (ids) =>
			visible.filter((s) => ids.includes(s.id)),
		);
		repository.findLatestSummaries.mockImplementation(
			async (ids) =>
				new Map(
					visible
						.filter((s) => ids.includes(s.id))
						.map(({ id }) => {
							const { name, description } = row(skill(id), 2).version;
							return [id, { name, description, version: 2 }] as const;
						}),
				),
		);
		repository.findLatestSaved.mockImplementation(
			async (ids) =>
				new Map(visible.filter((s) => ids.includes(s.id)).map((s) => [s.id, row(s, 2)] as const)),
		);
		skillAgents.countUsingAgents.mockResolvedValue(new Map());
		skillAgents.findAgentIdsInProjects.mockImplementation(async (projectIds) =>
			projectIds.includes('project-1') ? ['agent-1'] : [],
		);
		repository.findProjects.mockImplementation(
			async (ids) => new Map(ids.map((id) => [id, { name: 'Team', type: 'team' as const }])),
		);
		skillAgents.findUsage.mockResolvedValue({ drafts: [], pins: [], hiddenAgents: 0 });
		skillAgents.findAgents.mockImplementation(
			async (ids) =>
				new Map(
					ids
						.filter((id) => id === 'agent-1')
						.map((id) => [id, { name: 'Support bot', projectId: 'project-1' }] as const),
				),
		);
		skillService.canAccess.mockResolvedValue(true);
		skillService.accessCheck.mockResolvedValue(() => true);
	});

	describe('list', () => {
		it('names the creator of each skill, with one user query for the page', async () => {
			visible = [
				skill('skill_a', { createdById: 'user-2' }),
				skill('skill_b', { createdById: 'user-2' }),
				skill('skill_c', { createdById: 'user-gone' }),
			];
			userRepository.findManyByIds.mockResolvedValue([
				mock<User>({
					id: 'user-2',
					email: 'ada@example.com',
					firstName: 'Ada',
					lastName: 'Lovelace',
				}),
			]);

			const result = await service.list(user, query());

			expect(userRepository.findManyByIds).toHaveBeenCalledTimes(1);
			expect(userRepository.findManyByIds).toHaveBeenCalledWith(['user-2', 'user-gone']);
			expect(result.data.map((item) => item.createdBy)).toEqual([
				{ id: 'user-2', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
				{ id: 'user-2', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
				null,
			]);
		});

		it('skips the user query when no skill has a creator', async () => {
			const result = await service.list(user, query());

			expect(userRepository.findManyByIds).not.toHaveBeenCalled();
			expect(result.data.every((item) => item.createdBy === null)).toBe(true);
		});

		it('passes the filters and the page to the repository', async () => {
			const result = await service.list(
				user,
				query({ scope: 'project', projectId: 'project-1', search: 'rules', skip: 10, take: 5 }),
			);

			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				{ projectIds: ['project-1'], agentIds: ['agent-1'] },
				{
					scope: 'project',
					project: { id: 'project-1', agentIds: ['agent-1'] },
					search: 'rules',
					skip: 10,
					take: 5,
				},
			);
			expect(result.count).toBe(3);
		});

		it('passes the agent that attaches skills, with its project', async () => {
			await service.list(user, query({ attachableTo: 'agent-1', search: 'voice' }));

			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					attachableTo: { agentId: 'agent-1', projectId: 'project-1' },
					search: 'voice',
				}),
			);
		});

		it('refuses attachableTo for an unknown agent', async () => {
			await expect(service.list(user, query({ attachableTo: 'agent-gone' }))).rejects.toThrow(
				NotFoundError,
			);
			expect(repository.findVisiblePage).not.toHaveBeenCalled();
		});

		it.each([{ scope: 'agent' as const }, { projectId: 'project-1' }])(
			'refuses attachableTo together with %o',
			async (filter) => {
				await expect(
					service.list(user, query({ attachableTo: 'agent-1', ...filter })),
				).rejects.toThrow(UserError);
				expect(repository.findVisiblePage).not.toHaveBeenCalled();
			},
		);

		it('shapes only the page into list items, from summaries', async () => {
			visible = [skill('skill_b')];
			repository.findVisiblePage.mockResolvedValue({ skills: visible, count: 3 });

			const result = await service.list(user, query({ skip: 1, take: 1 }));

			expect(result).toMatchObject({ count: 3, data: [{ id: 'skill_b', name: 'Cite sources' }] });
			// Summaries carry no instructions or files.
			expect(repository.findLatestSummaries).toHaveBeenCalledWith(['skill_b']);
			expect(repository.findLatestSaved).not.toHaveBeenCalled();
		});

		it('asks for the projects the user may list skills of', async () => {
			await service.list(user, query());

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['projectSkill:list']);
		});

		it('widens the list for a user with global scopes', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);

			await service.list(user, query());

			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				{ projectIds: 'all', agentIds: 'all' },
				expect.anything(),
			);
			expect(skillAgents.findAgentIdsInProjects).not.toHaveBeenCalled();
		});

		it('describes each skill', async () => {
			visible = [skill('skill_a', { projectId: 'project-1' })];
			skillAgents.countUsingAgents.mockResolvedValue(new Map([['skill_a', 2]]));
			repository.findProjects.mockResolvedValue(
				new Map([['project-1', { name: 'Team', type: 'team' as const }]]),
			);
			skillService.accessCheck.mockImplementation(async (_user, op) => () => op === 'update');

			const [item] = (await service.list(user, query())).data;

			expect(item).toEqual({
				id: 'skill_a',
				name: 'Brand voice',
				description: 'Brand voice desc',
				scope: 'project',
				projectId: 'project-1',
				projectName: 'Team',
				projectType: 'team',
				agentId: null,
				agentName: null,
				source: 'ui',
				createdBy: null,
				latestVersion: 2,
				usedByAgents: 2,
				canEdit: true,
				canDelete: false,
				createdAt: DATE.toISOString(),
				updatedAt: DATE.toISOString(),
			});
		});

		it('describes an agent skill with its agent and the project of the agent', async () => {
			visible = [skill('skill_a', { agentId: 'agent-1' })];
			repository.findProjects.mockResolvedValue(
				new Map([['project-1', { name: 'Team', type: 'team' as const }]]),
			);
			const check = vi.fn().mockReturnValue(true);
			skillService.accessCheck.mockResolvedValue(check);

			const [item] = (await service.list(user, query())).data;

			expect(item).toMatchObject({
				scope: 'agent',
				projectId: 'project-1',
				projectName: 'Team',
				agentId: 'agent-1',
				agentName: 'Support bot',
			});
			// Permissions come from the agent's project.
			expect(check).toHaveBeenCalledWith(visible[0], 'project-1');
		});

		it('checks edit and delete once for the page, not once per skill', async () => {
			await service.list(user, query());

			expect(skillService.accessCheck).toHaveBeenCalledTimes(2);
			expect(skillService.accessCheck).toHaveBeenCalledWith(user, 'update');
			expect(skillService.accessCheck).toHaveBeenCalledWith(user, 'delete');
			expect(skillService.canAccess).not.toHaveBeenCalled();
		});
	});

	describe('get', () => {
		it('returns the latest version, its hash and the usage', async () => {
			const usage = {
				drafts: [{ agentId: 'agent-1', agentName: 'Support', projectId: 'project-1' }],
				pins: [],
				hiddenAgents: 1,
			};
			skillAgents.findUsage.mockResolvedValue(usage);
			const latest = row(visible[0], 3, { instructions: 'saved' });
			repository.findLatestSaved.mockResolvedValue(new Map([['skill_a', latest]]));
			repository.findLatestSummaries.mockResolvedValue(
				new Map([
					[
						'skill_a',
						{ name: latest.version.name, description: latest.version.description, version: 3 },
					],
				]),
			);

			const detail = await service.get(user, 'skill_a');

			expect(detail.skill.instructions).toBe('saved');
			expect(detail.latestVersion).toBe(3);
			expect(detail.skillHash).toBe(getSkillHash(detail.skill));
			expect(detail.usedBy).toEqual(usage);
		});

		it('limits the usage to the agents the user may read', async () => {
			await service.get(user, 'skill_a');

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:read']);
			expect(skillAgents.findUsage).toHaveBeenCalledWith('skill_a', ['project-1']);
		});

		it('shows the agents of every project to a user with the global agent scope', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);

			await service.get(user, 'skill_a');

			expect(skillAgents.findUsage).toHaveBeenCalledWith('skill_a', 'all');
		});

		it('answers a skill the user cannot see like a missing one', async () => {
			skillService.canAccess.mockResolvedValue(false);

			await expect(service.get(user, 'skill_a')).rejects.toThrow(NotFoundError);
			await expect(service.get(user, 'skill_gone')).rejects.toThrow(NotFoundError);
			expect(skillService.canAccess).toHaveBeenCalledWith(user, visible[0], 'read');
		});
	});

	describe('create', () => {
		const body = { name: 'Tone', description: 'How we sound', instructions: 'Be kind.' };
		const payload = (overrides: Partial<CreateSkillDto>) =>
			({ scope: 'instance', skill: body, ...overrides }) as CreateSkillDto;

		beforeEach(() => {
			skillService.create.mockImplementation(async () => {
				visible.push(skill('skill_new'));
				return 'skill_new';
			});
		});

		// A custom role can hold projectSkill:create without projectSkill:read.
		it('returns the new skill to a creator who may not read it afterwards', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
			skillService.canAccess.mockResolvedValue(false);
			skillService.accessCheck.mockResolvedValue(() => false);

			const detail = await service.create(
				user,
				payload({ scope: 'project', projectId: 'project-1' }),
			);

			expect(detail).toMatchObject({ id: 'skill_new', name: 'Skill', canEdit: false });
		});

		it('reports the create with the method the client sent', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ method: 'upload' }));

			expect(skillsTelemetry.created).toHaveBeenCalledWith(
				user.id,
				[{ id: 'skill_new', projectId: null, agentId: null }],
				'ui',
				'upload',
			);
		});

		it('reports a create from another source than the settings page as written with AI', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ method: 'upload' }), 'mcp');

			expect(skillsTelemetry.created).toHaveBeenCalledWith(
				user.id,
				[{ id: 'skill_new', projectId: null, agentId: null }],
				'mcp',
				'ai',
			);
		});

		it('reports a create without a method as manual', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({}));

			expect(skillsTelemetry.created).toHaveBeenCalledWith(
				user.id,
				[{ id: 'skill_new', projectId: null, agentId: null }],
				'ui',
				'manual',
			);
		});

		it('reports nothing for a refused create', async () => {
			await expect(service.create(user, payload({}))).rejects.toThrow(ForbiddenError);

			expect(skillsTelemetry.created).not.toHaveBeenCalled();
		});

		it('creates an agent skill with projectSkill:create on the project of the agent', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);

			const detail = await service.create(user, payload({ scope: 'agent', agentId: 'agent-1' }));

			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:create'], false, {
				projectId: 'project-1',
			});
			expect(skillService.create).toHaveBeenCalledWith({
				checkNameTaken: true,
				target: { projectId: null, agentId: 'agent-1' },
				skill: body,
				source: 'ui',
				createdById: user.id,
			});
			expect(detail.id).toBe('skill_new');
		});

		it('stores the source the caller passed', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({}), 'assistant');

			expect(skillService.create).toHaveBeenCalledWith(
				expect.objectContaining({ source: 'assistant' }),
			);
		});

		it('refuses an agent skill for an agent that does not exist', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);

			await expect(
				service.create(user, payload({ scope: 'agent', agentId: 'agent-gone' })),
			).rejects.toThrow(NotFoundError);
			expect(skillService.create).not.toHaveBeenCalled();
		});

		it('creates a project skill with projectSkill:create, also in a personal project', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);

			await service.create(user, payload({ scope: 'project', projectId: 'personal-1' }));

			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:create'], false, {
				projectId: 'personal-1',
			});
			expect(skillService.create).toHaveBeenCalledWith(
				expect.objectContaining({ target: { projectId: 'personal-1', agentId: null } }),
			);
		});

		it('creates an instance skill with skill:create', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ scope: 'instance' }));

			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:create');
			expect(skillService.create).toHaveBeenCalledWith(
				expect.objectContaining({ target: { projectId: null, agentId: null } }),
			);
		});

		it.each([
			['project', {}, UserError],
			['project', { projectId: 'project-1', agentId: 'agent-1' }, UserError],
			['agent', {}, UserError],
			['agent', { agentId: 'agent-1', projectId: 'project-1' }, UserError],
			['agent', { agentId: 'agent-1' }, ForbiddenError],
			['instance', { projectId: 'project-1' }, UserError],
			['instance', { agentId: 'agent-1' }, UserError],
			['instance', {}, ForbiddenError],
			['project', { projectId: 'project-1' }, ForbiddenError],
		] as const)('refuses scope %s with %o', async (scope, extra, errorClass) => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(service.create(user, payload({ scope, ...extra }))).rejects.toThrow(errorClass);
			expect(skillService.create).not.toHaveBeenCalled();
		});

		// A global projectSkill:create passes the scope check for any project id.
		it('refuses a project skill for a project that does not exist', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
			repository.findProjects.mockResolvedValue(new Map());

			await expect(
				service.create(user, payload({ scope: 'project', projectId: 'project-gone' })),
			).rejects.toThrow(NotFoundError);
			expect(repository.findProjects).toHaveBeenCalledWith(['project-gone']);
			expect(skillService.create).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		const update = (fields: Partial<SaveSkillDto>) => fields as SaveSkillDto;
		const saved = {
			versionId: 'v3',
			version: 3,
			created: true,
			skill: { name: 'Brand voice', description: 'd', instructions: 'New.' },
			followingAgentIds: ['agent-1'],
		};

		it('saves the update for a user who may edit the skill', async () => {
			skillService.save.mockResolvedValue(saved);

			const result = await service.update(
				user,
				'skill_a',
				update({ instructions: 'New.', baseSkillHash: 'base' }),
			);

			expect(skillService.save).toHaveBeenCalledWith(
				'skill_a',
				{ instructions: 'New.', baseSkillHash: 'base' },
				user.id,
			);
			expect(skillService.canAccess).toHaveBeenCalledWith(user, visible[0], 'update');
			expect(skillsTelemetry.updated).toHaveBeenCalledWith(user.id, visible[0], 'ui', 3, false);
			const { followingAgentIds: _following, ...response } = saved;
			expect(result).toEqual({
				id: 'skill_a',
				...response,
				skillHash: getSkillHash(saved.skill),
			});
		});

		it('reports the update with the source the caller passed', async () => {
			skillService.save.mockResolvedValue(saved);

			await service.update(
				user,
				'skill_a',
				update({ instructions: 'New.', baseSkillHash: 'base' }),
				'assistant',
			);

			expect(skillsTelemetry.updated).toHaveBeenCalledWith(
				user.id,
				visible[0],
				'assistant',
				3,
				false,
			);
		});

		it('refuses a user who may not edit the skill', async () => {
			skillService.canAccess.mockImplementation(async (_user, _skill, op) => op === 'read');

			await expect(
				service.update(user, 'skill_a', update({ instructions: 'New.' })),
			).rejects.toThrow(ForbiddenError);
			expect(skillService.save).not.toHaveBeenCalled();
		});

		it('answers a skill the user cannot see like a missing one', async () => {
			skillService.canAccess.mockResolvedValue(false);

			await expect(
				service.update(user, 'skill_a', update({ instructions: 'New.' })),
			).rejects.toThrow(NotFoundError);
		});

		it('moves the skill and saves it in one transaction, then refreshes after the commit', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
			repository.findProjects.mockResolvedValue(
				new Map([['project-1', { name: 'Team', type: 'team' as const }]]),
			);
			skillService.save.mockResolvedValue(saved);
			skillService.assertCanMove.mockResolvedValue({ projectId: null, agentId: null });

			await service.update(
				user,
				'skill_a',
				update({ scope: 'project', projectId: 'project-1', baseSkillHash: 'base' }),
			);

			expect(skillService.changeTarget).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: 'project-1', agentId: null },
				undefined,
				TX_CTX,
				// The move is refused under its lock if the skill left the scope checked here.
				{ nameAfterMove: undefined, checkedSource: { projectId: null, agentId: null } },
			);
			expect(skillService.save).toHaveBeenCalledWith(
				'skill_a',
				{ baseSkillHash: 'base' },
				user.id,
				TX_CTX,
			);
			expect(skillService.refreshFollowingAgents).toHaveBeenCalledWith(['agent-1']);
			// The place the move wrote, not a read after the commit.
			expect(skillsTelemetry.updated).toHaveBeenCalledWith(
				user.id,
				{ id: 'skill_a', projectId: 'project-1', agentId: null },
				'ui',
				3,
				true,
			);
			// The move runs first, so the save checks a rename in the new scope.
			expect(skillService.changeTarget.mock.invocationCallOrder[0]).toBeLessThan(
				skillService.save.mock.invocationCallOrder[0],
			);
		});

		it('reports nothing for a save that stored no new version', async () => {
			skillService.save.mockResolvedValue({ ...saved, created: false, followingAgentIds: [] });

			await service.update(user, 'skill_a', update({ instructions: 'Do it.', baseSkillHash: 'b' }));

			expect(skillsTelemetry.updated).not.toHaveBeenCalled();
		});

		it('does not move a skill that is already in the requested scope', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);
			skillService.save.mockResolvedValue(saved);

			await service.update(user, 'skill_a', update({ scope: 'instance', baseSkillHash: 'base' }));

			expect(skillService.changeTarget).not.toHaveBeenCalled();
			expect(txRunner.run).not.toHaveBeenCalled();
		});

		it('refuses a move to a place where the user may not create skills', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(
				service.update(
					user,
					'skill_a',
					update({ scope: 'project', projectId: 'project-1', baseSkillHash: 'base' }),
				),
			).rejects.toThrow(ForbiddenError);
			expect(skillService.changeTarget).not.toHaveBeenCalled();
			expect(skillService.save).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('deletes for a user with the delete permission', async () => {
			await service.delete(user, 'skill_a');

			expect(skillService.canAccess).toHaveBeenCalledWith(user, visible[0], 'delete');
			expect(skillService.deleteSkill).toHaveBeenCalledWith('skill_a', ['project-1']);
			expect(skillsTelemetry.deleted).toHaveBeenCalledWith(user.id, visible[0], 'ui');
		});

		it('reports the delete with the source the caller passed', async () => {
			await service.delete(user, 'skill_a', 'mcp');

			expect(skillsTelemetry.deleted).toHaveBeenCalledWith(user.id, visible[0], 'mcp');
		});

		it('names the agents of the projects the user may read in a conflict', async () => {
			await service.delete(user, 'skill_a');

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:read']);
		});

		it('names every agent for a user with the global agent scope', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);

			await service.delete(user, 'skill_a');

			expect(skillService.deleteSkill).toHaveBeenCalledWith('skill_a', 'all');
		});

		it('refuses a user without it', async () => {
			skillService.canAccess.mockImplementation(async (_user, _skill, op) => op === 'read');

			await expect(service.delete(user, 'skill_a')).rejects.toThrow(ForbiddenError);
			expect(skillService.deleteSkill).not.toHaveBeenCalled();
			expect(skillsTelemetry.deleted).not.toHaveBeenCalled();
		});
	});
});
