import {
	type McpServer,
	ProtocolError,
	ProtocolErrorCode,
	ResourceNotFoundError,
	ResourceTemplate,
} from '@modelcontextprotocol/server';
import { type AgentSkill, SKILLS_MAX_PAGE_SIZE } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { SkillService } from '@/modules/skills/skill.service';
import { Telemetry } from '@/telemetry';

const SKILLS_EXTENSION_ID = 'io.modelcontextprotocol/skills';

const SKILL_NAME_MAX_LENGTH = 64;
const SKILL_MD_PATH = 'SKILL.md';
const SKILL_MD_URI_PATTERN = /^skill:\/\/([^/]+)\/([^/]+)\/SKILL\.md$/;

const listParams = z.object({
	cursor: z
		.string()
		.regex(/^\d{1,15}$/)
		.optional(),
});
const getParams = z.object({ uri: z.string() });

function toSlug(text: string): string {
	return text
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.slice(0, SKILL_NAME_MAX_LENGTH)
		.replace(/^-|-$/g, '');
}

export function toSkillName(hubName: string, skillId: string): string {
	return toSlug(hubName) || toSlug(skillId);
}

function toUriPath(filePath: string): string {
	return filePath.split('/').map(encodeURIComponent).join('/');
}

function fromUriPath(uriPath: string): string | undefined {
	try {
		return decodeURIComponent(uriPath);
	} catch {
		return undefined;
	}
}

function referenceList(references: AgentSkill['references'] = []): string {
	if (references.length === 0) return '';
	const links = references.map(
		(reference) => `- [${reference.path}](${toUriPath(reference.path)})`,
	);
	return `\n\n## References\n\n${links.join('\n')}`;
}

function skillFiles(skill: AgentSkill, name: string) {
	const skillMd = `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${skill.instructions}${referenceList(skill.references)}\n`;
	return [{ path: SKILL_MD_PATH, content: skillMd }, ...(skill.references ?? [])];
}

function fileResource(uri: string, content: string) {
	return {
		uri,
		digest: `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`,
		size: Buffer.byteLength(content, 'utf8'),
	};
}

export function toSkillEntry(skillId: string, skill: AgentSkill) {
	const name = toSkillName(skill.name, skillId);
	const root = `skill://${skillId}/${name}`;
	const resources = skillFiles(skill, name).map((file) =>
		fileResource(`${root}/${toUriPath(file.path)}`, file.content),
	);
	const [skillMd] = resources;
	return {
		uri: skillMd.uri,
		frontmatter: { name, description: skill.description },
		digest: skillMd.digest,
		resources,
	};
}

@Service()
export class McpSkillExtensionService {
	constructor(
		private readonly skillService: SkillService,
		private readonly telemetry: Telemetry,
	) {}

	register(server: McpServer, user: User): void {
		server.server.registerCapabilities({
			resources: {},
			extensions: { [SKILLS_EXTENSION_ID]: {} },
		});

		server.server.setRequestHandler(
			'skills/list',
			{ params: listParams },
			async ({ cursor }) => await this.list(user, Number(cursor ?? 0)),
		);

		server.server.setRequestHandler('skills/get', { params: getParams }, async ({ uri }) => {
			const [, skillId, name] = SKILL_MD_URI_PATTERN.exec(uri) ?? [];
			const found = await this.skillAt(user, skillId, name);
			if (!found) {
				throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Unknown skill: ${uri}`);
			}
			this.telemetry.track(TELEMETRY_EVENT.CONTEXT.MCP_LISTED_SKILLS, {
				user_id: user.id,
				method: 'skills/get',
				count: 1,
			});
			return { skill: toSkillEntry(found.id, found.skill), ttlMs: 0, cacheScope: 'private' };
		});

		server.registerResource(
			'skill-file',
			new ResourceTemplate('skill://{skillId}/{name}/{+path}', { list: undefined }),
			{ description: 'A file of a skills hub skill' },
			async (uri, { skillId, name, path }) => {
				const found = await this.skillAt(user, skillId, name);
				const filePath = typeof path === 'string' ? fromUriPath(path) : undefined;
				const file = found
					? skillFiles(found.skill, found.name).find((candidate) => candidate.path === filePath)
					: undefined;
				if (!found || !file) throw new ResourceNotFoundError(uri.href);
				this.telemetry.track(TELEMETRY_EVENT.CONTEXT.MCP_READ_SKILL_FILE, {
					user_id: user.id,
					skill_id: found.id,
					scope: found.projectId ? 'project' : 'instance',
					project_id: found.projectId ?? undefined,
					file: file.path === SKILL_MD_PATH ? 'skill_md' : 'reference',
				});
				return {
					contents: [{ uri: uri.href, mimeType: 'text/markdown', text: file.content }],
				};
			},
		);
	}

	private async list(user: User, skip: number) {
		const page = await this.skillService.listForMcp(user, skip, SKILLS_MAX_PAGE_SIZE);
		const skills = page.skills.map((content) => toSkillEntry(content.id, content.skill));
		this.telemetry.track(TELEMETRY_EVENT.CONTEXT.MCP_LISTED_SKILLS, {
			user_id: user.id,
			method: 'skills/list',
			count: skills.length,
		});
		const next = skip + SKILLS_MAX_PAGE_SIZE;
		return {
			skills,
			ttlMs: 60_000,
			cacheScope: 'private',
			...(next < page.count ? { nextCursor: String(next) } : {}),
		};
	}

	private async skillAt(user: User, skillId: unknown, name: unknown) {
		if (typeof skillId !== 'string' || typeof name !== 'string') return null;
		const content = await this.skillService.readForMcp(user, skillId);
		if (!content || toSkillName(content.skill.name, skillId) !== name) return null;
		return { ...content, name };
	}
}
