import type { SkillCatalogItem, SkillCatalogResponse } from '@n8n/api-types';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { SkillSyncFlagGate } from './skill-sync-flag-gate';
import { SkillSourceRequestError } from '../errors/skill-source-request.error';

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
});

/** Skills.sh supplies discovery. The GitHub source client still reads all imported content. */
@Service()
export class SkillCatalogService {
	private readonly http: HttpRequestClient;

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
		const items: SkillCatalogItem[] = [];
		const seen = new Set<string>();
		for (const record of parsed.data.skills) {
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
			});
		}
		return { items: items.slice(0, 24), fetchedAt: new Date().toISOString() };
	}
}
