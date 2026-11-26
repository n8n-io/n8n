import type {
	PublicSkillSourceDiscovery,
	SkillDetail,
	SkillListItem,
	SkillSourceListItem,
} from '@n8n/api-types';
import type { TelemetryProxy } from '@n8n/backend-services';
import { User } from '@n8n/db';
import { ConflictError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import {
	type AssistantSkillsFlagGate,
	SkillNameTakenError,
	type SkillService,
	type SkillSourceService,
	type SkillSyncFlagGate,
} from '@/modules/skills';
import { SkillSourceRequestError, SkillSyncedError } from '@/modules/skills/testing';

import { SKILL_SOURCE_TOOLS, SKILL_TOOLS } from '../mcp-scopes';
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
	availableToAssistant: false,
	source: 'ui',
	createdBy: { id: 'user-2', email: 'someone@example.com', firstName: 'Some', lastName: 'One' },
	latestVersion: 2,
	usedByAgents: 1,
	availableToMCP: false,
	canEdit: true,
	canDelete: true,
	canStopSyncing: false,
	syncState: null,
	sourceId: null,
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

const syncedListItem: SkillListItem = {
	...listItem,
	source: 'github',
	canEdit: false,
	canStopSyncing: true,
	sourceId: 'source-1',
	syncState: 'update_available',
};

const syncedDetail: SkillDetail = {
	...detail,
	...syncedListItem,
	syncedFrom: {
		sourceId: 'source-1',
		type: 'github',
		label: 'acme/skills',
		ref: 'main',
		webUrl: 'https://github.com/acme/skills/tree/main/brand-voice',
		canStopSyncing: true,
	},
};

describe('McpSkillToolsService', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const telemetry = mock<TelemetryProxy>();
	const skillService = mock<SkillService>();
	const rollout = mock<AssistantSkillsFlagGate>();
	const skillSources = mock<SkillSourceService>();
	const skillSyncGate = mock<SkillSyncFlagGate>();
	const service = new McpSkillToolsService(
		telemetry,
		skillService,
		rollout,
		skillSources,
		skillSyncGate,
	);
	let tools: Map<string, Handler>;

	const callTool = async (name: string, input: Record<string, unknown>) => {
		const handler = tools.get(name);
		if (!handler) throw new Error(`Tool "${name}" is not registered`);
		return await handler(input, {});
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		rollout.isEnabled.mockResolvedValue(true);
		skillSyncGate.isEnabled.mockResolvedValue(true);
		tools = new Map();
		const registerTool: RegisterToolFn = (tool) => {
			tools.set(tool.name, tool.handler as unknown as Handler);
		};
		await service.registerTools(registerTool, user, true);
	});

	it('registers exactly the skill tools of the scope map (drift guard)', () => {
		expect(new Set(tools.keys())).toEqual(SKILL_TOOLS);
	});

	it('hides source tools when Skill Sync is off', async () => {
		skillSyncGate.isEnabled.mockResolvedValue(false);
		const registered: string[] = [];
		await service.registerTools((tool) => registered.push(tool.name), user, true);
		expect(registered).toEqual([
			'search_n8n_skills',
			'get_skill',
			'create_skill',
			'update_skill',
			'delete_skill',
		]);
		// The consent screen hides the same tools with this set.
		expect(new Set(registered)).toEqual(
			new Set([...SKILL_TOOLS].filter((tool) => !SKILL_SOURCE_TOOLS.has(tool))),
		);
	});

	it('reports the result of a source import without tracking its URL or selection', async () => {
		const input = {
			url: 'https://github.com/acme/skills',
			scope: 'instance',
			skillKeys: ['brand-voice'],
			revision: 'commit',
		};
		const imported = {
			sourceId: 'source-1',
			imported: [{ key: 'brand-voice', skillId: 'skill_a', name: 'brand-voice' }],
			failed: [],
		};
		skillSources.connectPublic.mockResolvedValue(imported);

		const result = await callTool('import_skills_from_source', input);

		expect(result.structuredContent).toEqual(imported);
		expect(skillSources.connectPublic).toHaveBeenCalledWith(user, input, 'mcp');
		expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
			user_id: user.id,
			tool_name: 'import_skills_from_source',
			parameters: { scope: 'instance' },
			results: { success: true },
		});
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

		it('shows that a skill is synced, with its source and sync state', async () => {
			skillService.list.mockResolvedValue({ count: 2, data: [listItem, syncedListItem] });

			const result = await callTool('search_n8n_skills', { limit: 50, skip: 0 });

			expect(result.structuredContent.skills).toEqual([
				expect.objectContaining({ sourceId: null, syncState: null, canEdit: true }),
				expect.objectContaining({
					sourceId: 'source-1',
					syncState: 'update_available',
					canEdit: false,
				}),
			]);
		});

		it('does not return who created a skill', async () => {
			skillService.list.mockResolvedValue({ count: 1, data: [listItem] });

			const result = await callTool('search_n8n_skills', { limit: 50, skip: 0 });

			expect(JSON.stringify(result.structuredContent)).not.toContain('someone@example.com');
		});

		it('returns no agent fields, because a skill belongs to a project or the instance', async () => {
			skillService.list.mockResolvedValue({ count: 1, data: [listItem] });

			const result = await callTool('search_n8n_skills', { limit: 50, skip: 0 });

			const [skill] = (result.structuredContent as { skills: Array<Record<string, unknown>> })
				.skills;
			expect(skill).toBeDefined();
			expect(skill).not.toHaveProperty('agentId');
			expect(skill).not.toHaveProperty('agentName');
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

		it('lists a binary file without its content', async () => {
			skillService.get.mockResolvedValue({
				...detail,
				skill: {
					...detail.skill,
					references: [
						{ path: 'assets/logo.png', content: 'AP8=', isBinary: true },
						{ path: 'references/tone.md', content: 'Warm.' },
					],
				},
			});

			const result = await callTool('get_skill', { skillId: 'skill_a' });

			expect((result.structuredContent as { skill: unknown }).skill).toEqual({
				...detail.skill,
				references: [
					{ path: 'assets/logo.png', isBinary: true, characterCount: 4 },
					{ path: 'references/tone.md', content: 'Warm.', characterCount: 5 },
				],
			});
			expect(JSON.stringify(result)).not.toContain('AP8=');
		});

		it('refuses a referenceOffset without a referencePath as an error result', async () => {
			const result = await callTool('get_skill', { skillId: 'skill_a', referenceOffset: 10 });

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({
				ok: false,
				skillId: 'skill_a',
				error: 'Pass referencePath with referenceOffset.',
			});
			expect(skillService.get).not.toHaveBeenCalled();
		});

		it('bounds reference content and reads omitted paths and the remaining parts on request', async () => {
			const referencePath = 'reference/long.md';
			const fullContent = `${'x'.repeat(50 * 1024)}Last part`;
			skillService.get.mockResolvedValue({
				...detail,
				skill: {
					...detail.skill,
					references: [
						{ path: referencePath, content: fullContent },
						{ path: 'reference/other.md', content: 'Another guide' },
					],
				},
			});

			const initial = await callTool('get_skill', { skillId: 'skill_a' });
			const firstRef = (
				initial.structuredContent.skill as {
					references: Array<{ content?: string; nextOffset?: number; contentTruncated?: boolean }>;
				}
			).references[0];
			expect(firstRef.contentTruncated).toBe(true);
			expect(firstRef.nextOffset).toBeGreaterThan(0);
			expect(firstRef.content).toBe(fullContent.slice(0, firstRef.nextOffset));
			expect(initial.structuredContent).toMatchObject({
				omittedReferencePaths: ['reference/other.md'],
			});
			expect(JSON.stringify(initial.structuredContent)).not.toContain('Another guide');

			const next = await callTool('get_skill', {
				skillId: 'skill_a',
				referencePath,
				referenceOffset: firstRef.nextOffset,
			});
			expect(next.structuredContent).toMatchObject({
				skill: {
					references: [
						{ path: referencePath, content: fullContent.slice(firstRef.nextOffset) },
						{ path: 'reference/other.md' },
					],
				},
			});
			const omitted = await callTool('get_skill', {
				skillId: 'skill_a',
				referencePath: 'reference/other.md',
			});
			expect(omitted.structuredContent).toMatchObject({
				skill: {
					references: [
						{ path: referencePath },
						{ path: 'reference/other.md', content: 'Another guide' },
					],
				},
			});
		});

		it('shows where a synced skill comes from', async () => {
			skillService.get.mockResolvedValue(syncedDetail);

			const result = await callTool('get_skill', { skillId: 'skill_a' });

			expect(result.structuredContent).toMatchObject({
				sourceId: 'source-1',
				syncState: 'update_available',
				canEdit: false,
				syncedFrom: syncedDetail.syncedFrom,
			});
		});

		it('says that a skill with no source is not synced', async () => {
			skillService.get.mockResolvedValue(detail);

			const result = await callTool('get_skill', { skillId: 'skill_a' });

			expect(result.structuredContent).toMatchObject({
				sourceId: null,
				syncState: null,
				syncedFrom: null,
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
				// A client reads no binary content, so its update must not drop the binary files.
				{ keepUnnamedBinaryFiles: true },
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
				{ keepUnnamedBinaryFiles: true },
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

	describe('list_skill_sources', () => {
		it('lists the sources that the user can see', async () => {
			const sources = [mock<SkillSourceListItem>({ id: 'source-1', label: 'acme/skills' })];
			skillSources.list.mockResolvedValue(sources);

			const result = await callTool('list_skill_sources', {});

			expect(result.isError).toBeFalsy();
			expect(result.structuredContent).toEqual({ sources });
			expect(skillSources.list).toHaveBeenCalledWith(user);
			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: user.id,
				tool_name: 'list_skill_sources',
				parameters: {},
				results: { success: true },
			});
		});
	});

	describe('import_skills_from_source', () => {
		const input = {
			url: 'https://github.com/acme/skills',
			scope: 'instance',
			skillKeys: ['brand-voice'],
			revision: 'commit',
		};

		it.each([
			['stale', 'The source changed. Preview it again before importing.'],
			['review_required', 'Every picked skill needs a review of its warnings.'],
			['duplicate_source', 'This repository is already connected in Global.'],
		] as const)('reports a refused import with the reason %s', async (reason, message) => {
			skillSources.connectPublic.mockRejectedValue(new SkillSourceRequestError(reason, message));

			const result = await callTool('import_skills_from_source', input);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({ ok: false, code: reason, error: message });
			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: user.id,
				tool_name: 'import_skills_from_source',
				parameters: { scope: 'instance' },
				results: { success: false, data: { reason } },
			});
		});

		it('returns the skills that did not come in with the ones that did', async () => {
			const partial = {
				sourceId: 'source-1',
				imported: [{ key: 'brand-voice', skillId: 'skill_a', name: 'brand-voice' }],
				failed: [{ key: 'warning', name: 'warning', reason: 'review_required' as const }],
			};
			skillSources.connectPublic.mockResolvedValue(partial);

			const result = await callTool('import_skills_from_source', {
				...input,
				skillKeys: ['brand-voice', 'warning'],
			});

			expect(result.isError).toBeFalsy();
			expect(result.structuredContent).toEqual(partial);
		});
	});

	describe('discover_skill_source', () => {
		const input = {
			url: 'https://github.com/acme/skills',
			scope: 'instance',
		};

		it('returns the preview result without tracking its URL', async () => {
			const preview: PublicSkillSourceDiscovery = {
				source: {
					type: 'github',
					label: 'acme/skills',
					ref: 'main',
					path: '',
					webUrl: 'https://github.com/acme/skills',
				},
				duplicate: { kind: 'none' },
				revision: 'commit-1',
				skills: [
					{
						key: 'brand-voice',
						location: 'brand-voice',
						name: 'Brand voice',
						nameTaken: false,
						webUrl: 'https://github.com/acme/skills/tree/main/brand-voice',
						verdict: 'pass',
						reason: null,
					},
				],
				truncated: false,
			};
			skillSources.discoverPublic.mockResolvedValue(preview);

			const result = await callTool('discover_skill_source', input);

			expect(result.isError).toBeFalsy();
			expect(result.structuredContent).toEqual(preview);
			expect(skillSources.discoverPublic).toHaveBeenCalledWith(user, input, 'mcp');
			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: user.id,
				tool_name: 'discover_skill_source',
				parameters: { scope: 'instance' },
				results: { success: true },
			});
		});

		it('maps a source error to its reason code in the response and telemetry', async () => {
			skillSources.discoverPublic.mockRejectedValue(
				new SkillSourceRequestError('not_found', 'Repository not found'),
			);

			const result = await callTool('discover_skill_source', input);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({
				ok: false,
				code: 'not_found',
				error: 'Repository not found',
			});
			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: user.id,
				tool_name: 'discover_skill_source',
				parameters: { scope: 'instance' },
				results: { success: false, data: { reason: 'not_found' } },
			});
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
