import type { InstanceAiPermissions, SkillDetail, SkillListItem } from '@n8n/api-types';
import type { Mock } from 'vitest';
import type { z } from 'zod';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiSkillService } from '../../types';
import { createSkillsTool } from '../skills.tool';

const listItem: SkillListItem = {
	id: 'skill_a',
	name: 'Brand voice',
	description: 'Write in the brand voice',
	scope: 'project',
	projectId: 'project-1',
	projectName: 'Marketing',
	projectType: 'team',
	agentId: null,
	agentName: null,
	availableToAssistant: false,
	source: 'ui',
	createdBy: { id: 'user-2', email: 'someone@example.com', firstName: 'Some', lastName: 'One' },
	latestVersion: 2,
	usedByAgents: 3,
	availableToMCP: false,
	canEdit: true,
	canDelete: true,
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-02T00:00:00.000Z',
};

const detail: SkillDetail = {
	...listItem,
	skill: { name: 'Brand voice', description: 'Write in the brand voice', instructions: 'Be kind.' },
	skillHash: 'hash-2',
	usedBy: { drafts: [], pins: [], hiddenAgents: 0 },
};

const skill = { name: 'Brand voice', description: 'd', instructions: 'Be kind.' };

type SkillServiceMock = {
	[K in Exclude<keyof InstanceAiSkillService, 'assistantSkillsEnabled'>]: Mock;
} & Pick<InstanceAiSkillService, 'assistantSkillsEnabled'>;

function createSkillService(assistantSkillsEnabled = true): SkillServiceMock {
	return {
		assistantSkillsEnabled,
		list: vi.fn().mockResolvedValue({ count: 1, data: [listItem] }),
		get: vi.fn().mockResolvedValue(detail),
		create: vi.fn().mockResolvedValue(detail),
		update: vi.fn().mockResolvedValue({
			id: 'skill_a',
			versionId: 'version-3',
			version: 3,
			created: true,
			skill: detail.skill,
			skillHash: 'hash-3',
		}),
		delete: vi.fn().mockResolvedValue(undefined),
	};
}

function createContext(
	skillService: InstanceAiSkillService | undefined,
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		skillService,
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

function suspendCtx(suspend: Mock) {
	return { resumeData: undefined, suspend } as never;
}

function resumeCtx(approved: boolean, scope?: 'once' | 'session') {
	return { resumeData: { approved, ...(scope ? { scope } : {}) }, suspend: vi.fn() } as never;
}

describe('skills tool', () => {
	let service: ReturnType<typeof createSkillService>;

	beforeEach(() => {
		service = createSkillService();
	});

	describe('list', () => {
		it('lists skills with the filters the model sent', async () => {
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(tool, {
				action: 'list',
				query: 'brand',
				attachableToAgentId: 'agent-1',
				limit: 20,
			});

			expect(service.list).toHaveBeenCalledWith(
				expect.objectContaining({ query: 'brand', attachableToAgentId: 'agent-1', limit: 20 }),
			);
			expect(result).toEqual({
				count: 1,
				skills: [expect.objectContaining({ id: 'skill_a', usedByAgents: 3 })],
			});
		});

		it('does not return who created a skill', async () => {
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(tool, { action: 'list', limit: 50 });

			expect(JSON.stringify(result)).not.toContain('someone@example.com');
		});

		it('lists 50 skills when the model sends no limit', async () => {
			const tool = createSkillsTool(createContext(service));

			await executeTool(tool, { action: 'list' });

			expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, skip: 0 }));
		});

		it('reads the next page with skip', async () => {
			const tool = createSkillsTool(createContext(service));

			await executeTool(tool, { action: 'list', limit: 20, skip: 20 });

			expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 20, skip: 20 }));
		});
	});

	it('returns the content and the hash for the next update', async () => {
		const tool = createSkillsTool(createContext(service));

		const result = await executeTool(tool, { action: 'get', skillId: 'skill_a' });

		expect(service.get).toHaveBeenCalledWith('skill_a');
		expect(result).toMatchObject({ id: 'skill_a', skill: detail.skill, skillHash: 'hash-2' });
	});

	describe('Assistant availability', () => {
		const parseInput = (skillService: InstanceAiSkillService, input: Record<string, unknown>) =>
			(createSkillsTool(createContext(skillService)).inputSchema as z.ZodType).parse(input);

		it('returns whether the n8n Assistant can use a skill', async () => {
			service.get.mockResolvedValue({ ...detail, availableToAssistant: true });
			const tool = createSkillsTool(createContext(service));

			const listed = await executeTool(tool, { action: 'list' });
			const read = await executeTool(tool, { action: 'get', skillId: 'skill_a' });

			expect(listed).toMatchObject({ skills: [{ availableToAssistant: false }] });
			expect(read).toMatchObject({ availableToAssistant: true });
		});

		it('hides the availability when its flag is off', async () => {
			const tool = createSkillsTool(createContext(createSkillService(false)));

			const listed = await executeTool<{ skills: object[] }>(tool, { action: 'list' });
			const read = await executeTool(tool, { action: 'get', skillId: 'skill_a' });

			expect(listed.skills[0]).not.toHaveProperty('availableToAssistant');
			expect(read).not.toHaveProperty('availableToAssistant');
		});

		it.each([
			{ action: 'create', scope: 'instance', skill, availableToAssistant: true },
			{ action: 'update', skillId: 'skill_a', baseSkillHash: 'hash-2', availableToAssistant: true },
		])('accepts the availability on $action', (input) => {
			expect(parseInput(service, input)).toMatchObject({ availableToAssistant: true });
		});

		it.each([
			{ action: 'create', scope: 'instance', skill, availableToAssistant: true },
			{ action: 'update', skillId: 'skill_a', baseSkillHash: 'hash-2', availableToAssistant: true },
		])('drops the availability on $action when its flag is off', (input) => {
			expect(parseInput(createSkillService(false), input)).not.toHaveProperty(
				'availableToAssistant',
			);
		});

		it('creates the skill for the n8n Assistant once the user approves', async () => {
			const input = { action: 'create', scope: 'instance', skill, availableToAssistant: true };
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			await executeTool(tool, input, suspendCtx(suspend));
			await executeTool(tool, input, resumeCtx(true));

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message:
						'Create the skill for every project on this instance, and allow the n8n Assistant to use it',
				}),
			);
			expect(service.create).toHaveBeenCalledWith(input);
		});

		it.each([
			{ availableToAssistant: true, change: 'Allow the n8n Assistant to use it.' },
			{ availableToAssistant: false, change: 'Stop the n8n Assistant from using it.' },
		])(
			'names the availability change on the update card: $change',
			async ({ availableToAssistant, change }) => {
				const input = {
					action: 'update',
					skillId: 'skill_a',
					baseSkillHash: 'hash-2',
					availableToAssistant,
				};
				const suspend = vi.fn();
				const tool = createSkillsTool(createContext(service));

				await executeTool(tool, input, suspendCtx(suspend));
				await executeTool(tool, input, resumeCtx(true));

				expect(suspend).toHaveBeenCalledWith(
					expect.objectContaining({
						message: `Update the skill. ${change} 3 agents use it.`,
					}),
				);
				expect(service.update).toHaveBeenCalledWith('skill_a', {
					baseSkillHash: 'hash-2',
					availableToAssistant,
				});
			},
		);
	});

	describe('create', () => {
		const input = { action: 'create', scope: 'project', projectId: 'project-1', skill };

		it('asks for approval before it creates the skill', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			await executeTool(tool, input, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({ resourceName: 'Brand voice', severity: 'info' }),
			);
			expect(service.create).not.toHaveBeenCalled();
		});

		it('names the project on the approval card', async () => {
			const suspend = vi.fn();
			const getProject = vi.fn().mockResolvedValue({ id: 'project-1', name: 'Marketing' });
			const tool = createSkillsTool(
				createContext(service, {
					workspaceService: { getProject } as unknown as InstanceAiContext['workspaceService'],
				}),
			);

			await executeTool(tool, input, suspendCtx(suspend));

			expect(getProject).toHaveBeenCalledWith('project-1');
			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Create the skill in the project "Marketing"' }),
			);
		});

		it('refuses a project skill without a project before it asks for approval', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(
				tool,
				{ action: 'create', scope: 'project', skill },
				suspendCtx(suspend),
			);

			expect(suspend).not.toHaveBeenCalled();
			expect(service.create).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				refused: true,
				reason: 'A project skill needs a projectId.',
			});
		});

		it('refuses an instance skill with a project before it asks for approval', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(
				tool,
				{ action: 'create', scope: 'instance', projectId: 'project-1', skill },
				suspendCtx(suspend),
			);

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				refused: true,
				reason: 'An instance skill has no projectId.',
			});
		});

		it('says that every project can use an instance skill', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			await executeTool(tool, { action: 'create', scope: 'instance', skill }, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Create the skill for every project on this instance',
				}),
			);
		});

		it('creates the skill once the user approves', async () => {
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(tool, input, resumeCtx(true));

			expect(service.create).toHaveBeenCalledWith(input);
			expect(result).toMatchObject({ success: true, skill: { id: 'skill_a' } });
		});

		it('creates nothing when the user denies', async () => {
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(tool, input, resumeCtx(false));

			expect(service.create).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
		});

		it('creates without asking when the admin always allows it', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(
				createContext(service, { permissions: { createSkill: 'always_allow' } }),
			);

			await executeTool(tool, input, suspendCtx(suspend));

			expect(suspend).not.toHaveBeenCalled();
			expect(service.create).toHaveBeenCalled();
		});

		it('creates nothing when the admin blocks it', async () => {
			const tool = createSkillsTool(
				createContext(service, { permissions: { createSkill: 'blocked' } }),
			);

			const result = await executeTool(tool, input, resumeCtx(true));

			expect(service.create).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
		});

		it('remembers an approval for the session', async () => {
			const grantSessionToolApproval = vi.fn();
			const tool = createSkillsTool(createContext(service, { grantSessionToolApproval }));

			await executeTool(tool, input, resumeCtx(true, 'session'));

			expect(grantSessionToolApproval).toHaveBeenCalledWith('skills:create');
		});

		it('does not ask again after an approval for the session', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(
				createContext(service, { sessionApprovedToolKeys: new Set(['skills:create']) }),
			);

			await executeTool(tool, input, suspendCtx(suspend));

			expect(suspend).not.toHaveBeenCalled();
			expect(service.create).toHaveBeenCalled();
		});
	});

	describe('update', () => {
		const input = {
			action: 'update',
			skillId: 'skill_a',
			baseSkillHash: 'hash-2',
			instructions: 'Be kinder.',
		};

		it('tells the user how many agents run the new version', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			await executeTool(tool, input, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Save a new version of the skill. 3 agents use it.',
					resourceName: 'Brand voice',
					severity: 'warning',
				}),
			);
			expect(service.update).not.toHaveBeenCalled();
		});

		it('saves the next version once the user approves', async () => {
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(tool, input, resumeCtx(true));

			expect(service.update).toHaveBeenCalledWith('skill_a', {
				baseSkillHash: 'hash-2',
				instructions: 'Be kinder.',
			});
			expect(result).toEqual({
				success: true,
				saved: {
					id: 'skill_a',
					versionId: 'version-3',
					version: 3,
					created: true,
					skillHash: 'hash-3',
				},
			});
		});

		it('names the new place on the card when the update moves the skill', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			await executeTool(tool, { ...input, scope: 'instance' }, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message:
						'Save a new version of the skill. Move it, so it is available for every project on this instance. 3 agents use it.',
				}),
			);
		});

		it('does not promise a new version when the update only moves the skill', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			await executeTool(
				tool,
				{ action: 'update', skillId: 'skill_a', baseSkillHash: 'hash-2', scope: 'instance' },
				suspendCtx(suspend),
			);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message:
						'Update the skill. Move it, so it is available for every project on this instance. 3 agents use it.',
				}),
			);
		});

		it('does not mention a move when the skill stays in its project', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			await executeTool(
				tool,
				{ ...input, scope: 'project', projectId: 'project-1' },
				suspendCtx(suspend),
			);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Save a new version of the skill. 3 agents use it.' }),
			);
		});

		it('sends the new scope once the user approves the move', async () => {
			const tool = createSkillsTool(createContext(service));

			await executeTool(
				tool,
				{ ...input, scope: 'project', projectId: 'project-2' },
				resumeCtx(true),
			);

			expect(service.update).toHaveBeenCalledWith('skill_a', {
				baseSkillHash: 'hash-2',
				instructions: 'Be kinder.',
				scope: 'project',
				projectId: 'project-2',
			});
		});

		it('refuses a projectId without a scope before it asks for approval', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(
				tool,
				{ ...input, projectId: 'project-2' },
				suspendCtx(suspend),
			);

			expect(suspend).not.toHaveBeenCalled();
			expect(service.update).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				refused: true,
				reason: 'Pass scope together with projectId.',
			});
		});

		it('refuses a move to the instance with a project before it asks for approval', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(
				tool,
				{ ...input, scope: 'instance', projectId: 'project-2' },
				suspendCtx(suspend),
			);

			expect(suspend).not.toHaveBeenCalled();
			expect(service.get).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				refused: true,
				reason: 'An instance skill has no projectId.',
			});
		});

		it('refuses a skill the user cannot edit before it asks for approval', async () => {
			service.get.mockResolvedValue({ ...detail, canEdit: false });
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(tool, input, suspendCtx(suspend));

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				refused: true,
				reason: 'You do not have permission to edit this skill.',
			});
		});

		it('uses the update permission', async () => {
			const tool = createSkillsTool(
				createContext(service, {
					permissions: { createSkill: 'always_allow', updateSkill: 'blocked' },
				}),
			);

			const result = await executeTool(tool, input, resumeCtx(true));

			expect(result).toMatchObject({ denied: true, reason: 'Action blocked by admin' });
		});
	});

	describe('delete', () => {
		const input = { action: 'delete', skillId: 'skill_a' };

		beforeEach(() => {
			service.get.mockResolvedValue({ ...detail, usedByAgents: 0 });
		});

		it('reports the admin block before it checks the agents that use the skill', async () => {
			service.get.mockResolvedValue(detail);
			const tool = createSkillsTool(
				createContext(service, { permissions: { deleteSkill: 'blocked' } }),
			);

			const result = await executeTool(tool, input, resumeCtx(true));

			expect(service.get).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
		});

		it('refuses a skill the user cannot delete before it asks for approval', async () => {
			service.get.mockResolvedValue({ ...detail, usedByAgents: 0, canDelete: false });
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(tool, input, suspendCtx(suspend));

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				refused: true,
				reason: 'You do not have permission to delete this skill.',
			});
		});

		it('refuses a skill that agents use without asking for approval', async () => {
			service.get.mockResolvedValue(detail);
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(tool, input, suspendCtx(suspend));

			expect(suspend).not.toHaveBeenCalled();
			expect(service.delete).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				refused: true,
				reason: 'The skill cannot be deleted: 3 agents use it. Detach it from every agent first.',
			});
		});

		it('asks for approval as a destructive action', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(createContext(service));

			await executeTool(tool, input, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({ resourceName: 'Brand voice', severity: 'destructive' }),
			);
			expect(service.delete).not.toHaveBeenCalled();
		});

		it('asks again even with a session grant', async () => {
			const suspend = vi.fn();
			const tool = createSkillsTool(
				createContext(service, { sessionApprovedToolKeys: new Set(['skills:delete']) }),
			);

			await executeTool(tool, input, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalled();
			expect(service.delete).not.toHaveBeenCalled();
		});

		it('does not store an approval for the session', async () => {
			const grantSessionToolApproval = vi.fn();
			const tool = createSkillsTool(createContext(service, { grantSessionToolApproval }));

			await executeTool(tool, input, resumeCtx(true, 'session'));

			expect(service.delete).toHaveBeenCalledWith('skill_a');
			expect(grantSessionToolApproval).not.toHaveBeenCalled();
		});

		it('deletes the skill once the user approves', async () => {
			const tool = createSkillsTool(createContext(service));

			const result = await executeTool(tool, input, resumeCtx(true));

			expect(service.delete).toHaveBeenCalledWith('skill_a');
			expect(result).toEqual({ success: true, skillId: 'skill_a' });
		});
	});

	it('marks its output as untrusted data', () => {
		expect(createSkillsTool(createContext(service)).outputTrust).toBe('untrusted');
	});

	it('fails when the skills hub is not available', async () => {
		const tool = createSkillsTool(createContext(undefined));

		await expect(executeTool(tool, { action: 'list', limit: 50 })).rejects.toThrow(
			'The skills hub is not available on this instance.',
		);
	});
});
