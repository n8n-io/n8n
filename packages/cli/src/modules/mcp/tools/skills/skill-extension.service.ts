import {
	type McpServer,
	ProtocolError,
	ProtocolErrorCode,
	ResourceNotFoundError,
	ResourceTemplate,
} from '@modelcontextprotocol/server';
import { type AgentSkill, type AgentSkillReference, SKILLS_MAX_PAGE_SIZE } from '@n8n/api-types';
import { TelemetryProxy } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { type McpSkillContent, SkillService } from '@/modules/skills';

const SKILLS_EXTENSION_ID = 'io.modelcontextprotocol/skills';

const SKILL_NAME_MAX_LENGTH = 64;
const SKILL_MD_PATH = 'SKILL.md';
/** The file entries that the list cache keeps, over all skill versions. */
const ENTRY_CACHE_MAX_RESOURCES = 50_000;
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

function skillFiles(skill: AgentSkill, name: string): AgentSkillReference[] {
	const skillMd = `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${skill.instructions}${referenceList(skill.references)}\n`;
	return [{ path: SKILL_MD_PATH, content: skillMd }, ...(skill.references ?? [])];
}

function fileResource(uri: string, file: AgentSkillReference) {
	const content = Buffer.from(file.content, file.isBinary ? 'base64' : 'utf8');
	return {
		uri,
		digest: `sha256:${createHash('sha256').update(content).digest('hex')}`,
		size: content.length,
	};
}

export function toSkillEntry(skillId: string, skill: AgentSkill) {
	const name = toSkillName(skill.name, skillId);
	const root = `skill://${skillId}/${name}`;
	const resources = skillFiles(skill, name).map((file) =>
		fileResource(`${root}/${toUriPath(file.path)}`, file),
	);
	const [skillMd] = resources;
	return {
		uri: skillMd.uri,
		frontmatter: { name, description: skill.description },
		digest: skillMd.digest,
		resources,
	};
}

type SkillEntry = ReturnType<typeof toSkillEntry>;

@Service()
export class McpSkillExtensionService {
	/**
	 * Entries by skill version id. An entry holds the digest of every file, and a version never
	 * changes, so a list reads and hashes the files of a version one time.
	 */
	private readonly entries = new LRUCache<string, SkillEntry>({
		maxSize: ENTRY_CACHE_MAX_RESOURCES,
		sizeCalculation: (entry) => entry.resources.length,
	});

	constructor(
		private readonly skillService: SkillService,
		private readonly telemetry: TelemetryProxy,
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
			return { skill: this.entryOf(found), ttlMs: 0, cacheScope: 'private' };
		});

		server.registerResource(
			'skill-file',
			new ResourceTemplate('skill://{skillId}/{name}/{+path}', { list: undefined }),
			{ description: 'A file of a skill' },
			async (uri, { skillId, name, path }) => {
				const filePath = typeof path === 'string' ? fromUriPath(path) : undefined;
				const found = await this.fileAt(user, skillId, name, filePath);
				if (!found) throw new ResourceNotFoundError(uri.href);
				const { file } = found;
				this.telemetry.track(TELEMETRY_EVENT.CONTEXT.MCP_READ_SKILL_FILE, {
					user_id: user.id,
					skill_id: found.id,
					scope: found.projectId ? 'project' : 'instance',
					project_id: found.projectId ?? undefined,
					file: file.path === SKILL_MD_PATH ? 'skill_md' : 'reference',
					...(found.origin
						? { source_provider: found.origin.provider, source_access: found.origin.access }
						: {}),
				});
				return {
					contents: [
						file.isBinary
							? { uri: uri.href, mimeType: 'application/octet-stream', blob: file.content }
							: {
									uri: uri.href,
									mimeType: /\.(md|markdown)$/i.test(file.path) ? 'text/markdown' : 'text/plain',
									text: file.content,
								},
					],
				};
			},
		);
	}

	private async list(user: User, skip: number) {
		// Keep the entries that the check found. A later read of the cache could miss them.
		const known = new Map<string, SkillEntry>();
		const page = await this.skillService.listForMcp(
			user,
			skip,
			SKILLS_MAX_PAGE_SIZE,
			(versionId) => {
				const entry = this.entries.get(versionId);
				if (entry) known.set(versionId, entry);
				return entry !== undefined;
			},
		);
		const skills = page.skills.flatMap(({ versionId, content }) => {
			const entry = known.get(versionId) ?? (content ? this.entryOf(content) : undefined);
			return entry ? [entry] : [];
		});
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

	private entryOf(content: McpSkillContent): SkillEntry {
		const cached = this.entries.get(content.versionId);
		if (cached) return cached;
		const entry = toSkillEntry(content.id, content.skill);
		this.entries.set(content.versionId, entry);
		return entry;
	}

	/** One file of a skill. Only a SKILL.md read loads the skill, because it lists every file. */
	private async fileAt(user: User, skillId: unknown, name: unknown, filePath: string | undefined) {
		if (typeof skillId !== 'string' || typeof name !== 'string' || filePath === undefined) {
			return null;
		}
		if (filePath === SKILL_MD_PATH) {
			const found = await this.skillAt(user, skillId, name);
			return found ? { ...found, file: skillFiles(found.skill, found.name)[0] } : null;
		}
		const found = await this.skillService.readFileForMcp(user, skillId, filePath);
		return found && toSkillName(found.name, skillId) === name ? found : null;
	}

	private async skillAt(user: User, skillId: unknown, name: unknown) {
		if (typeof skillId !== 'string' || typeof name !== 'string') return null;
		const content = await this.skillService.readForMcp(user, skillId);
		if (!content || toSkillName(content.skill.name, skillId) !== name) return null;
		return { ...content, name };
	}
}
