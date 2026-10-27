/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type {
	AssistantSkillContext,
	AssistantSkillSummary,
	ProjectScopeService,
} from '@n8n/backend-services';
import type { OperationContext, TransactionRunner, User } from '@n8n/db';
import { ConflictError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { SkillAgentsProxy } from '../skill-agents-proxy.service';
import { skillContentHash } from '../skill-content-hash';
import type { SkillFile } from '../skill-file.entity';
import { getSkillHash } from '../skill-hash';
import type { SkillVersion } from '../skill-version.entity';
import type { Skill } from '../skill.entity';
import type { ResolvedSkillRow, SkillRepository } from '../skill.repository';
import { SkillService, toAgentSkill, toSkillContent } from '../skill.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

const PROJECT = 'project-1';

async function expectError(
	promise: Promise<unknown>,
	errorClass: new (...args: never[]) => Error,
	message: string,
) {
	const error: unknown = await promise.then(
		() => undefined,
		(caught: unknown) => caught,
	);
	expect(error).toBeInstanceOf(errorClass);
	expect(error).toHaveProperty('message', message);
}
const TX_CTX = { trx: {} } as OperationContext;

function skillRow(id: string, target: Partial<Pick<Skill, 'projectId' | 'agentId'>> = {}): Skill {
	return mock<Skill>({ id, projectId: target.projectId ?? null, agentId: target.agentId ?? null });
}

function versionRow(
	skill: Skill,
	version: number,
	overrides: Partial<SkillVersion> = {},
	files: Array<{ path: string; content: string }> = [],
): ResolvedSkillRow {
	const base = {
		name: 'Brand voice',
		description: 'Write in our voice',
		instructions: 'Use short sentences.',
		frontmatter: null,
		...overrides,
	};
	const contentHash =
		overrides.contentHash ??
		skillContentHash({
			name: base.name,
			description: base.description,
			instructions: base.instructions,
			frontmatter: base.frontmatter,
			files,
		});
	return {
		skill,
		version: mock<SkillVersion>({
			id: `${skill.id}-v${version}`,
			skillId: skill.id,
			version,
			...base,
			contentHash,
		}),
		files: files.map((file) => mock<SkillFile>(file)),
	};
}

describe('SkillService', () => {
	const skills = mock<SkillRepository>();
	const skillAgents = mock<SkillAgentsProxy>();
	const txRunner = mock<TransactionRunner>();
	const projectScope = mock<ProjectScopeService>();
	const service = new SkillService(mock(), skills, txRunner, projectScope, skillAgents);
	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		vi.resetAllMocks();
		txRunner.run.mockImplementation(async (_ctx, fn) => await fn(TX_CTX));
		skills.findLatestSaved.mockResolvedValue(new Map());
		skills.findLatestNamesInTarget.mockResolvedValue([]);
		skills.findLatestSummaries.mockResolvedValue(new Map());
		skills.findVersionsByIds.mockResolvedValue(new Map());
		skills.findByIds.mockResolvedValue([]);
		skillAgents.markFollowersChanged.mockResolvedValue([]);
		skillAgents.findUsingAgentIds.mockResolvedValue([]);
	});

	describe('conversions', () => {
		it('ignores allowed tools on write', () => {
			expect(
				toSkillContent({
					name: 'n',
					description: 'd',
					instructions: 'i',
					allowedTools: ['Read', 'Grep'],
					references: [{ path: 'references/a.md', content: 'a' }],
				}),
			).toEqual({
				name: 'n',
				description: 'd',
				instructions: 'i',
				frontmatter: null,
				files: [{ path: 'references/a.md', content: 'a' }],
			});
		});

		it('keeps the frontmatter as given and reads no allowed tools from it', () => {
			const row = versionRow(skillRow('skill_a'), 1, {
				frontmatter: { 'allowed-tools': 'Read Grep', license: 'MIT' },
			});

			expect(toSkillContent(toAgentSkill(row), row.version.frontmatter).frontmatter).toEqual({
				'allowed-tools': 'Read Grep',
				license: 'MIT',
			});
			expect(toAgentSkill(row)).toEqual({
				name: 'Brand voice',
				description: 'Write in our voice',
				instructions: 'Use short sentences.',
			});
		});
	});

	describe('Assistant reads', () => {
		const context: AssistantSkillContext = { user, projectId: 'project-1' };
		const summary: AssistantSkillSummary = {
			id: 'skill-1',
			projectId: null,
			name: 'Tone',
			description: 'Writing style',
			versionId: 'version-1',
			version: 1,
		};
		let row: ResolvedSkillRow;

		beforeEach(() => {
			projectScope.getProjectIds.mockResolvedValue(['project-1', 'project-2']);
			skills.findAssistantSkillSummaries.mockResolvedValue([]);
			row = versionRow(skillRow('skill-1'), 1, {
				id: 'version-1',
				name: 'Tone',
				description: 'Writing style',
				instructions: 'Be brief.',
			});
			row.skill.availableToAssistant = true;
			skills.findAssistantSkill.mockImplementation(async (id) =>
				id === row.skill.id ? row : null,
			);
			vi.mocked(userHasScopes).mockResolvedValue(true);
		});

		it.each([
			['project-1', ['project-1', 'project-2'], 'project-1'],
			['project-1', null, 'project-1'],
			['project-1', [], null],
			[undefined, null, null],
		] as const)(
			'limits catalog reads to the authorized session project (%s, %s)',
			async (projectId, allowed, expected) => {
				projectScope.getProjectIds.mockResolvedValue(allowed === null ? null : [...allowed]);
				const summaries = [{ ...summary, projectId: expected }];
				skills.findAssistantSkillSummaries.mockResolvedValue(summaries);
				expect(await service.listForAssistant({ ...context, projectId })).toEqual(summaries);
				expect(skills.findAssistantSkillSummaries).toHaveBeenCalledWith(expected);
			},
		);

		it('requires both list and read permissions for project skills', async () => {
			await service.listForAssistant(context);
			await service.readForAssistant(context, 'skill-1');
			expect(projectScope.getProjectIds).toHaveBeenCalledTimes(2);
			expect(projectScope.getProjectIds).toHaveBeenNthCalledWith(1, context.user, [
				'projectSkill:list',
				'projectSkill:read',
			]);
			expect(projectScope.getProjectIds).toHaveBeenNthCalledWith(2, context.user, [
				'projectSkill:list',
				'projectSkill:read',
			]);
		});

		it('refuses disabled content even when its ID is supplied', async () => {
			row.skill.availableToAssistant = false;
			expect(await service.readForAssistant(context, 'skill-1')).toBeNull();
		});

		it('uses the existing skill permission check for content reads', async () => {
			row.skill.projectId = 'project-1';
			vi.mocked(userHasScopes).mockResolvedValue(false);
			expect(await service.readForAssistant(context, 'skill-1')).toBeNull();
			expect(userHasScopes).toHaveBeenCalledWith(context.user, ['projectSkill:read'], false, {
				projectId: 'project-1',
			});
		});

		it.each([
			['project-1', ['project-1'], true, 'project-1'],
			['project-2', ['project-1', 'project-2'], false, 'project-1'],
			['project-1', [], false, null],
			['project-1', null, true, 'project-1'],
		] as const)(
			'limits content reads to the authorized session project (%s, %s)',
			async (projectId, allowed, eligible, authorizedProjectId) => {
				row.skill.projectId = projectId;
				projectScope.getProjectIds.mockResolvedValue(allowed === null ? null : [...allowed]);
				const result = await service.readForAssistant(context, 'skill-1');
				expect(skills.findAssistantSkill).toHaveBeenCalledWith(
					'skill-1',
					authorizedProjectId,
					undefined,
				);
				expect(skills.findLatestSaved).not.toHaveBeenCalled();
				if (eligible) expect(result).toMatchObject({ id: 'skill-1', projectId });
				else expect(result).toBeNull();
			},
		);

		it('returns no project content without a session project, including for global roles', async () => {
			row.skill.projectId = 'project-1';
			projectScope.getProjectIds.mockResolvedValue(null);
			expect(await service.readForAssistant({ user: context.user }, 'skill-1')).toBeNull();
			expect(skills.findAssistantSkill).toHaveBeenCalledWith('skill-1', null, undefined);
		});

		it('reads enabled content with its saved version', async () => {
			expect(await service.readForAssistant(context, 'skill-1')).toEqual({
				id: 'skill-1',
				projectId: null,
				versionId: 'version-1',
				version: 1,
				name: 'Tone',
				description: 'Writing style',
				instructions: 'Be brief.',
				frontmatter: null,
				files: [],
			});
		});

		it.each(['disabled', 'agent', 'other-project', 'permission', 'missing'])(
			'refuses a reference that is %s',
			async (reason) => {
				row.skill.projectId = 'project-1';
				if (reason === 'disabled') row.skill.availableToAssistant = false;
				if (reason === 'agent') row.skill.agentId = 'agent-1';
				if (reason === 'other-project') row.skill.projectId = 'project-2';
				if (reason === 'permission') vi.mocked(userHasScopes).mockResolvedValue(false);
				skills.findAssistantSkillFile.mockResolvedValue(
					reason === 'missing'
						? null
						: {
								skill: row.skill,
								file: mock<SkillFile>({ path: 'references/guide.md', content: 'Guide.' }),
							},
				);
				expect(
					await service.readFileForAssistant(
						context,
						'skill-1',
						'version-1',
						'references/guide.md',
					),
				).toBeNull();
			},
		);

		it('allows instance skills without project access', async () => {
			projectScope.getProjectIds.mockResolvedValue([]);
			expect(await service.readForAssistant(context, 'skill-1')).not.toBeNull();
		});

		it('returns null for a missing skill', async () => {
			expect(await service.readForAssistant(context, 'missing')).toBeNull();
		});
	});

	describe('MCP reads', () => {
		const instanceSkill = versionRow(skillRow('skill-1'), 2, {}, [
			{ path: 'references/style.md', content: 'Be brief.' },
		]);
		const projectSkill = versionRow(skillRow('skill-2', { projectId: 'project-1' }), 1);
		const agentSkill = versionRow(skillRow('skill-3', { agentId: 'agent-1' }), 1);
		const rows = [instanceSkill, projectSkill, agentSkill];

		beforeEach(() => {
			skills.findLatestSaved.mockImplementation(
				async (ids) =>
					new Map(
						rows.filter((row) => ids.includes(row.skill.id)).map((row) => [row.skill.id, row]),
					),
			);
			vi.mocked(userHasScopes).mockResolvedValue(true);
		});

		it('lists one page of the project and instance skills the user can list, without agent skills', async () => {
			projectScope.getProjectIds.mockResolvedValue(['project-1']);
			skills.findVisiblePage.mockResolvedValue({
				skills: [instanceSkill.skill, projectSkill.skill],
				count: 7,
			});

			const result = await service.listForMcp(user, 100, 50);

			expect(skills.findVisiblePage).toHaveBeenCalledWith(
				{ projectIds: ['project-1'], agentIds: [] },
				{ skip: 100, take: 50 },
			);
			expect(result).toEqual({
				count: 7,
				skills: [
					{ id: 'skill-1', projectId: null, skill: toAgentSkill(instanceSkill) },
					{ id: 'skill-2', projectId: 'project-1', skill: toAgentSkill(projectSkill) },
				],
			});
		});

		it('lists the skills of every project for a user with a global scope', async () => {
			projectScope.getProjectIds.mockResolvedValue(null);
			skills.findVisiblePage.mockResolvedValue({ skills: [], count: 0 });

			await service.listForMcp(user, 0, 100);

			expect(skills.findVisiblePage).toHaveBeenCalledWith(
				{ projectIds: 'all', agentIds: [] },
				{ skip: 0, take: 100 },
			);
		});

		it('reads the latest version of a readable skill', async () => {
			expect(await service.readForMcp(user, 'skill-2')).toEqual({
				id: 'skill-2',
				projectId: 'project-1',
				skill: toAgentSkill(projectSkill),
			});
		});

		it('does not read an agent skill', async () => {
			expect(await service.readForMcp(user, 'skill-3')).toBeNull();
		});

		it('does not read a skill the user cannot read', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			expect(await service.readForMcp(user, 'skill-2')).toBeNull();
		});

		it('does not read a missing skill', async () => {
			expect(await service.readForMcp(user, 'missing')).toBeNull();
		});
	});

	describe('resolveForAgentDraft', () => {
		it('runs the latest saved version for a following ref', async () => {
			const skill = skillRow('skill_a');
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skill, 2, { instructions: 'v2' })]]),
			);

			const resolved = await service.resolveForAgentDraft([{ id: 'skill_a' }]);

			expect(resolved.skill_a.instructions).toBe('v2');
		});

		it('runs the pinned version for a ref with versionId', async () => {
			const skill = skillRow('skill_a');
			const v1 = versionRow(skill, 1, { instructions: 'v1' });
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skill, 2, { instructions: 'v2' })]]),
			);
			skills.findVersionsByIds.mockResolvedValue(new Map([[v1.version.id, v1]]));

			const resolved = await service.resolveForAgentDraft([
				{ id: 'skill_a', versionId: v1.version.id },
			]);

			expect(resolved.skill_a.instructions).toBe('v1');
		});

		it('falls back to the latest version when the pin belongs to another skill', async () => {
			const foreign = versionRow(skillRow('skill_b'), 1, { instructions: 'other skill' });
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2, { instructions: 'v2' })]]),
			);
			skills.findVersionsByIds.mockResolvedValue(new Map([[foreign.version.id, foreign]]));

			const resolved = await service.resolveForAgentDraft([
				{ id: 'skill_a', versionId: foreign.version.id },
			]);

			expect(resolved.skill_a.instructions).toBe('v2');
		});

		it('leaves out a ref to a missing skill', async () => {
			expect(await service.resolveForAgentDraft([{ id: 'skill_gone' }])).toEqual({});
		});
	});

	describe('create', () => {
		it('creates the skill with an id in the agent skill format', async () => {
			const id = await service.create({
				target: { projectId: PROJECT, agentId: null },
				skill: { name: 'n', description: 'd', instructions: 'i' },
				source: 'ui',
				createdById: user.id,
			});

			expect(id).toMatch(/^skill_[A-Za-z0-9]{16}$/);
			expect(skills.createSkill).toHaveBeenCalledWith(
				{ id, target: { projectId: PROJECT, agentId: null }, source: 'ui', createdById: user.id },
				expect.objectContaining({ name: 'n', frontmatter: null }),
				expect.anything(),
			);
		});

		it('refuses blank instructions', async () => {
			await expect(
				service.create({
					target: { projectId: PROJECT, agentId: null },
					skill: { name: 'n', description: 'd', instructions: '  ' },
					source: 'ui',
					createdById: user.id,
				}),
			).rejects.toThrow(UserError);
			expect(skills.createSkill).not.toHaveBeenCalled();
		});

		it.each(['Brand voice', 'brand-voice', '  BRAND_voice '])(
			'refuses "%s" when another skill in the same scope has a name like it',
			async (name) => {
				skills.findLatestNamesInTarget.mockResolvedValue([
					{ skillId: 'skill_x', name: 'Brand voice' },
				]);

				await expect(
					service.create({
						target: { projectId: PROJECT, agentId: null },
						skill: { name, description: 'd', instructions: 'i' },
						source: 'ui',
						createdById: user.id,
						checkNameTaken: true,
					}),
				).rejects.toThrow('That name is taken, choose another');
				expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(
					{ projectId: PROJECT, agentId: null },
					expect.anything(),
				);
				expect(skills.createSkill).not.toHaveBeenCalled();
			},
		);

		it('lets a copy keep the name of the skill it copies', async () => {
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'skill_x', name: 'Brand voice' },
			]);

			await service.create({
				target: { projectId: null, agentId: 'agent-2' },
				skill: { name: 'Brand voice', description: 'd', instructions: 'i' },
				source: 'agent',
				createdById: user.id,
			});

			expect(skills.findLatestNamesInTarget).not.toHaveBeenCalled();
			expect(skills.createSkill).toHaveBeenCalled();
		});
	});

	describe('freeName', () => {
		const target = { projectId: PROJECT, agentId: null };

		it('keeps a name that the scope does not hold', async () => {
			expect(await service.freeName('New skill', target)).toBe('New skill');
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(target, {});
		});

		it('adds the first free number, by the same rule as the name check', async () => {
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'a', name: 'new-skill' },
				{ skillId: 'b', name: 'New skill 2' },
				{ skillId: 'c', name: 'New skill 4' },
			]);

			expect(await service.freeName('New skill', target)).toBe('New skill 3');
		});

		it('shortens a long name so the number fits the length limit', async () => {
			const long = 'x'.repeat(128);
			skills.findLatestNamesInTarget.mockResolvedValue([{ skillId: 'a', name: long }]);

			const name = await service.freeName(long, target);

			expect(name).toHaveLength(128);
			expect(name.endsWith(' 2')).toBe(true);
		});
	});

	describe('save', () => {
		const skill = skillRow('skill_a', { projectId: PROJECT });

		/** Mocks the latest version and returns its hash, the base an editor sends back. */
		function givenLatest(latest: ResolvedSkillRow): string {
			skills.findLatestSaved.mockImplementation(async (ids) => {
				const rows = new Map<string, ResolvedSkillRow>();
				if (ids.includes('skill_a')) rows.set('skill_a', latest);
				return rows;
			});
			skills.nextVersionNumber.mockResolvedValue(3);
			skills.insertSavedVersion.mockResolvedValue('new-version-id');
			return getSkillHash(toAgentSkill(latest));
		}

		it('creates nothing when the content matches the latest version', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			const result = await service.save(
				'skill_a',
				{ baseSkillHash, instructions: 'Use short sentences.' },
				user.id,
			);

			expect(result).toMatchObject({ versionId: 'skill_a-v2', version: 2, created: false });
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
			expect(skillAgents.markFollowersChanged).not.toHaveBeenCalled();
		});

		it('saves changed content as the next version under an edit lock', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			const result = await service.save(
				'skill_a',
				{
					baseSkillHash,
					instructions: 'new',
					references: [{ path: 'references/a.md', content: 'a' }],
				},
				user.id,
			);

			expect(result).toMatchObject({ versionId: 'new-version-id', version: 3, created: true });
			expect(result.skill).toMatchObject({ name: 'Brand voice', instructions: 'new' });
			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({
					name: 'Brand voice',
					instructions: 'new',
					files: [{ path: 'references/a.md', content: 'a' }],
				}),
				user.id,
				TX_CTX,
			);
		});

		it('refuses a rename to a name that another skill in its scope has', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'skill_a', name: 'Brand voice' },
				{ skillId: 'skill_x', name: 'Code review' },
			]);

			await expect(
				service.save('skill_a', { baseSkillHash, name: 'code-review' }, user.id),
			).rejects.toThrow('That name is taken, choose another');
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(
				{ projectId: PROJECT, agentId: null },
				TX_CTX,
			);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('trims a new name before it checks and stores it', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			const result = await service.save('skill_a', { baseSkillHash, name: '  Renamed  ' }, user.id);

			expect(result.skill.name).toBe('Renamed');
			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({ name: 'Renamed' }),
				user.id,
				expect.anything(),
			);
		});

		it('refuses a new name of only spaces', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			await expect(
				service.save('skill_a', { baseSkillHash, name: '   ' }, user.id),
			).rejects.toThrow('Skill name is required.');
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('does not check the name when the save keeps it', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			await service.save('skill_a', { baseSkillHash, instructions: 'new' }, user.id);

			expect(skills.findLatestNamesInTarget).not.toHaveBeenCalled();
		});

		it('removes references set to an empty list', async () => {
			const baseSkillHash = givenLatest(
				versionRow(skill, 2, {}, [{ path: 'references/a.md', content: 'a' }]),
			);

			const result = await service.save('skill_a', { baseSkillHash, references: [] }, user.id);

			expect(result.skill).not.toHaveProperty('references');
		});

		it('ignores allowed tools in the update', async () => {
			const baseSkillHash = givenLatest(
				versionRow(skill, 2, { frontmatter: { 'allowed-tools': 'Read' } }),
			);

			const result = await service.save(
				'skill_a',
				{ baseSkillHash, instructions: 'new', allowedTools: ['Bash'] },
				user.id,
			);

			expect(result.skill).not.toHaveProperty('allowedTools');
			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({ frontmatter: { 'allowed-tools': 'Read' } }),
				user.id,
				TX_CTX,
			);
		});

		it('keeps frontmatter keys the editor does not know', async () => {
			const baseSkillHash = givenLatest(
				versionRow(skill, 2, { frontmatter: { license: 'MIT', 'allowed-tools': 'Read' } }),
			);

			await service.save('skill_a', { baseSkillHash, instructions: 'new' }, user.id);

			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({ frontmatter: { license: 'MIT', 'allowed-tools': 'Read' } }),
				user.id,
				TX_CTX,
			);
		});

		it('accepts the hash of the latest version as the base', async () => {
			const latest = versionRow(skill, 2);
			const baseSkillHash = givenLatest(latest);

			const result = await service.save('skill_a', { instructions: 'new', baseSkillHash }, user.id);

			expect(result.created).toBe(true);
		});

		// The check runs under the edit lock, so two saves from the same base cannot both pass.
		it('refuses a stale base hash after taking the edit lock', async () => {
			givenLatest(versionRow(skill, 2));

			await expect(
				service.save('skill_a', { instructions: 'new', baseSkillHash: 'stale' }, user.id),
			).rejects.toThrow(ConflictError);
			expect(skills.lockForEdit.mock.invocationCallOrder[0]).toBeLessThan(
				skills.findLatestSaved.mock.invocationCallOrder[0],
			);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('refuses blank instructions', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			await expect(
				service.save('skill_a', { baseSkillHash, instructions: ' ' }, user.id),
			).rejects.toThrow(UserError);
		});

		it('marks the following agents in the same transaction', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillAgents.markFollowersChanged.mockResolvedValue(['agent-1', 'agent-2']);

			const result = await service.save('skill_a', { baseSkillHash, instructions: 'new' }, user.id);

			expect(skillAgents.markFollowersChanged).toHaveBeenCalledWith('skill_a', TX_CTX);
			expect(result.followingAgentIds).toEqual(['agent-1', 'agent-2']);
		});

		it('refreshes every following agent after the commit', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillAgents.markFollowersChanged.mockResolvedValue(['agent-1', 'agent-2']);

			await service.save('skill_a', { baseSkillHash, instructions: 'new' }, user.id);

			expect(skillAgents.refreshAgents).toHaveBeenCalledWith(['agent-1', 'agent-2'], undefined);
		});

		it('sends no update push to the tab that saved', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillAgents.markFollowersChanged.mockResolvedValue(['agent-1']);

			await service.save(
				'skill_a',
				{ baseSkillHash, instructions: 'new' },
				user.id,
				{},
				'push-ref-1',
			);

			expect(skillAgents.refreshAgents).toHaveBeenCalledWith(['agent-1'], 'push-ref-1');
		});

		it("leaves the refresh to the caller when it runs in the caller's transaction", async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillAgents.markFollowersChanged.mockResolvedValue(['agent-1']);

			const result = await service.save(
				'skill_a',
				{ baseSkillHash, instructions: 'new' },
				user.id,
				TX_CTX,
			);

			expect(result.followingAgentIds).toEqual(['agent-1']);
			expect(skillAgents.refreshAgents).not.toHaveBeenCalled();
		});

		it('checks a rename against the agents that use the skill', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillAgents.assertRenameKeepsNamesApart.mockRejectedValue(
				new UserError('Cannot rename to "Pricing"'),
			);

			await expect(
				service.save('skill_a', { baseSkillHash, name: 'Pricing' }, user.id),
			).rejects.toThrow('Cannot rename to "Pricing"');
			expect(skillAgents.assertRenameKeepsNamesApart).toHaveBeenCalledWith(
				'skill_a',
				'Brand voice',
				'Pricing',
				TX_CTX,
			);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('allows a rename that clashes on no agent', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			await expect(
				service.save('skill_a', { baseSkillHash, name: 'Tone' }, user.id),
			).resolves.toMatchObject({
				created: true,
			});
		});

		it('throws NotFoundError for a missing skill', async () => {
			await expect(
				service.save('skill_gone', { name: 'x', baseSkillHash: 'any' }, user.id),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('changeTarget', () => {
		it('moves a skill that only the given agent uses, under the edit lock', async () => {
			skillAgents.findUsingAgentIds.mockResolvedValue(['agent-1']);

			await service.changeTarget('skill_a', { projectId: null, agentId: 'agent-1' }, 'agent-1');

			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.lockForEdit.mock.invocationCallOrder[0]).toBeLessThan(
				skillAgents.findUsingAgentIds.mock.invocationCallOrder[0],
			);
			expect(skills.updateTarget).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: null, agentId: 'agent-1' },
				TX_CTX,
			);
		});

		describe('agents that use the skill', () => {
			const AGENTS = new Map([
				['agent-1', { name: 'Support bot', projectId: 'p1' }],
				['agent-2', { name: 'Sales bot', projectId: 'p1' }],
				['agent-3', { name: 'Ops bot', projectId: 'p2' }],
			]);

			beforeEach(() => {
				skillAgents.findAgents.mockImplementation(
					async (ids) =>
						new Map(
							ids.flatMap((id) => {
								const agent = AGENTS.get(id);
								return agent ? [[id, agent] as const] : [];
							}),
						),
				);
			});

			it('moves a skill to the instance, which every agent can add', async () => {
				skillAgents.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-3']);

				await service.changeTarget('skill_a', { projectId: null, agentId: null }, undefined);

				expect(skills.updateTarget).toHaveBeenCalledWith(
					'skill_a',
					{ projectId: null, agentId: null },
					TX_CTX,
				);
			});

			it('moves a skill to the project of every agent that uses it', async () => {
				skillAgents.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

				await service.changeTarget('skill_a', { projectId: 'p1', agentId: null }, undefined);

				expect(skillAgents.findAgents).toHaveBeenCalledWith(['agent-1', 'agent-2'], TX_CTX);
				expect(skills.updateTarget).toHaveBeenCalledWith(
					'skill_a',
					{ projectId: 'p1', agentId: null },
					TX_CTX,
				);
			});

			it('refuses a move that takes the skill away from agents, and names them', async () => {
				skillAgents.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-2', 'agent-3']);

				await expectError(
					service.changeTarget('skill_a', { projectId: 'p2', agentId: null }, undefined),
					ConflictError,
					'"Support bot", "Sales bot" would lose access to this skill. Choose a scope that includes those agents, or detach the skill from them first.',
				);
				expect(skills.updateTarget).not.toHaveBeenCalled();
			});

			it('only counts the agents in projects the user may not read', async () => {
				skillAgents.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-3']);

				await expectError(
					service.changeTarget(
						'skill_a',
						{ projectId: 'p9', agentId: null },
						undefined,
						{},
						{ agentProjectIds: ['p2'] },
					),
					ConflictError,
					'"Ops bot", 1 agent in other projects would lose access to this skill. Choose a scope that includes those agents, or detach the skill from them first.',
				);
			});

			it('lets the agent that asks for the move narrow the skill to itself', async () => {
				skillAgents.findUsingAgentIds.mockResolvedValue(['agent-1']);

				await service.changeTarget('skill_a', { projectId: null, agentId: 'agent-1' }, 'agent-1');

				expect(skills.updateTarget).toHaveBeenCalled();
			});

			it('refuses to narrow the skill to one agent while another agent uses it', async () => {
				skillAgents.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

				await expectError(
					service.changeTarget('skill_a', { projectId: null, agentId: 'agent-1' }, 'agent-1'),
					ConflictError,
					'"Sales bot" would lose access to this skill. Choose a scope that includes that agent, or detach the skill from it first.',
				);
				expect(skills.updateTarget).not.toHaveBeenCalled();
			});

			it('does not let the agent that asks for the move block it', async () => {
				skillAgents.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-3']);

				await service.changeTarget('skill_a', { projectId: 'p2', agentId: null }, 'agent-1');

				expect(skills.updateTarget).toHaveBeenCalled();
			});
		});

		it('refuses to move a skill into a scope that holds a name like it', async () => {
			skillAgents.findUsingAgentIds.mockResolvedValue([]);
			skills.findLatestSummaries.mockResolvedValue(
				new Map([['skill_a', { name: 'Brand voice', description: 'd', version: 1 }]]),
			);
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'skill_x', name: 'brand_voice' },
			]);

			await expect(
				service.changeTarget('skill_a', { projectId: null, agentId: null }, undefined),
			).rejects.toThrow('That name is taken, choose another');
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(
				{ projectId: null, agentId: null },
				TX_CTX,
			);
			expect(skills.updateTarget).not.toHaveBeenCalled();
		});

		it('checks the name that a rename in the same request gives the skill', async () => {
			skillAgents.findUsingAgentIds.mockResolvedValue([]);

			await service.changeTarget(
				'skill_a',
				{ projectId: null, agentId: null },
				undefined,
				{},
				{ nameAfterMove: 'Fresh name' },
			);

			expect(skills.findLatestSummaries).not.toHaveBeenCalled();
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(
				{ projectId: null, agentId: null },
				TX_CTX,
			);
			expect(skills.updateTarget).toHaveBeenCalled();
		});

		it('refuses the move when the skill left the scope that the permission check saw', async () => {
			skillAgents.findUsingAgentIds.mockResolvedValue([]);
			// Another move put the skill in a project after `assertCanMove` checked the instance.
			skills.findByIds.mockResolvedValue([mock<Skill>({ projectId: 'p2', agentId: null })]);

			await expect(
				service.changeTarget(
					'skill_a',
					{ projectId: null, agentId: 'agent-1' },
					'agent-1',
					{},
					{
						checkedSource: { projectId: null, agentId: null },
					},
				),
			).rejects.toThrow('The skill was moved somewhere else.');
			expect(skills.findByIds).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.updateTarget).not.toHaveBeenCalled();
		});

		it('moves the skill when it is still in the scope that the permission check saw', async () => {
			skillAgents.findUsingAgentIds.mockResolvedValue([]);
			skills.findByIds.mockResolvedValue([mock<Skill>({ projectId: null, agentId: null })]);

			await service.changeTarget(
				'skill_a',
				{ projectId: 'p1', agentId: null },
				undefined,
				{},
				{
					checkedSource: { projectId: null, agentId: null },
				},
			);

			expect(skills.updateTarget).toHaveBeenCalled();
		});

		it('moves an unused skill when no agent is kept', async () => {
			skillAgents.findUsingAgentIds.mockResolvedValue([]);

			await service.changeTarget('skill_a', { projectId: 'p1', agentId: null }, undefined);

			expect(skills.updateTarget).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: 'p1', agentId: null },
				TX_CTX,
			);
		});
	});

	describe('snapshotForPublish', () => {
		it('locks the skills and resolves the version each ref runs', async () => {
			skills.findLatestVersionIds.mockResolvedValue(
				new Map([
					['skill_a', 'skill_a-v3'],
					['skill_b', 'skill_b-v2'],
					['skill_c', 'skill_c-v2'],
				]),
			);
			// A pin of another skill falls back to the latest version, as at runtime.
			skills.findSkillIdsOfVersions.mockResolvedValue(
				new Map([
					['skill_b-v1', 'skill_b'],
					['skill_a-v1', 'skill_a'],
				]),
			);

			const versionByRef = await service.snapshotForPublish(
				[
					{ id: 'skill_a' },
					{ id: 'skill_b', versionId: 'skill_b-v1' },
					{ id: 'skill_c', versionId: 'skill_a-v1' },
				],
				TX_CTX,
			);

			expect(skills.lockForPublish).toHaveBeenCalledWith(['skill_a', 'skill_b', 'skill_c'], TX_CTX);
			expect([...versionByRef]).toEqual([
				['skill_a', 'skill_a-v3'],
				['skill_b', 'skill_b-v1'],
				['skill_c', 'skill_c-v2'],
			]);
			expect(skills.findLatestSaved).not.toHaveBeenCalled();
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});
	});

	describe('canEdit', () => {
		it('checks projectSkill:update on the project of a project skill', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);

			expect(await service.canEdit(user, skillRow('skill_a', { projectId: PROJECT }))).toBe(true);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:update'], false, {
				projectId: PROJECT,
			});
		});

		it('checks projectSkill:update on the project of the agent of an agent skill', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
			skillAgents.findAgents.mockResolvedValue(
				new Map([['agent-1', { name: 'Support bot', projectId: PROJECT }]]),
			);

			expect(await service.canEdit(user, skillRow('skill_a', { agentId: 'agent-1' }))).toBe(true);
			expect(skillAgents.findAgents).toHaveBeenCalledWith(['agent-1'], {});
			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:update'], false, {
				projectId: PROJECT,
			});
		});

		it('needs skill:update for an instance skill', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			expect(await service.canEdit(user, skillRow('skill_a'))).toBe(true);
			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:update');
		});

		it('refuses an instance skill without skill:update', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			expect(await service.canEdit(user, skillRow('skill_a'))).toBe(false);
		});
	});

	describe('canAccess', () => {
		it('lets every user read an instance skill', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			expect(await service.canAccess(user, skillRow('skill_a'), 'read')).toBe(true);
		});

		it('needs skill:read for an agent skill whose agent is gone', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);
			skillAgents.findAgents.mockResolvedValue(new Map());

			expect(await service.canAccess(user, skillRow('skill_a', { agentId: 'gone' }), 'read')).toBe(
				false,
			);
			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:read');
		});

		it('checks the scope of the operation on the project of a project skill', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			expect(
				await service.canAccess(user, skillRow('skill_a', { projectId: PROJECT }), 'delete'),
			).toBe(false);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:delete'], false, {
				projectId: PROJECT,
			});
		});

		it('needs skill:delete to delete an instance skill', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			expect(await service.canAccess(user, skillRow('skill_a'), 'delete')).toBe(true);
			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:delete');
		});
	});

	describe('accessCheck', () => {
		it('reads the projects of the operation once and checks project skills against them', async () => {
			projectScope.getProjectIds.mockResolvedValue([PROJECT]);
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			const canUpdate = await service.accessCheck(user, 'update');

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

			const canDelete = await service.accessCheck(user, 'delete');

			expect(canDelete(skillRow('skill_a', { projectId: 'any-project' }), 'any-project')).toBe(
				true,
			);
		});

		it('applies the canAccess rules to instance skills', async () => {
			projectScope.getProjectIds.mockResolvedValue([]);
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			const canUpdate = await service.accessCheck(user, 'update');
			const canRead = await service.accessCheck(user, 'read');

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
				service.assertCanEdit(user, ['skill_a']),
				ForbiddenError,
				'You can use but not edit "Tone" (skill_a). Ask someone who can edit this skill, or detach it from this agent.',
			);
		});
	});

	describe('deleteSkill', () => {
		it('deletes a skill nobody uses, under an edit lock', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skillAgents.findUsage.mockResolvedValue({ drafts: [], pins: [], hiddenAgents: 0 });

			await service.deleteSkill('skill_a');

			expect(skillAgents.findUsage).toHaveBeenCalledWith('skill_a', 'all', TX_CTX);
			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.deleteSkill).toHaveBeenCalledWith('skill_a', TX_CTX);
		});

		it('refuses while agents use the skill and names them', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2)]]),
			);
			skillAgents.findUsage.mockResolvedValue({
				drafts: [{ agentId: 'agent-1', agentName: 'Support bot', projectId: PROJECT }],
				pins: [
					{ agentId: 'agent-2', agentName: 'Sales bot', projectId: PROJECT, version: 2 },
					{ agentId: 'agent-3', agentName: 'Old bot', projectId: PROJECT, version: null },
				],
				hiddenAgents: 0,
			});

			await expectError(
				service.deleteSkill('skill_a'),
				ConflictError,
				'Skill "Brand voice" is used by Support bot (draft), Sales bot (published v2), Old bot (older published version) and cannot be deleted.',
			);
			expect(skills.deleteSkill).not.toHaveBeenCalled();
		});

		it('names only the agents of the given projects and counts the others', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2)]]),
			);
			skillAgents.findUsage.mockResolvedValue({
				drafts: [{ agentId: 'agent-1', agentName: 'Support bot', projectId: PROJECT }],
				pins: [],
				hiddenAgents: 2,
			});

			await expectError(
				service.deleteSkill('skill_a', [PROJECT]),
				ConflictError,
				'Skill "Brand voice" is used by Support bot (draft), 2 agents in other projects and cannot be deleted.',
			);
			expect(skillAgents.findUsage).toHaveBeenCalledWith('skill_a', [PROJECT], TX_CTX);
			expect(skills.deleteSkill).not.toHaveBeenCalled();
		});

		it('refuses when only agents the caller cannot read use the skill', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2)]]),
			);
			skillAgents.findUsage.mockResolvedValue({ drafts: [], pins: [], hiddenAgents: 1 });

			await expectError(
				service.deleteSkill('skill_a', []),
				ConflictError,
				'Skill "Brand voice" is used by 1 agent in other projects and cannot be deleted.',
			);
			expect(skills.deleteSkill).not.toHaveBeenCalled();
		});

		it('throws NotFoundError for a missing skill', async () => {
			await expect(service.deleteSkill('skill_gone')).rejects.toThrow(NotFoundError);
		});
	});
});
