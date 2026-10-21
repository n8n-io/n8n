import {
	type McpServer,
	ProtocolError,
	ProtocolErrorCode,
	ResourceNotFoundError,
	ResourceTemplate,
} from '@modelcontextprotocol/server';
import {
	type AgentSkill,
	ListSkillsQueryDto,
	type SkillDetail,
	SKILLS_MAX_PAGE_SIZE,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { SkillRepository } from '@/modules/skills/skill.repository';
import { toAgentSkill } from '@/modules/skills/skill.service';
import { SkillsApiService } from '@/modules/skills/skills-api.service';
import { Telemetry } from '@/telemetry';

export const SKILLS_EXTENSION_ID = 'io.modelcontextprotocol/skills';

const SKILL_NAME_MAX_LENGTH = 64;
const SKILL_MD_PATH = 'SKILL.md';
const SKILL_MD_URI_PATTERN = /^skill:\/\/([^/]+)\/([^/]+)\/SKILL\.md$/;

const listParams = z.object({ cursor: z.string().regex(/^\d+$/).optional() });
const getParams = z.object({ uri: z.string() });

export function toSkillName(hubName: string): string {
	const name = hubName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.slice(0, SKILL_NAME_MAX_LENGTH)
		.replace(/^-|-$/g, '');
	return name || 'skill';
}

function skillFiles(skill: AgentSkill, name: string) {
	const skillMd = `---\nname: ${name}\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${skill.instructions}\n`;
	return [{ path: SKILL_MD_PATH, content: skillMd }, ...(skill.references ?? [])];
}

function toUriPath(filePath: string): string {
	return filePath.split('/').map(encodeURIComponent).join('/');
}

function fileResource(uri: string, content: string) {
	const bytes = Buffer.from(content, 'utf8');
	return {
		uri,
		digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
		size: bytes.length,
	};
}

export function toSkillEntry(skillId: string, skill: AgentSkill) {
	const name = toSkillName(skill.name);
	const root = `skill://${skillId}/${name}`;
	const [skillMd, ...references] = skillFiles(skill, name).map((file) =>
		fileResource(`${root}/${toUriPath(file.path)}`, file.content),
	);
	return {
		uri: skillMd.uri,
		frontmatter: { name, description: skill.description },
		digest: skillMd.digest,
		resources: [skillMd, ...references],
	};
}

@Service()
export class McpSkillExtensionService {
	constructor(
		private readonly skillsApi: SkillsApiService,
		private readonly skillRepository: SkillRepository,
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
			const [, skillId = '', name] = SKILL_MD_URI_PATTERN.exec(uri) ?? [];
			const detail = await this.readableSkill(user, skillId);
			if (!detail || toSkillName(detail.skill.name) !== name) {
				throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Unknown skill: ${uri}`);
			}
			this.telemetry.track(TELEMETRY_EVENT.CONTEXT.MCP_LISTED_SKILLS, {
				user_id: user.id,
				method: 'skills/get',
				count: 1,
			});
			return { skill: toSkillEntry(skillId, detail.skill) };
		});

		server.registerResource(
			'skill-file',
			new ResourceTemplate('skill://{skillId}/{name}/{+path}', { list: undefined }),
			{ description: 'A file of a skills hub skill' },
			async (uri, { skillId, name, path }) => {
				const detail = typeof skillId === 'string' ? await this.readableSkill(user, skillId) : null;
				const skillName = detail ? toSkillName(detail.skill.name) : undefined;
				const file =
					detail && skillName === name
						? skillFiles(detail.skill, skillName).find(
								(candidate) => toUriPath(candidate.path) === path,
							)
						: undefined;
				if (!detail || !file) throw new ResourceNotFoundError(uri.href);
				this.telemetry.track(TELEMETRY_EVENT.CONTEXT.MCP_READ_SKILL_FILE, {
					user_id: user.id,
					skill_id: detail.id,
					scope: detail.scope,
					project_id: detail.projectId ?? undefined,
					file: file.path === SKILL_MD_PATH ? 'skill_md' : 'reference',
				});
				return {
					contents: [{ uri: uri.href, mimeType: 'text/markdown', text: file.content }],
				};
			},
		);
	}

	private async list(user: User, skip: number) {
		const { count, data } = await this.skillsApi.list(
			user,
			ListSkillsQueryDto.parse({ skip: String(skip), take: String(SKILLS_MAX_PAGE_SIZE) }),
		);
		const ids = data
			.filter((item) => item.scope !== 'agent' && item.availableToMCP)
			.map((item) => item.id);
		const rows = await this.skillRepository.findLatestSaved(ids);
		const skills = ids.flatMap((id) => {
			const row = rows.get(id);
			return row ? [toSkillEntry(id, toAgentSkill(row))] : [];
		});
		this.telemetry.track(TELEMETRY_EVENT.CONTEXT.MCP_LISTED_SKILLS, {
			user_id: user.id,
			method: 'skills/list',
			count: skills.length,
		});
		const next = skip + data.length;
		return {
			skills,
			ttlMs: 0,
			cacheScope: 'private',
			...(next < count ? { nextCursor: String(next) } : {}),
		};
	}

	private async readableSkill(user: User, skillId: string): Promise<SkillDetail | null> {
		try {
			const detail = await this.skillsApi.get(user, skillId);
			return detail.scope === 'agent' || !detail.availableToMCP ? null : detail;
		} catch (error) {
			if (error instanceof NotFoundError) return null;
			throw error;
		}
	}
}
