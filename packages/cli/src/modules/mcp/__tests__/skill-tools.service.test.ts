import type { SkillDetail, SkillListItem } from '@n8n/api-types';
import { User } from '@n8n/db';
import { ConflictError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import {
	type AssistantSkillsFlagGate,
	SkillNameTakenError,
	type SkillService,
} from '@/modules/skills';
import { SkillSyncedError } from '@/modules/skills/testing';
import type { Telemetry } from '@/telemetry';

import { SKILL_TOOLS } from '../mcp-scopes';
import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { RegisterToolFn } from '../mcp.types';
import { McpSkillToolsService } from '../tools/skills/skill-tools.service';

type ToolResult = { structuredContent: Record<string, unknown>; isError?: boolean };
type Handler = (input: Record<string, unknown>, extra: unknown) => Promise<ToolResult>;

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
	usedByAgents: 1,
	availableToMCP: false,
	canEdit: true,
	canDelete: true,
	canStopSyncing: false,
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-02T00:00:00.000Z',
};

const detail: SkillDetail = {
	...listItem,
	skill: { name: 'Brand voice', description: 'Write in the brand voice', instructions: 'Be kind.' },
	skillHash: 'hash-2',
	usedBy: { drafts: [], pins: [], hiddenAgents: 0 },
	syncedFrom: null,
};

describe('McpSkillToolsService', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const telemetry = mock<Telemetry>();
	const skillService = mock<SkillService>();
	const rollout = mock<AssistantSkillsFlagGate>();
	const service = new McpSkillToolsService(telemetry, skillService, rollout);
	let tools: Map<string, Handler>;

	const callTool = async (name: string, input: Record<string, unknown>) => {
		const handler = tools.get(name);
		if (!handler) throw new Error(`Tool "${name}" is not registered`);
		return await handler(input, {});
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		rollout.isEnabled.mockResolvedValue(true);
		tools = new Map();
		const registerTool: RegisterToolFn = (tool) => {
			tools.set(tool.name, tool.handler as unknown as Handler);
		};
		await service.registerTools(registerTool, user, true);
	});

	it('registers exactly the skill tools of the scope map (drift guard)', () => {
		expect(new Set(tools.keys())).toEqual(SKILL_TOOLS);
	});

	it('hides Assistant availability from MCP when its flag is off', async () => {
		rollout.isEnabled.mockResolvedValue(false);
		const registered: Array<Parameters<RegisterToolFn>[0]> = [];
		await service.registerTools(
			(tool) => {
				registered.push(tool);
				tools.set(tool.name, tool.handler as unknown as Handler);
			},
			user,
			true,
		);
		for (const name of ['create_skill', 'update_skill']) {
			expect(registered.find((tool) => tool.name === name)?.config.inputSchema).not.toHaveProperty(
				'availableToAssistant',
			);
		}
		skillService.get.mockResolvedValue(detail);
		expect(
			(await callTool('get_skill', { skillId: 'skill_a' })).structuredContent,
		).not.toHaveProperty('availableToAssistant');
	});

	it('hides MCP availability when the MCP skills extension is off', async () => {
		const registered: Array<Parameters<RegisterToolFn>[0]> = [];
		await service.registerTools(
			(tool) => {
				registered.push(tool);
				tools.set(tool.name, tool.handler as unknown as Handler);
			},
			user,
			false,
		);
		for (const name of ['create_skill', 'update_skill']) {
			const inputSchema = registered.find((tool) => tool.name === name)?.config.inputSchema;
			expect(inputSchema).not.toHaveProperty('availableToMCP');
			expect(inputSchema).toHaveProperty('availableToAssistant');
		}
		skillService.get.mockResolvedValue(detail);
		expect(
			(await callTool('get_skill', { skillId: 'skill_a' })).structuredContent,
		).not.toHaveProperty('availableToMCP');
	});

	describe('search_n8n_skills', () => {
		it('lists the skills with the filters the client sent', async () => {
			skillService.list.mockResolvedValue({ count: 1, data: [listItem] });

			const result = await callTool('search_n8n_skills', {
				query: 'brand',
				attachableToAgentId: 'agent-1',
				limit: 20,
				skip: 40,
			});

			expect(skillService.list).toHaveBeenCalledWith(user, {
				search: 'brand',
				attachableTo: 'agent-1',
				skip: 40,
				take: 20,
			});
			expect(result.structuredContent).toEqual({
				count: 1,
				skills: [
					expect.objectContaining({
						id: 'skill_a',
						name: 'Brand voice',
						availableToAssistant: false,
						availableToMCP: false,
					}),
				],
			});
		});

		it('does not return who created a skill', async () => {
			skillService.list.mockResolvedValue({ count: 1, data: [listItem] });

			const result = await callTool('search_n8n_skills', { limit: 50, skip: 0 });

			expect(JSON.stringify(result.structuredContent)).not.toContain('someone@example.com');
		});
	});

	describe('get_skill', () => {
		it('returns the content and the hash for the next update', async () => {
			skillService.get.mockResolvedValue({
				...detail,
				availableToAssistant: true,
				availableToMCP: true,
			});

			const result = await callTool('get_skill', { skillId: 'skill_a' });

			expect(skillService.get).toHaveBeenCalledWith(user, 'skill_a');
			expect(result.structuredContent).toMatchObject({
				id: 'skill_a',
				skill: detail.skill,
				skillHash: 'hash-2',
				usedBy: detail.usedBy,
				availableToAssistant: true,
				availableToMCP: true,
			});
		});

		it('reports a skill the user cannot read as an error', async () => {
			skillService.get.mockRejectedValue(new Error('Skill not found'));

			const result = await callTool('get_skill', { skillId: 'skill_gone' });

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({
				ok: false,
				code: 'skill_tool_error',
				error: 'Skill not found',
			});
		});
	});

	describe('create_skill', () => {
		const skill = { name: 'Brand voice', description: 'd', instructions: 'Be kind.' };

		it('creates the skill with the MCP source', async () => {
			skillService.create.mockResolvedValue(detail);

			const result = await callTool('create_skill', {
				scope: 'project',
				projectId: 'project-1',
				skill,
			});

			expect(skillService.create).toHaveBeenCalledWith(
				user,
				{ scope: 'project', projectId: 'project-1', skill },
				'mcp',
			);
			expect(result.structuredContent).toMatchObject({ id: 'skill_a', skillHash: 'hash-2' });
			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: 'user-1',
				tool_name: 'create_skill',
				parameters: { scope: 'project' },
				results: { success: true },
			});
		});

		it('creates the skill with the Assistant availability the client sent', async () => {
			skillService.create.mockResolvedValue({ ...detail, availableToAssistant: true });

			const result = await callTool('create_skill', {
				scope: 'instance',
				skill,
				availableToAssistant: true,
			});

			expect(skillService.create).toHaveBeenCalledWith(
				user,
				{ scope: 'instance', skill, availableToAssistant: true },
				'mcp',
			);
			expect(result.structuredContent).toMatchObject({ availableToAssistant: true });
		});

		it('creates the skill with the MCP availability the client sent', async () => {
			skillService.create.mockResolvedValue({ ...detail, availableToMCP: true });

			const result = await callTool('create_skill', {
				scope: 'instance',
				skill,
				availableToMCP: true,
			});

			expect(skillService.create).toHaveBeenCalledWith(
				user,
				{ scope: 'instance', skill, availableToMCP: true },
				'mcp',
			);
			expect(result.structuredContent).toMatchObject({ availableToMCP: true });
		});

		it('tells the client to choose another name when the name is taken', async () => {
			skillService.create.mockRejectedValue(new SkillNameTakenError('Brand voice'));

			const result = await callTool('create_skill', { scope: 'instance', skill });

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({ ok: false, code: 'skill_name_taken' });
		});
	});

	describe('update_skill', () => {
		const saved = {
			id: 'skill_a',
			versionId: 'version-3',
			version: 3,
			created: true,
			skill: detail.skill,
			skillHash: 'hash-3',
		};

		it('saves the next version with the MCP source', async () => {
			skillService.update.mockResolvedValue(saved);

			const result = await callTool('update_skill', {
				skillId: 'skill_a',
				baseSkillHash: 'hash-2',
				instructions: 'Be kinder.',
				availableToAssistant: true,
			});

			expect(skillService.update).toHaveBeenCalledWith(
				user,
				'skill_a',
				{ baseSkillHash: 'hash-2', instructions: 'Be kinder.', availableToAssistant: true },
				'mcp',
			);
			expect(result.structuredContent).toEqual({
				id: 'skill_a',
				versionId: 'version-3',
				version: 3,
				created: true,
				skillHash: 'hash-3',
			});
		});

		it('saves an MCP availability change', async () => {
			skillService.update.mockResolvedValue({ ...saved, version: 2, created: false });

			await callTool('update_skill', {
				skillId: 'skill_a',
				baseSkillHash: 'hash-2',
				availableToMCP: true,
			});

			expect(skillService.update).toHaveBeenCalledWith(
				user,
				'skill_a',
				{ baseSkillHash: 'hash-2', availableToMCP: true },
				'mcp',
			);
		});

		it('returns the latest hash when the skill changed since the client read it', async () => {
			skillService.update.mockRejectedValue(new ConflictError('changed'));
			skillService.get.mockResolvedValue({ ...detail, skillHash: 'hash-9' });

			const result = await callTool('update_skill', {
				skillId: 'skill_a',
				baseSkillHash: 'hash-2',
				instructions: 'Be kinder.',
			});

			expect(result.structuredContent).toMatchObject({
				ok: false,
				code: 'stale_skill',
				skillHash: 'hash-9',
			});
		});

		it('reports another conflict as it is', async () => {
			skillService.update.mockRejectedValue(new ConflictError('Agents use this skill.'));
			skillService.get.mockResolvedValue(detail);

			const result = await callTool('update_skill', {
				skillId: 'skill_a',
				baseSkillHash: 'hash-2',
				scope: 'instance',
			});

			expect(result.structuredContent).toEqual({
				ok: false,
				code: 'skill_tool_error',
				error: 'Agents use this skill.',
			});
		});

		it('tells the client to choose another name when the new name is taken', async () => {
			skillService.update.mockRejectedValue(new SkillNameTakenError('Taken'));

			const result = await callTool('update_skill', {
				skillId: 'skill_a',
				baseSkillHash: 'hash-2',
				name: 'Taken',
			});

			expect(result.structuredContent).toMatchObject({ ok: false, code: 'skill_name_taken' });
			expect(skillService.get).not.toHaveBeenCalled();
		});

		it('tells the client that a synced skill is read-only', async () => {
			skillService.update.mockRejectedValue(new SkillSyncedError('Brand voice', 'GitHub'));

			const result = await callTool('update_skill', {
				skillId: 'skill_a',
				baseSkillHash: 'hash-2',
				instructions: 'Be kinder.',
			});

			expect(result.structuredContent).toMatchObject({
				ok: false,
				skillId: 'skill_a',
				code: 'skill_synced',
				message: expect.stringContaining('Do not retry.'),
			});
			expect(skillService.get).not.toHaveBeenCalled();
		});
	});

	describe('delete_skill', () => {
		it('deletes the skill with the MCP source', async () => {
			const result = await callTool('delete_skill', { skillId: 'skill_a' });

			expect(skillService.delete).toHaveBeenCalledWith(user, 'skill_a', 'mcp');
			expect(result.structuredContent).toEqual({ deleted: true, skillId: 'skill_a' });
		});

		it('reports a skill that agents use as an error', async () => {
			skillService.delete.mockRejectedValue(
				new ConflictError('Skill "Brand voice" is used by Support and cannot be deleted.'),
			);

			const result = await callTool('delete_skill', { skillId: 'skill_a' });

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				error: 'Skill "Brand voice" is used by Support and cannot be deleted.',
			});
		});
	});
});
