import type { CreateSkillDto, ListSkillsQueryDto, SaveSkillDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { createSkillServices, resetSkillMocks, TX_CTX } from './test-utils/skill-services';
import type { SkillFile } from '../database/entities/skill-file.entity';
import { getSkillHash } from '../utils/skill-hash';
import type { SkillVersion } from '../database/entities/skill-version.entity';
import type { Skill } from '../database/entities/skill.entity';
import type { SkillAccessService } from '../services/skill-access.service';
import type { SkillService } from '../services/skill.service';
import type { ResolvedSkillRow } from '../utils/skill-content';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

const user = mock<User>({ id: 'user-1' });
const DATE = new Date('2026-10-01T00:00:00.000Z');

function skill(id: string, target: Partial<Pick<Skill, 'projectId' | 'createdById'>> = {}): Skill {
	return mock<Skill>({
		id,
		projectId: target.projectId ?? null,
		source: 'ui',
		availableToAssistant: false,
		availableToMCP: false,
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

describe('SkillService user actions', () => {
	const {
		skills: repository,
		projectScope: projectScopeService,
		txRunner,
		users: userRepository,
		telemetry: skillsTelemetry,
		usage,
		skillUsage,
		assistantGate: rollout,
		access,
		links,
		skillSyncGate,
		service,
	} = createSkillServices();
	let canAccess: MockInstance<SkillAccessService['canAccess']>;
	let accessCheck: MockInstance<SkillAccessService['accessCheck']>;
	let assertCanMove: MockInstance<SkillAccessService['assertCanMove']>;
	let createTrusted: MockInstance<SkillService['createTrusted']>;
	let saveTrusted: MockInstance<SkillService['saveTrusted']>;
	let moveTrusted: MockInstance<SkillService['moveTrusted']>;
	let setAssistantAvailability: MockInstance<SkillService['setAssistantAvailability']>;
	let setMcpAvailability: MockInstance<SkillService['setMcpAvailability']>;
	let refreshFollowingAgents: MockInstance<SkillService['refreshFollowingAgents']>;
	let visible: Skill[];

	beforeEach(async () => {
		await resetSkillMocks({ skills: repository, usage, txRunner, links, skillSyncGate });
		// Support bot is the only agent, in project-1, and uses no skill.
		await usage.seed({
			agents: [{ key: 'agent-1', name: 'Support bot', project: 'project-1' }],
			skills: [],
		});
		rollout.isEnabled.mockResolvedValue(true);
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
		repository.findProjects.mockImplementation(
			async (ids) => new Map(ids.map((id) => [id, { name: 'Team', type: 'team' as const }])),
		);
		canAccess = vi.spyOn(access, 'canAccess').mockResolvedValue(true);
		accessCheck = vi.spyOn(access, 'accessCheck').mockResolvedValue(() => true);
		assertCanMove = vi.spyOn(access, 'assertCanMove');
		// The trusted writes have their own tests: here they only record their calls.
		createTrusted = vi.spyOn(service, 'createTrusted').mockResolvedValue(undefined as never);
		saveTrusted = vi.spyOn(service, 'saveTrusted').mockResolvedValue(undefined as never);
		moveTrusted = vi.spyOn(service, 'moveTrusted').mockResolvedValue();
		setAssistantAvailability = vi.spyOn(service, 'setAssistantAvailability').mockResolvedValue();
		setMcpAvailability = vi.spyOn(service, 'setMcpAvailability').mockResolvedValue();
		refreshFollowingAgents = vi.spyOn(service, 'refreshFollowingAgents').mockResolvedValue();
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
				{ projectIds: ['project-1'] },
				{
					scope: 'project',
					projectId: 'project-1',
					search: 'rules',
					skip: 10,
					take: 5,
				},
			);
			expect(result.count).toBe(3);
		});

		it('passes the creator filter and the sort to the repository', async () => {
			await service.list(user, query({ createdById: 'user-2', sortBy: 'name:asc' }));

			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					createdById: 'user-2',
					sort: { by: 'name', order: 'ASC' },
				}),
			);
		});

		it.each([
			['updatedAt:asc' as const, { by: 'updatedAt', order: 'ASC' }],
			['updatedAt:desc' as const, { by: 'updatedAt', order: 'DESC' }],
			['name:desc' as const, { by: 'name', order: 'DESC' }],
		])('maps the sort %s', async (sortBy, sort) => {
			await service.list(user, query({ sortBy }));

			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ sort }),
			);
		});

		it('keeps the default order without a sort', async () => {
			await service.list(user, query());

			expect(repository.findVisiblePage.mock.calls[0][1].sort).toBeUndefined();
		});

		it('answers a project the user may not list with an empty page', async () => {
			const result = await service.list(user, query({ projectId: 'project-hidden' }));

			expect(result).toEqual({ count: 0, data: [] });
			expect(repository.findVisiblePage).not.toHaveBeenCalled();
		});

		it('filters by any project for a user with global scopes', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);

			await service.list(user, query({ projectId: 'project-2' }));

			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ projectId: 'project-2' }),
			);
		});

		it('filters by the skills an agent uses, when the user may read the agent', async () => {
			await usage.seed({
				agents: [{ key: 'agent-1', name: 'Support bot', project: 'project-1' }],
				skills: [
					{ key: 'skill_a', versions: ['Brand voice'] },
					{ key: 'skill_b', versions: ['Cite sources'] },
				],
				drafts: [
					{ agent: 'agent-1', skill: 'skill_a' },
					{ agent: 'agent-1', skill: 'skill_b' },
				],
			});

			await service.list(user, query({ agentId: 'agent-1', search: 'voice' }));

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:read']);
			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					usedBySkillIds: ['skill_a', 'skill_b'],
					search: 'voice',
				}),
			);
		});

		it.each([
			['an unknown agent', 'agent-gone', ['project-1']],
			['an agent the user may not read', 'agent-1', ['project-2']],
		])('answers %s with an empty page', async (_, agentId, readable) => {
			projectScopeService.getProjectIds.mockImplementation(async (_user, scopes) =>
				scopes.includes('agent:read') ? readable : ['project-1'],
			);

			const findSkillIdsUsedByAgent = vi.spyOn(skillUsage, 'findSkillIdsUsedByAgent');

			const result = await service.list(user, query({ agentId }));

			expect(result).toEqual({ count: 0, data: [] });
			expect(findSkillIdsUsedByAgent).not.toHaveBeenCalled();
			expect(repository.findVisiblePage).not.toHaveBeenCalled();
		});

		it('refuses attachableTo together with agentId', async () => {
			await expect(
				service.list(user, query({ attachableTo: 'agent-1', agentId: 'agent-1' })),
			).rejects.toThrow(UserError);
		});

		it('passes the agent that attaches skills, with its project', async () => {
			await service.list(user, query({ attachableTo: 'agent-1', search: 'voice' }));

			expect(repository.findVisiblePage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					attachableToProjectId: 'project-1',
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

		it.each([{ scope: 'project' as const }, { projectId: 'project-1' }])(
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
				{ projectIds: 'all' },
				expect.anything(),
			);
		});

		it('describes each skill', async () => {
			visible = [skill('skill_a', { projectId: 'project-1' })];
			await usage.seed({
				agents: [
					{ key: 'agent-1', name: 'Support bot', project: 'project-1' },
					{ key: 'agent-2', name: 'Sales bot', project: 'project-1' },
				],
				skills: [],
				drafts: [
					{ agent: 'agent-1', skill: 'skill_a' },
					{ agent: 'agent-2', skill: 'skill_a' },
				],
			});
			repository.findProjects.mockResolvedValue(
				new Map([['project-1', { name: 'Team', type: 'team' as const }]]),
			);
			accessCheck.mockImplementation(async (_user, op) => () => op === 'update');

			const [item] = (await service.list(user, query())).data;

			expect(item).toEqual({
				id: 'skill_a',
				name: 'Brand voice',
				description: 'Brand voice desc',
				scope: 'project',
				projectId: 'project-1',
				projectName: 'Team',
				projectType: 'team',
				source: 'ui',
				createdBy: null,
				latestVersion: 2,
				usedByAgents: 2,
				availableToAssistant: false,
				availableToMCP: false,
				canEdit: true,
				canDelete: false,
				canStopSyncing: false,
				syncState: null,
				canCheckForUpdates: false,
				createdAt: DATE.toISOString(),
				updatedAt: DATE.toISOString(),
			});
		});

		it.each([
			{
				case: 'a synced skill the user may change',
				on: true,
				linked: true,
				update: true,
				can: true,
			},
			{
				case: 'a skill with the Skill Sync flag off',
				on: false,
				linked: true,
				update: true,
				can: false,
			},
			{ case: 'a skill that is not synced', on: true, linked: false, update: true, can: false },
			{
				case: 'a synced skill the user may only read',
				on: true,
				linked: true,
				update: false,
				can: false,
			},
		])('offers Stop syncing only for $case', async ({ on, linked, update, can }) => {
			visible = [skill('skill_a', { projectId: 'project-1' })];
			skillSyncGate.isEnabled.mockResolvedValue(on);
			links.findSyncStates.mockResolvedValue(
				new Map(linked ? [['skill_a', 'up_to_date' as const]] : []),
			);
			accessCheck.mockImplementation(async (_user, op) => () => op === 'update' && update);

			const [item] = (await service.list(user, query())).data;

			expect(item).toMatchObject({
				canStopSyncing: can,
				canCheckForUpdates: can,
				syncState: linked ? 'up_to_date' : null,
				canEdit: update && !linked,
			});
		});

		it('checks edit and delete once for the page, not once per skill', async () => {
			await service.list(user, query());

			expect(accessCheck).toHaveBeenCalledTimes(2);
			expect(accessCheck).toHaveBeenCalledWith(user, 'update');
			expect(accessCheck).toHaveBeenCalledWith(user, 'delete');
			expect(canAccess).not.toHaveBeenCalled();
		});
	});

	describe('listAgents', () => {
		it('searches the agents in the projects where the user may read agents', async () => {
			const findAgentSummaries = vi.spyOn(skillUsage, 'findAgentSummaries');

			const result = await service.listAgents(user, { search: 'bot', take: 50 });

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:read']);
			expect(findAgentSummaries).toHaveBeenCalledWith(['project-1'], {
				search: 'bot',
				limit: 50,
			});
			expect(result).toEqual([{ id: 'agent-1', name: 'Support bot' }]);
		});

		it('searches every project for a user with the global agent scope', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);
			const findAgentSummaries = vi.spyOn(skillUsage, 'findAgentSummaries');

			await service.listAgents(user, { take: 10 });

			expect(findAgentSummaries).toHaveBeenCalledWith(null, {
				search: undefined,
				limit: 10,
			});
		});
	});

	describe('listCreators', () => {
		it('names the creators of the skills the user may see', async () => {
			repository.findVisibleCreatorIds.mockResolvedValue(['user-2']);
			userRepository.findManyByIds.mockResolvedValue([
				mock<User>({
					id: 'user-2',
					email: 'ada@example.com',
					firstName: 'Ada',
					lastName: 'Lovelace',
				}),
			]);

			const result = await service.listCreators(user);

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['projectSkill:list']);
			expect(repository.findVisibleCreatorIds).toHaveBeenCalledWith({
				projectIds: ['project-1'],
			});
			expect(result).toEqual([
				{ id: 'user-2', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
			]);
		});

		it('skips the user query when no visible skill has a creator', async () => {
			repository.findVisibleCreatorIds.mockResolvedValue([]);

			expect(await service.listCreators(user)).toEqual([]);
			expect(userRepository.findManyByIds).not.toHaveBeenCalled();
		});
	});

	describe('get', () => {
		it('returns the latest version, its hash and the usage', async () => {
			await usage.seed({
				agents: [
					{ key: 'agent-1', name: 'Support bot', project: 'project-1' },
					{ key: 'agent-9', name: 'Hidden bot', project: 'project-9' },
				],
				skills: [{ key: 'skill_a', versions: ['Brand voice', 'Brand voice', 'Brand voice'] }],
				drafts: [
					{ agent: 'agent-1', skill: 'skill_a' },
					{ agent: 'agent-9', skill: 'skill_a' },
				],
			});
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
			// The user may read the agents of project-1 only.
			expect(detail.usedBy).toEqual({
				drafts: [
					{
						agentId: 'agent-1',
						agentName: 'Support bot',
						projectId: 'project-1',
						version: 3,
						pinned: false,
					},
				],
				pins: [],
				hiddenAgents: 1,
			});
		});

		it('limits the usage to the agents the user may read', async () => {
			const findUsage = vi.spyOn(skillUsage, 'findUsage');

			await service.get(user, 'skill_a');

			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:read']);
			expect(findUsage).toHaveBeenCalledWith('skill_a', ['project-1']);
		});

		it('shows the agents of every project to a user with the global agent scope', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);
			const findUsage = vi.spyOn(skillUsage, 'findUsage');

			await service.get(user, 'skill_a');

			expect(findUsage).toHaveBeenCalledWith('skill_a', 'all');
		});

		it('answers a skill the user cannot see like a missing one', async () => {
			canAccess.mockResolvedValue(false);

			await expect(service.get(user, 'skill_a')).rejects.toThrow(NotFoundError);
			await expect(service.get(user, 'skill_gone')).rejects.toThrow(NotFoundError);
			expect(canAccess).toHaveBeenCalledWith(user, visible[0], 'read');
		});
	});

	describe('create', () => {
		const body = { name: 'Tone', description: 'How we sound', instructions: 'Be kind.' };
		const payload = (overrides: Partial<CreateSkillDto>) =>
			({ scope: 'instance', skill: body, ...overrides }) as CreateSkillDto;

		beforeEach(() => {
			createTrusted.mockImplementation(async () => {
				visible.push(skill('skill_new'));
				return 'skill_new';
			});
		});

		// A custom role can hold projectSkill:create without projectSkill:read.
		it('returns the new skill to a creator who may not read it afterwards', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
			canAccess.mockResolvedValue(false);
			accessCheck.mockResolvedValue(() => false);

			const detail = await service.create(
				user,
				payload({ scope: 'project', projectId: 'project-1' }),
			);

			expect(detail).toMatchObject({ id: 'skill_new', name: 'Skill', canEdit: false });
		});

		it('makes the new skill available to MCP clients in the create transaction', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ availableToMCP: true }));

			const target = { projectId: null };
			expect(createTrusted).toHaveBeenCalledWith(expect.objectContaining({ target }), TX_CTX);
			expect(setMcpAvailability).toHaveBeenCalledWith('skill_new', true, target, TX_CTX);
			expect(setAssistantAvailability).not.toHaveBeenCalled();
		});

		it('reports the create with the method the client sent', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ method: 'upload' }));

			expect(skillsTelemetry.created).toHaveBeenCalledWith(
				user.id,
				[{ id: 'skill_new', projectId: null }],
				'ui',
				'upload',
			);
		});

		it('reports a create from another source than the settings page as written with AI', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ method: 'upload' }), 'mcp');

			expect(skillsTelemetry.created).toHaveBeenCalledWith(
				user.id,
				[{ id: 'skill_new', projectId: null }],
				'mcp',
				'ai',
			);
		});

		it('reports a create without a method as manual', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({}));

			expect(skillsTelemetry.created).toHaveBeenCalledWith(
				user.id,
				[{ id: 'skill_new', projectId: null }],
				'ui',
				'manual',
			);
		});

		it('reports nothing for a refused create', async () => {
			await expect(service.create(user, payload({}))).rejects.toThrow(ForbiddenError);

			expect(skillsTelemetry.created).not.toHaveBeenCalled();
		});

		it('makes the new skill available to the Assistant in the create transaction', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ availableToAssistant: true }));

			const target = { projectId: null };
			expect(createTrusted).toHaveBeenCalledWith(expect.objectContaining({ target }), TX_CTX);
			expect(setAssistantAvailability).toHaveBeenCalledWith('skill_new', true, target, TX_CTX);
		});

		it('creates without a transaction when the skill is not available to the Assistant', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ availableToAssistant: false }));

			expect(txRunner.run).not.toHaveBeenCalled();
			expect(setAssistantAvailability).not.toHaveBeenCalled();
		});

		it('refuses the Assistant availability when the Assistant flag is off', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);
			rollout.isEnabled.mockResolvedValue(false);

			await expect(service.create(user, payload({ availableToAssistant: true }))).rejects.toThrow(
				UserError,
			);
			expect(createTrusted).not.toHaveBeenCalled();
		});

		it('stores the source the caller passed', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({}), 'assistant');

			expect(createTrusted).toHaveBeenCalledWith(expect.objectContaining({ source: 'assistant' }));
		});

		it('creates a project skill with projectSkill:create, also in a personal project', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);

			await service.create(user, payload({ scope: 'project', projectId: 'personal-1' }));

			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:create'], false, {
				projectId: 'personal-1',
			});
			expect(createTrusted).toHaveBeenCalledWith(
				expect.objectContaining({ target: { projectId: 'personal-1' } }),
			);
		});

		it('creates an instance skill with skill:create', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await service.create(user, payload({ scope: 'instance' }));

			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:create');
			expect(createTrusted).toHaveBeenCalledWith(
				expect.objectContaining({ target: { projectId: null } }),
			);
		});

		it.each([
			['project', {}, UserError],
			['instance', { projectId: 'project-1' }, UserError],
			['instance', {}, ForbiddenError],
			['project', { projectId: 'project-1' }, ForbiddenError],
		] as const)('refuses scope %s with %o', async (scope, extra, errorClass) => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(service.create(user, payload({ scope, ...extra }))).rejects.toThrow(errorClass);
			expect(createTrusted).not.toHaveBeenCalled();
		});

		// A global projectSkill:create passes the scope check for any project id.
		it('refuses a project skill for a project that does not exist', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
			repository.findProjects.mockResolvedValue(new Map());

			await expect(
				service.create(user, payload({ scope: 'project', projectId: 'project-gone' })),
			).rejects.toThrow(NotFoundError);
			expect(repository.findProjects).toHaveBeenCalledWith(['project-gone']);
			expect(createTrusted).not.toHaveBeenCalled();
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

		it('refuses availability changes when the Assistant flag is off', async () => {
			rollout.isEnabled.mockResolvedValue(false);
			await expect(
				service.update(user, 'skill_a', update({ availableToAssistant: true })),
			).rejects.toThrow(NotFoundError);
			expect(setAssistantAvailability).not.toHaveBeenCalled();
		});

		it('saves the update for a user who may edit the skill', async () => {
			saveTrusted.mockResolvedValue(saved);

			const result = await service.update(
				user,
				'skill_a',
				update({ instructions: 'New.', baseSkillHash: 'base' }),
			);

			expect(saveTrusted).toHaveBeenCalledWith(
				'skill_a',
				{ instructions: 'New.', baseSkillHash: 'base' },
				user.id,
			);
			expect(canAccess).toHaveBeenCalledWith(user, visible[0], 'update');
			expect(skillsTelemetry.updated).toHaveBeenCalledWith(user.id, visible[0], 'ui', 3, false);
			const { followingAgentIds: _following, ...response } = saved;
			expect(result).toEqual({
				id: 'skill_a',
				...response,
				skillHash: getSkillHash(saved.skill),
			});
		});

		it('reports the update with the source the caller passed', async () => {
			saveTrusted.mockResolvedValue(saved);

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

		it('stores an MCP availability change in the transaction of the save, without a move', async () => {
			saveTrusted.mockResolvedValue({ ...saved, created: false });

			await service.update(
				user,
				'skill_a',
				update({ availableToMCP: true, baseSkillHash: 'base' }),
			);

			expect(setMcpAvailability).toHaveBeenCalledWith('skill_a', true, visible[0], TX_CTX);
			expect(saveTrusted).toHaveBeenCalledWith(
				'skill_a',
				{ baseSkillHash: 'base' },
				user.id,
				TX_CTX,
			);
			expect(moveTrusted).not.toHaveBeenCalled();
			expect(skillsTelemetry.updated).not.toHaveBeenCalled();
		});

		it('refuses a user who may not edit the skill', async () => {
			canAccess.mockImplementation(async (_user, _skill, op) => op === 'read');

			await expect(
				service.update(user, 'skill_a', update({ instructions: 'New.' })),
			).rejects.toThrow(ForbiddenError);
			expect(saveTrusted).not.toHaveBeenCalled();
		});

		it('answers a skill the user cannot see like a missing one', async () => {
			canAccess.mockResolvedValue(false);

			await expect(
				service.update(user, 'skill_a', update({ instructions: 'New.' })),
			).rejects.toThrow(NotFoundError);
		});

		it('moves the skill and saves it in one transaction, then refreshes after the commit', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
			repository.findProjects.mockResolvedValue(
				new Map([['project-1', { name: 'Team', type: 'team' as const }]]),
			);
			saveTrusted.mockResolvedValue(saved);
			assertCanMove.mockResolvedValue({ projectId: null });

			await service.update(
				user,
				'skill_a',
				update({ scope: 'project', projectId: 'project-1', baseSkillHash: 'base' }),
			);

			expect(moveTrusted).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: 'project-1' },
				undefined,
				TX_CTX,
				// The move is refused under its lock if the skill left the scope checked here.
				// A refusal names only the agents in projects the user may read.
				{
					nameAfterMove: undefined,
					checkedSource: { projectId: null },
					agentProjectIds: ['project-1'],
				},
			);
			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:read']);
			expect(saveTrusted).toHaveBeenCalledWith(
				'skill_a',
				{ baseSkillHash: 'base' },
				user.id,
				TX_CTX,
			);
			expect(refreshFollowingAgents).toHaveBeenCalledWith(['agent-1']);
			// The place the move wrote, not a read after the commit.
			expect(skillsTelemetry.updated).toHaveBeenCalledWith(
				user.id,
				{ id: 'skill_a', projectId: 'project-1' },
				'ui',
				3,
				true,
			);
			// The move runs first, so the save checks a rename in the new scope.
			expect(moveTrusted.mock.invocationCallOrder[0]).toBeLessThan(
				saveTrusted.mock.invocationCallOrder[0],
			);
		});

		it('lets a move refusal name every agent for a user who may read all agents', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);
			projectScopeService.getProjectIds.mockResolvedValue(null);
			saveTrusted.mockResolvedValue(saved);
			assertCanMove.mockResolvedValue({ projectId: 'project-1' });
			visible = [skill('skill_a', { projectId: 'project-1' })];

			await service.update(user, 'skill_a', update({ scope: 'instance', baseSkillHash: 'base' }));

			expect(moveTrusted).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: null },
				undefined,
				TX_CTX,
				expect.objectContaining({ agentProjectIds: 'all' }),
			);
		});

		it('reports nothing for a save that stored no new version', async () => {
			saveTrusted.mockResolvedValue({ ...saved, created: false, followingAgentIds: [] });

			await service.update(user, 'skill_a', update({ instructions: 'Do it.', baseSkillHash: 'b' }));

			expect(skillsTelemetry.updated).not.toHaveBeenCalled();
		});

		it('does not move a skill that is already in the requested scope', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);
			saveTrusted.mockResolvedValue(saved);

			await service.update(user, 'skill_a', update({ scope: 'instance', baseSkillHash: 'base' }));

			expect(moveTrusted).not.toHaveBeenCalled();
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
			expect(moveTrusted).not.toHaveBeenCalled();
			expect(saveTrusted).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('deletes for a user with the delete permission', async () => {
			const findUsage = vi.spyOn(skillUsage, 'findUsage');

			await service.delete(user, 'skill_a');

			expect(canAccess).toHaveBeenCalledWith(user, visible[0], 'delete');
			// A conflict names only the agents of the projects the user may read.
			expect(projectScopeService.getProjectIds).toHaveBeenCalledWith(user, ['agent:read']);
			expect(findUsage).toHaveBeenCalledWith('skill_a', ['project-1'], TX_CTX);
			expect(repository.deleteSkill).toHaveBeenCalledWith('skill_a', TX_CTX);
			expect(skillsTelemetry.deleted).toHaveBeenCalledWith(user.id, visible[0], 'ui');
		});

		it('reports the delete with the source the caller passed', async () => {
			await service.delete(user, 'skill_a', 'mcp');

			expect(skillsTelemetry.deleted).toHaveBeenCalledWith(user.id, visible[0], 'mcp');
		});

		it('names every agent for a user with the global agent scope', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);
			const findUsage = vi.spyOn(skillUsage, 'findUsage');

			await service.delete(user, 'skill_a');

			expect(findUsage).toHaveBeenCalledWith('skill_a', 'all', TX_CTX);
		});

		it('refuses a user without it', async () => {
			canAccess.mockImplementation(async (_user, _skill, op) => op === 'read');

			await expect(service.delete(user, 'skill_a')).rejects.toThrow(ForbiddenError);
			expect(repository.deleteSkill).not.toHaveBeenCalled();
			expect(skillsTelemetry.deleted).not.toHaveBeenCalled();
		});
	});
});
