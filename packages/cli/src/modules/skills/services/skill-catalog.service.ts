import type {
	SkillCatalogDetail,
	SkillCatalogItem,
	SkillCatalogMetadata,
	SkillCatalogResponse,
	SkillCatalogSummary,
	SkillCatalogView,
} from '@n8n/api-types';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { LRUCache } from 'lru-cache';
import pLimit from 'p-limit';
import { z } from 'zod';

import { SkillSyncFlagGate } from './skill-sync-flag-gate';
import { SkillSourceRequestError } from '../errors/skill-source-request.error';
import { categorizeSkill, readPublicLeaderboard } from '../utils/skill-catalog';
import { normalizePath, readSkillFolder } from '../utils/skill-md';

const searchResponseSchema = z.object({ skills: z.array(z.unknown()).max(200) });
const catalogRecordSchema = z.object({
	id: z.string().max(512),
	name: z.string().min(1).max(128),
	skillId: z
		.string()
		.regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)
		.max(128),
	source: z
		.string()
		.regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9_][a-zA-Z0-9._-]*$/)
		.max(256),
	installs: z.number().int().nonnegative().safe(),
	isOfficial: z.boolean().optional(),
});

const downloadSchema = z.object({
	hash: z.string().max(128).optional(),
	files: z
		.array(
			z.object({
				path: z.string().max(1024),
				content: z.string().max(262_144).optional(),
				contents: z.string().max(262_144).optional(),
			}),
		)
		.max(256),
});
const auditsSchema = z.object({
	audits: z
		.array(
			z.object({
				provider: z.string().max(128),
				status: z.string().max(32),
				summary: z.string().max(4000),
				auditedAt: z.string().datetime({ offset: true }),
			}),
		)
		.max(20),
});
const repositorySchema = z.object({
	stargazers_count: z.number().int().nonnegative(),
	topics: z.array(z.string().max(128)).max(100).default([]),
	pushed_at: z.string().datetime({ offset: true }),
	archived: z.boolean(),
});

/** Skills.sh supplies discovery. The GitHub source client still reads all imported content. */
@Service()
export class SkillCatalogService {
	private readonly http: HttpRequestClient;
	private readonly requests = pLimit(4);
	private readonly browseCache = new LRUCache<SkillCatalogView, SkillCatalogResponse>({
		max: 2,
		ttl: 60_000,
		fetchMethod: async (view) => await this.readBrowse(view),
	});
	private readonly metadataCache = new LRUCache<string, SkillCatalogMetadata>({
		max: 100,
		maxSize: 16 * 1024 * 1024,
		ttl: 15 * 60_000,
		sizeCalculation: (value) => Buffer.byteLength(JSON.stringify(value)),
		fetchMethod: async (id) => await this.readMetadata(id),
	});
	private readonly detailCache = new LRUCache<string, SkillCatalogDetail>({
		max: 30,
		maxSize: 8 * 1024 * 1024,
		ttl: 15 * 60_000,
		sizeCalculation: (value) => Buffer.byteLength(JSON.stringify(value)),
		fetchMethod: async (id) => await this.readDetail(id),
	});
	private readonly repositoryCache = new LRUCache<string, z.infer<typeof repositorySchema>>({
		max: 100,
		ttl: 60 * 60_000,
		fetchMethod: async (source) =>
			repositorySchema.parse(await this.get(`https://api.github.com/repos/${source}`)),
	});

	constructor(
		outboundHttp: OutboundHttp,
		private readonly flagGate: SkillSyncFlagGate,
	) {
		this.http = outboundHttp.requests({ timeout: 10_000, headers: { 'User-Agent': 'n8n' } });
	}

	async search(user: User, query: string): Promise<SkillCatalogResponse> {
		await this.flagGate.assertEnabled(user);
		let response;
		try {
			response = await this.http.request<unknown>({
				method: 'GET',
				url: 'https://www.skills.sh/api/search',
				qs: { q: query, limit: 24 },
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				disableFollowRedirect: true,
				maxResponseBodyBytes: 1_048_576,
			});
		} catch (cause) {
			throw new SkillSourceRequestError('unreachable', 'Could not reach Skills.sh.', { cause });
		}
		if (response.statusCode === 429) {
			throw new SkillSourceRequestError('rate_limited', 'Skills.sh is busy. Try again later.');
		}
		const parsed = searchResponseSchema.safeParse(response.body);
		if (response.statusCode !== 200 || !parsed.success) {
			throw new SkillSourceRequestError('unreachable', 'Could not read the Skills.sh catalog.');
		}
		return {
			items: this.records(parsed.data.skills).slice(0, 24),
			fetchedAt: new Date().toISOString(),
		};
	}

	async browse(user: User, view: SkillCatalogView): Promise<SkillCatalogResponse> {
		await this.flagGate.assertEnabled(user);
		const result = await this.browseCache.fetch(view);
		if (!result)
			throw new SkillSourceRequestError('unreachable', 'Could not read the Skills.sh catalog.');
		return result;
	}

	async metadata(user: User, id: string): Promise<SkillCatalogSummary> {
		await this.flagGate.assertEnabled(user);
		const { name, description, category } = await this.cachedMetadata(id);
		return { id, name, description, category };
	}

	async detail(user: User, id: string): Promise<SkillCatalogDetail> {
		await this.flagGate.assertEnabled(user);
		const result = await this.detailCache.fetch(id);
		if (!result) throw new SkillSourceRequestError('unreachable', 'Could not read this skill.');
		return result;
	}

	private async readBrowse(view: SkillCatalogView): Promise<SkillCatalogResponse> {
		const html = await this.get(
			`https://www.skills.sh${view === 'trending' ? '/trending' : '/'}`,
			false,
		);
		try {
			if (typeof html !== 'string') throw new Error('Missing page');
			const records = readPublicLeaderboard(html);
			const items = this.records(
				records.map((record) => {
					const parsed = catalogRecordSchema.omit({ id: true }).safeParse(record);
					return parsed.success
						? { ...parsed.data, id: `${parsed.data.source}/${parsed.data.skillId}` }
						: record;
				}),
			);
			if (!items.length) throw new Error('Missing leaderboard');
			return { items, view, fetchedAt: new Date().toISOString() };
		} catch (cause) {
			throw new SkillSourceRequestError(
				'unreachable',
				'Could not read the Skills.sh leaderboard.',
				{ cause },
			);
		}
	}

	private records(records: unknown[]): SkillCatalogItem[] {
		const items: SkillCatalogItem[] = [];
		const seen = new Set<string>();
		for (const record of records) {
			const result = catalogRecordSchema.safeParse(record);
			if (!result.success) continue;
			const { id, name, skillId: slug, source, installs } = result.data;
			if (id !== `${source}/${slug}` || seen.has(id)) continue;
			seen.add(id);
			items.push({
				id,
				name,
				slug,
				source,
				installs,
				githubUrl: `https://github.com/${source}`,
				catalogUrl: `https://skills.sh/${id}`,
				category: categorizeSkill(name),
				...(result.data.isOfficial ? { isOfficial: true } : {}),
			});
		}
		return items;
	}

	private async cachedMetadata(id: string): Promise<SkillCatalogMetadata> {
		const result = await this.metadataCache.fetch(id);
		if (!result) throw new SkillSourceRequestError('unreachable', 'Could not read this skill.');
		return result;
	}

	private async readMetadata(id: string): Promise<SkillCatalogMetadata> {
		try {
			const data = downloadSchema.parse(await this.get(`https://www.skills.sh/api/download/${id}`));
			const files = data.files.flatMap((file) => {
				const content = file.content ?? file.contents;
				return content === undefined ? [] : [{ path: normalizePath(file.path), content }];
			});
			const { content, skippedFiles } = readSkillFolder(id.split('/')[2], files);
			const frontmatter = content.frontmatter ?? {};
			const field = (key: string) =>
				typeof frontmatter[key] === 'string' ? frontmatter[key].slice(0, 2000) : undefined;
			return {
				id,
				name: content.name,
				description: content.description,
				category: categorizeSkill(content.name, content.description),
				instructions: content.instructions,
				files: files.map((file) => ({ ...file, supported: !skippedFiles.includes(file.path) })),
				license: field('license'),
				compatibility: field('compatibility'),
				allowedTools: field('allowed-tools'),
				hash: data.hash,
				fetchedAt: new Date().toISOString(),
			};
		} catch (cause) {
			if (cause instanceof SkillSourceRequestError) throw cause;
			throw new SkillSourceRequestError('unreachable', 'Could not read this skill snapshot.', {
				cause,
			});
		}
	}

	private async readDetail(id: string): Promise<SkillCatalogDetail> {
		const metadata = await this.cachedMetadata(id);
		const source = id.split('/').slice(0, 2).join('/');
		const [repository, audits] = await Promise.allSettled([
			this.repositoryCache.fetch(source),
			this.get(`https://www.skills.sh/api/v1/skills/audit/${id}`).then(
				(data) => auditsSchema.parse(data).audits,
			),
		]);
		const repo = repository.status === 'fulfilled' ? repository.value : undefined;
		return {
			...metadata,
			...(repo
				? {
						repository: {
							stars: repo.stargazers_count,
							topics: repo.topics,
							updatedAt: repo.pushed_at,
							archived: repo.archived,
						},
					}
				: {}),
			...(audits.status === 'fulfilled' ? { audits: audits.value } : {}),
		};
	}

	private async get(url: string, json = true): Promise<unknown> {
		return await this.requests(async () => {
			try {
				const response = await this.http.request<unknown>({
					method: 'GET',
					url,
					json,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
					disableFollowRedirect: true,
					maxResponseBodyBytes: 2 * 1024 * 1024,
				});
				if (response.statusCode === 429)
					throw new SkillSourceRequestError(
						'rate_limited',
						'The catalog is busy. Try again later.',
					);
				if (response.statusCode !== 200)
					throw new SkillSourceRequestError('unreachable', 'Could not read the catalog.');
				return response.body;
			} catch (cause) {
				if (cause instanceof SkillSourceRequestError) throw cause;
				throw new SkillSourceRequestError('unreachable', 'Could not reach the catalog.', { cause });
			}
		});
	}
}
