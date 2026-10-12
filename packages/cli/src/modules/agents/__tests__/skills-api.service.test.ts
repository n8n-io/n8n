/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { CreateSkillDto, ListSkillsQueryDto, UpdateAgentSkillDto } from '@n8n/api-types';
import type { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { SkillFile } from '../entities/skill-file.entity';
import type { SkillVersion } from '../entities/skill-version.entity';
import type { Skill } from '../entities/skill.entity';
import type { ResolvedSkillRow, SkillRepository } from '../repositories/skill.repository';
import { SkillsApiService } from '../skills/skills-api.service';
import type { SkillService } from '../skills/skill.service';
import { getAgentSkillHash } from '../utils/agent-config-hash';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

const user = mock<User>({ id: 'user-1' });
const DATE = new Date('2026-10-01T00:00:00.000Z');

function skill(id: string, target: Partial<Pick<Skill, 'userId' | 'projectId'>> = {}): Skill {
	return mock<Skill>({
		id,
		userId: target.userId ?? null,
		projectId: target.projectId ?? null,
		source: 'ui',
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
	const service = new SkillsApiService(skillService, repository, projectScopeService);
	let visible: Skill[];

	beforeEach(() => {
		vi.resetAllMocks();
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
		repository.countUsingAgents.mockResolvedValue(new Map());
		repository.findProjectNames.mockImplementation(
			async (ids) => new Map(ids.map((id) => [id, 'Team'] as const)),
		);
		repository.findUsage.mockResolvedValue({ drafts: [], pins: [], hiddenAgents: 0 });
		skillService.canAccess.mockResolvedValue(true);
		skillService.accessCheck.mockResolvedValue(() => true);
	});

	describe('list', () => {
		it('passes the filters and the page to the repository', async () => {
			const result = await service.list(
				user,
				query({ scope: 'project', projectId: 'project-1', search: 'rules', skip: 10, take: 5 }),
			);

			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				{ userId: user.id, allUsers: false, projectIds: ['project-1'] },
				{ scope: 'project', projectId: 'project-1', search: 'rules', skip: 10, take: 5 },
			);
			expect(result.count).toBe(3);
		});

		it('passes the project an agent attaches skills for', async () => {
			await service.list(user, query({ attachableTo: 'project-1', search: 'voice' }));

			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ attachableTo: 'project-1', search: 'voice' }),
			);
		});

		it.each([{ scope: 'user' as const }, { projectId: 'project-1' }])(
			'refuses attachableTo together with %o',
			async (filter) => {
				await expect(
					service.list(user, query({ attachableTo: 'project-1', ...filter })),
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
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.list(user, query());

			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:list');
			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				{ userId: user.id, allUsers: true, projectIds: 'all' },
				expect.anything(),
			);
		});

		it('describes each skill', async () => {
			visible = [skill('skill_a', { projectId: 'project-1' })];
			repository.countUsingAgents.mockResolvedValue(new Map([['skill_a', 2]]));
			repository.findProjectNames.mockResolvedValue(new Map([['project-1', 'Team']]));
			skillService.accessCheck.mockImplementation(async (_user, op) => () => op === 'update');

			const [item] = (await service.list(user, query())).data;

			expect(item).toEqual({
				id: 'skill_a',
				name: 'Brand voice',
				description: 'Brand voice desc',
				scope: 'project',
				projectId: 'project-1',
				projectName: 'Team',
				userId: null,
				source: 'ui',
				latestVersion: 2,
				usedByAgents: 2,
				canEdit: true,
				canDelete: false,
				createdAt: DATE.toISOString(),
				updatedAt: DATE.toISOString(),
			});
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
			repository.findUsage.mockResolvedValue(usage);
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
			expect(detail.skillHash).toBe(getAgentSkillHash(detail.skill));
			expect(detail.usedBy).toEqual(usage);
		});

		it('limits the usage to the agents the user may read', async () => {
			await service.get(user, 'skill_a');

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:read']);
			expect(repository.findUsage).toHaveBeenCalledWith('skill_a', ['project-1']);
		});

		it('shows the agents of every project to a user with the global agent scope', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);

			await service.get(user, 'skill_a');

			expect(repository.findUsage).toHaveBeenCalledWith('skill_a', 'all');
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
			({ scope: 'user', skill: body, ...overrides }) as CreateSkillDto;

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

		it('creates a "Just you" skill for the caller', async () => {
			const detail = await service.create(user, payload({ scope: 'user' }));

			expect(skillService.create).toHaveBeenCalledWith({
				target: { userId: user.id, projectId: null },
				skill: body,
				source: 'ui',
				createdById: user.id,
			});
			expect(detail.id).toBe('skill_new');
		});

		it('creates a project skill with projectSkill:create, also in a personal project', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);

			await service.create(user, payload({ scope: 'project', projectId: 'personal-1' }));

			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:create'], false, {
				projectId: 'personal-1',
			});
			expect(skillService.create).toHaveBeenCalledWith(
				expect.objectContaining({ target: { userId: null, projectId: 'personal-1' } }),
			);
		});

		it('creates an instance skill with skill:create', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ scope: 'instance' }));

			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:create');
			expect(skillService.create).toHaveBeenCalledWith(
				expect.objectContaining({ target: { userId: null, projectId: null } }),
			);
		});

		it.each([
			['project', {}, UserError],
			['user', { projectId: 'project-1' }, UserError],
			['instance', { projectId: 'project-1' }, UserError],
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
			repository.findProjectNames.mockResolvedValue(new Map());

			await expect(
				service.create(user, payload({ scope: 'project', projectId: 'project-gone' })),
			).rejects.toThrow(NotFoundError);
			expect(repository.findProjectNames).toHaveBeenCalledWith(['project-gone']);
			expect(skillService.create).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		const update = (fields: Partial<UpdateAgentSkillDto>) => fields as UpdateAgentSkillDto;
		const saved = {
			versionId: 'v3',
			version: 3,
			created: true,
			skill: { name: 'Brand voice', description: 'd', instructions: 'New.' },
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
			expect(result).toEqual({
				id: 'skill_a',
				...saved,
				skillHash: getAgentSkillHash(saved.skill),
			});
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
	});

	describe('delete', () => {
		it('deletes for a user with the delete permission', async () => {
			await service.delete(user, 'skill_a');

			expect(skillService.canAccess).toHaveBeenCalledWith(user, visible[0], 'delete');
			expect(skillService.deleteSkill).toHaveBeenCalledWith('skill_a', ['project-1']);
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
		});
	});
});
