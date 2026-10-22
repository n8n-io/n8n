import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { AgentSkill, SkillDetail, SkillListItem } from '@n8n/api-types';
import { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';
import { parse as parseYaml } from 'yaml';

import type { SkillsApiService } from '@/modules/skills/skills-api.service';
import type { Telemetry } from '@/telemetry';

import {
	McpSkillExtensionService,
	toSkillEntry,
	toSkillName,
} from '../tools/skills/skill-extension.service';

const sha256 = (text: string) =>
	`sha256:${createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex')}`;

const releaseNotes: AgentSkill = {
	name: 'Release Notes Writer',
	description: 'Write release notes: "short" and clear — für alle',
	instructions: 'Read references/style.md first.',
	references: [{ path: 'references/style.md', content: '# Style\n\nUse the active voice. ✓' }],
};

const skillMarkdown = (text: string) => {
	const [, frontmatter = ''] = /^---\n([\s\S]*?)\n---\n/.exec(text) ?? [];
	return parseYaml(frontmatter) as Record<string, unknown>;
};

describe('toSkillName', () => {
	it.each([
		['Release Notes Writer', 'release-notes-writer'],
		['  --Brand   voice!!  ', 'brand-voice'],
		['Ünïcode Skill', 'unicode-skill'],
		['!!!', 'skill-a1'],
		['Заметки', 'skill-a1'],
		[`${'a'.repeat(63)} b`, 'a'.repeat(63)],
		['x'.repeat(128), 'x'.repeat(64)],
	])('converts %j to %j', (hubName, expected) => {
		expect(toSkillName(hubName, 'skill_a1')).toBe(expected);
	});
});

describe('toSkillEntry', () => {
	const entry = toSkillEntry('skill_a1', releaseNotes);

	it('uses the skill id as prefix and the converted name as last segment', () => {
		expect(entry.uri).toBe('skill://skill_a1/release-notes-writer/SKILL.md');
		expect(entry.resources.map((resource) => resource.uri)).toEqual([
			'skill://skill_a1/release-notes-writer/SKILL.md',
			'skill://skill_a1/release-notes-writer/references/style.md',
		]);
	});

	it('gives frontmatter equal to the frontmatter of the served SKILL.md', async () => {
		const skillsApi = mock<SkillsApiService>();
		skillsApi.get.mockResolvedValue(mock<SkillDetail>({ scope: 'instance', skill: releaseNotes }));
		const client = await connect(new McpSkillExtensionService(skillsApi, mock()));

		const read = await client.request('resources/read', { uri: entry.uri });

		expect(skillMarkdown(read.result.contents[0].text)).toEqual(entry.frontmatter);
		expect(entry.frontmatter).toEqual({
			name: 'release-notes-writer',
			description: releaseNotes.description,
		});
	});

	it.each(['2025', 'True', 'Null'])(
		'keeps the name %j a string in the served SKILL.md frontmatter',
		async (hubName) => {
			const skill = { ...releaseNotes, name: hubName };
			const skillsApi = mock<SkillsApiService>();
			skillsApi.get.mockResolvedValue(mock<SkillDetail>({ scope: 'instance', skill }));
			const client = await connect(new McpSkillExtensionService(skillsApi, mock()));
			const skillEntry = toSkillEntry('skill_a1', skill);

			const read = await client.request('resources/read', { uri: skillEntry.uri });

			expect(skillMarkdown(read.result.contents[0].text)).toEqual(skillEntry.frontmatter);
		},
	);

	it('gives the digest and byte size of every file, and the SKILL.md digest at top level', () => {
		const skillMd =
			'---\nname: "release-notes-writer"\ndescription: "Write release notes: \\"short\\" and clear — für alle"\n---\n\nRead references/style.md first.\n';
		const style = '# Style\n\nUse the active voice. ✓';

		expect(entry.resources).toEqual([
			{ uri: entry.uri, digest: sha256(skillMd), size: Buffer.byteLength(skillMd) },
			{
				uri: 'skill://skill_a1/release-notes-writer/references/style.md',
				digest: sha256(style),
				size: Buffer.byteLength(style),
			},
		]);
		expect(entry.digest).toBe(sha256(skillMd));
		expect(entry.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
	});
});

type RpcResponse = {
	result: { contents: Array<{ text: string }> } & Record<string, unknown>;
	error?: { code: number; message: string };
};

async function connect(extension: McpSkillExtensionService) {
	const handler = createMcpHandler(
		() => {
			const server = new McpServer({ name: 'test', version: '1.0.0' });
			extension.register(server, Object.assign(new User(), { id: 'user-1' }));
			return server;
		},
		{ legacy: 'stateless' },
	);
	return {
		async request(method: string, params: Record<string, unknown>): Promise<RpcResponse> {
			const res = await handler.fetch(
				new Request('http://n8n.local/mcp-server/http', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						accept: 'application/json, text/event-stream',
						'mcp-protocol-version': '2026-07-28',
						'mcp-method': method,
						...(method === 'resources/read' ? { 'mcp-name': String(params.uri) } : {}),
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method,
						params: {
							...params,
							_meta: {
								'io.modelcontextprotocol/protocolVersion': '2026-07-28',
								'io.modelcontextprotocol/clientCapabilities': {},
								'io.modelcontextprotocol/clientInfo': { name: 'vitest', version: '1.0.0' },
							},
						},
					}),
				}),
			);
			return (await res.json()) as RpcResponse;
		},
	};
}

describe('McpSkillExtensionService', () => {
	const skillsApi = mock<SkillsApiService>();
	const telemetry = mock<Telemetry>();
	const service = new McpSkillExtensionService(skillsApi, telemetry);

	const item = (id: string, scope: SkillListItem['scope'], skill = releaseNotes) => ({
		...mock<SkillListItem>({ id, scope }),
		id,
		scope,
		skill,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		skillsApi.get.mockImplementation(async (_user, skillId) => {
			if (skillId !== 'skill_a1') throw new NotFoundError('Skill not found');
			return mock<SkillDetail>({
				id: 'skill_a1',
				scope: 'instance',
				projectId: null,
				skill: releaseNotes,
			});
		});
	});

	describe('skills/list', () => {
		it('lists the skills the user can read, without agent skills', async () => {
			skillsApi.listContents.mockResolvedValue({
				count: 2,
				data: [item('skill_a1', 'instance'), item('skill_agent', 'agent')],
			});
			const client = await connect(service);

			const { result } = await client.request('skills/list', {});

			expect(result.skills).toEqual([toSkillEntry('skill_a1', releaseNotes)]);
			expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.MCP_LISTED_SKILLS, {
				user_id: 'user-1',
				method: 'skills/list',
				count: 1,
			});
			expect(result.nextCursor).toBeUndefined();
			expect(result).toMatchObject({
				resultType: 'complete',
				ttlMs: 60_000,
				cacheScope: 'private',
			});
		});

		it('pages with an offset cursor', async () => {
			skillsApi.listContents.mockResolvedValue({
				count: 250,
				data: [item('skill_a1', 'instance')],
			});
			const client = await connect(service);

			const { result } = await client.request('skills/list', { cursor: '100' });

			expect(skillsApi.listContents).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ skip: 100, take: 100 }),
			);
			expect(result.nextCursor).toBe('200');
		});
	});

	describe('skills/get', () => {
		it('returns the entry of a readable skill', async () => {
			const client = await connect(service);

			const { result } = await client.request('skills/get', {
				uri: 'skill://skill_a1/release-notes-writer/SKILL.md',
			});

			expect(result.skill).toEqual(toSkillEntry('skill_a1', releaseNotes));
			expect(result).toMatchObject({ resultType: 'complete', ttlMs: 0, cacheScope: 'private' });
			expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.MCP_LISTED_SKILLS, {
				user_id: 'user-1',
				method: 'skills/get',
				count: 1,
			});
		});

		it.each([
			'skill://skill_hidden/release-notes-writer/SKILL.md',
			'skill://skill_a1/other-name/SKILL.md',
			'skill://skill_a1/release-notes-writer/references/style.md',
		])('refuses %s with invalid params', async (uri) => {
			const client = await connect(service);

			const { error } = await client.request('skills/get', { uri });

			expect(error?.code).toBe(-32602);
		});
	});

	describe('resources/read', () => {
		it('reads a reference of a readable skill', async () => {
			const client = await connect(service);

			const { result } = await client.request('resources/read', {
				uri: 'skill://skill_a1/release-notes-writer/references/style.md',
			});

			expect(result.contents[0].text).toBe('# Style\n\nUse the active voice. ✓');
			expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.MCP_READ_SKILL_FILE, {
				user_id: 'user-1',
				skill_id: 'skill_a1',
				scope: 'instance',
				project_id: undefined,
				file: 'reference',
			});
		});

		it('reads a reference whose path has URI delimiters through its listed URI', async () => {
			const skill: AgentSkill = {
				...releaseNotes,
				references: [{ path: 'references/my notes #1?.md', content: 'Notes' }],
			};
			skillsApi.get.mockResolvedValue(
				mock<SkillDetail>({ id: 'skill_a1', scope: 'instance', projectId: null, skill }),
			);
			const referenceUri = toSkillEntry('skill_a1', skill).resources[1].uri;
			const client = await connect(service);

			const { result } = await client.request('resources/read', { uri: referenceUri });

			expect(referenceUri).toBe(
				'skill://skill_a1/release-notes-writer/references/my%20notes%20%231%3F.md',
			);
			expect(result.contents[0].text).toBe('Notes');
		});

		it('reports a SKILL.md read as skill_md', async () => {
			const client = await connect(service);

			await client.request('resources/read', {
				uri: 'skill://skill_a1/release-notes-writer/SKILL.md',
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.MCP_READ_SKILL_FILE,
				expect.objectContaining({ file: 'skill_md' }),
			);
		});

		it('does not read a skill the user cannot read', async () => {
			const client = await connect(service);

			const { error } = await client.request('resources/read', {
				uri: 'skill://skill_hidden/release-notes-writer/SKILL.md',
			});

			expect(skillsApi.get).toHaveBeenCalledWith(expect.anything(), 'skill_hidden');
			expect(error).toBeDefined();
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('does not read an agent skill', async () => {
			skillsApi.get.mockResolvedValue(mock<SkillDetail>({ scope: 'agent', skill: releaseNotes }));
			const client = await connect(service);

			const { error } = await client.request('resources/read', {
				uri: 'skill://skill_a1/release-notes-writer/SKILL.md',
			});

			expect(error).toBeDefined();
		});
	});
});
