import {
	CLIENT_CAPABILITIES_META_KEY,
	CLIENT_INFO_META_KEY,
	createMcpHandler,
	McpServer,
	PROTOCOL_VERSION_META_KEY,
} from '@modelcontextprotocol/server';
import type { AgentSkill } from '@n8n/api-types';
import type { TelemetryProxy } from '@n8n/backend-services';
import { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';
import { parse as parseYaml } from 'yaml';

import type { McpSkillContent, SkillService } from '@/modules/skills';

import {
	McpSkillExtensionService,
	toSkillEntry,
	toSkillName,
} from '../tools/skills/skill-extension.service';

const PROTOCOL_VERSION = '2026-07-28';

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

const content = (skill: AgentSkill, projectId: string | null = null): McpSkillContent => ({
	id: 'skill_a1',
	projectId,
	// A version never changes, so other content means another version.
	versionId: createHash('sha256').update(JSON.stringify(skill)).digest('hex'),
	skill,
});

const listItem = (skill: AgentSkill) => {
	const item = content(skill);
	return { id: item.id, versionId: item.versionId, content: item };
};

type RpcResponse = {
	result: { contents: Array<{ text: string }> } & Record<string, unknown>;
	error?: { code: number; message: string };
};

function connect(extension: McpSkillExtensionService) {
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
						'mcp-protocol-version': PROTOCOL_VERSION,
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
								[PROTOCOL_VERSION_META_KEY]: PROTOCOL_VERSION,
								[CLIENT_CAPABILITIES_META_KEY]: {},
								[CLIENT_INFO_META_KEY]: { name: 'vitest', version: '1.0.0' },
							},
						},
					}),
				}),
			);
			return (await res.json()) as RpcResponse;
		},
	};
}

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
	const skillMd =
		'---\nname: "release-notes-writer"\ndescription: "Write release notes: \\"short\\" and clear — für alle"\n---\n\nRead references/style.md first.\n\n## References\n\n- [references/style.md](references/style.md)\n';

	it('uses the skill id as prefix and the converted name as last segment', () => {
		expect(entry.uri).toBe('skill://skill_a1/release-notes-writer/SKILL.md');
		expect(entry.resources.map((resource) => resource.uri)).toEqual([
			'skill://skill_a1/release-notes-writer/SKILL.md',
			'skill://skill_a1/release-notes-writer/references/style.md',
		]);
	});

	it.each(['Release Notes Writer', '2025', 'True', 'Null'])(
		'gives frontmatter equal to the frontmatter of the served SKILL.md for the name %j',
		async (hubName) => {
			const skill = { ...releaseNotes, name: hubName };
			const skillService = mock<SkillService>();
			skillService.readForMcp.mockResolvedValue(content(skill));
			const skillEntry = toSkillEntry('skill_a1', skill);

			const read = await connect(new McpSkillExtensionService(skillService, mock())).request(
				'resources/read',
				{ uri: skillEntry.uri },
			);

			expect(skillMarkdown(read.result.contents[0].text)).toEqual(skillEntry.frontmatter);
		},
	);

	it('gives the frontmatter name and description', () => {
		expect(entry.frontmatter).toEqual({
			name: 'release-notes-writer',
			description: releaseNotes.description,
		});
	});

	it('gives the digest and byte size of every file, and the SKILL.md digest at top level', () => {
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
	});

	it('lists no references in the SKILL.md of a skill without references', () => {
		const { references: _references, ...skill } = releaseNotes;
		const markdown =
			'---\nname: "release-notes-writer"\ndescription: "Write release notes: \\"short\\" and clear — für alle"\n---\n\nRead references/style.md first.\n';

		expect(toSkillEntry('skill_a1', skill).digest).toBe(sha256(markdown));
	});
});

describe('McpSkillExtensionService', () => {
	const skillService = mock<SkillService>();
	const telemetry = mock<TelemetryProxy>();
	const client = connect(new McpSkillExtensionService(skillService, telemetry));

	beforeEach(() => {
		vi.clearAllMocks();
		skillService.readForMcp.mockImplementation(async (_user, skillId) =>
			skillId === 'skill_a1' ? content(releaseNotes) : null,
		);
		skillService.readFileForMcp.mockImplementation(async (_user, skillId, path) => {
			const file = releaseNotes.references?.find((reference) => reference.path === path);
			if (skillId !== 'skill_a1' || !file) return null;
			return { id: skillId, projectId: 'project-1', name: releaseNotes.name, file };
		});
	});

	describe('skills/list', () => {
		it('lists the skills of the page', async () => {
			skillService.listForMcp.mockResolvedValue({ count: 1, skills: [listItem(releaseNotes)] });

			const { result } = await client.request('skills/list', {});

			expect(skillService.listForMcp).toHaveBeenCalledWith(
				expect.anything(),
				0,
				100,
				expect.any(Function),
			);
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
			skillService.listForMcp.mockResolvedValue({ count: 250, skills: [listItem(releaseNotes)] });

			const { result } = await client.request('skills/list', { cursor: '100' });

			expect(skillService.listForMcp).toHaveBeenCalledWith(
				expect.anything(),
				100,
				100,
				expect.any(Function),
			);
			expect(result.nextCursor).toBe('200');
		});

		it('lists a version that it listed before without its content', async () => {
			const skill: AgentSkill = { ...releaseNotes, instructions: 'Listed two times.' };
			const { id, versionId, content: listed } = listItem(skill);
			skillService.listForMcp.mockResolvedValueOnce({
				count: 1,
				skills: [{ id, versionId, content: listed }],
			});
			await client.request('skills/list', {});

			skillService.listForMcp.mockImplementationOnce(async (_user, _skip, _take, isKnown) => ({
				count: 2,
				skills: [
					// The service reads no content for a version that the caller knows.
					{ id, versionId, ...(isKnown?.(versionId) ? {} : { content: listed }) },
					{ id: 'skill_gone', versionId: 'unknown-version' },
				],
			}));
			const { result } = await client.request('skills/list', {});

			expect(skillService.listForMcp.mock.results).toHaveLength(2);
			expect(result.skills).toEqual([toSkillEntry('skill_a1', skill)]);
		});

		it('refuses a cursor that is not a safe integer', async () => {
			const { error } = await client.request('skills/list', { cursor: '1'.repeat(16) });

			expect(error?.code).toBe(-32602);
			expect(skillService.listForMcp).not.toHaveBeenCalled();
		});
	});

	describe('skills/get', () => {
		it('returns the entry of a readable skill', async () => {
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
			const { error } = await client.request('skills/get', { uri });

			expect(error?.code).toBe(-32602);
			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});

	describe('resources/read', () => {
		it('reads a reference of a readable skill', async () => {
			const { result } = await client.request('resources/read', {
				uri: 'skill://skill_a1/release-notes-writer/references/style.md',
			});

			expect(result.contents[0].text).toBe('# Style\n\nUse the active voice. ✓');
			expect(skillService.readForMcp).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.MCP_READ_SKILL_FILE, {
				user_id: 'user-1',
				skill_id: 'skill_a1',
				scope: 'project',
				project_id: 'project-1',
				file: 'reference',
			});
		});

		it('returns a binary file as a blob and reports its decoded size and digest', async () => {
			const bytes = Buffer.from([0, 255]);
			const blob = bytes.toString('base64');
			const skill: AgentSkill = {
				...releaseNotes,
				references: [{ path: 'assets/logo.png', content: blob, isBinary: true }],
			};
			skillService.readFileForMcp.mockResolvedValueOnce({
				id: 'skill_a1',
				projectId: null,
				name: skill.name,
				file: { path: 'assets/logo.png', content: blob, isBinary: true },
			});
			const uri = 'skill://skill_a1/release-notes-writer/assets/logo.png';

			const { result } = await client.request('resources/read', { uri });

			expect(result.contents).toEqual([{ uri, mimeType: 'application/octet-stream', blob }]);
			expect(toSkillEntry('skill_a1', skill).resources[1]).toEqual({
				uri,
				digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
				size: bytes.length,
			});
		});

		it('reports the provider and access of the source of a synced skill', async () => {
			skillService.readFileForMcp.mockResolvedValueOnce({
				id: 'skill_a1',
				projectId: 'project-1',
				name: releaseNotes.name,
				file: { path: 'references/style.md', content: 'Style guide' },
				origin: { provider: 'github', access: 'credential' },
			});

			await client.request('resources/read', {
				uri: 'skill://skill_a1/release-notes-writer/references/style.md',
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.MCP_READ_SKILL_FILE,
				expect.objectContaining({ source_provider: 'github', source_access: 'credential' }),
			);
		});

		it.each([
			['the listed URI', 'references/Q%26A%20%231%3F.md'],
			['a URI built from the SKILL.md text', 'references/Q&A%20%231%3F.md'],
		])('reads a reference whose path has URI delimiters through %s', async (_, uriPath) => {
			const file = { path: 'references/Q&A #1?.md', content: 'Notes' };
			const skill: AgentSkill = {
				...releaseNotes,
				references: [file],
			};
			skillService.readFileForMcp.mockImplementationOnce(async (_user, id, path) =>
				path === file.path ? { id, projectId: null, name: skill.name, file } : null,
			);

			const { result } = await client.request('resources/read', {
				uri: `skill://skill_a1/release-notes-writer/${uriPath}`,
			});

			expect(toSkillEntry('skill_a1', skill).resources[1].uri).toBe(
				'skill://skill_a1/release-notes-writer/references/Q%26A%20%231%3F.md',
			);
			expect(result.contents[0].text).toBe('Notes');
		});

		it('reports a SKILL.md read as skill_md', async () => {
			await client.request('resources/read', {
				uri: 'skill://skill_a1/release-notes-writer/SKILL.md',
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.MCP_READ_SKILL_FILE,
				expect.objectContaining({ scope: 'instance', file: 'skill_md' }),
			);
		});

		it.each([
			'skill://skill_hidden/release-notes-writer/SKILL.md',
			'skill://skill_a1/other-name/SKILL.md',
			'skill://skill_a1/release-notes-writer/references/missing.md',
			'skill://skill_a1/release-notes-writer/references/%E0%A4%A.md',
		])('answers resource not found for %s', async (uri) => {
			const { error } = await client.request('resources/read', { uri });

			expect(error).toMatchObject({
				code: -32602,
				message: expect.stringContaining('Resource not found'),
			});
			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});
});
