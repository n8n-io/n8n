import { SearchSkillCatalogQueryDto } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import nock from 'nock';

import { SkillCatalogService } from '../services/skill-catalog.service';
import type { SkillSyncFlagGate } from '../services/skill-sync-flag-gate';

const user = mock<User>();
const record = {
	id: 'acme/skills/pdf',
	name: 'pdf',
	skillId: 'pdf',
	source: 'acme/skills',
	installs: 42,
};

describe('SkillCatalogService', () => {
	const gate = mock<SkillSyncFlagGate>();
	let service: SkillCatalogService;
	beforeEach(() => {
		vi.resetAllMocks();
		nock.disableNetConnect();
		service = new SkillCatalogService(Container.get(OutboundHttp), gate);
	});
	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	const search = () =>
		nock('https://www.skills.sh').get('/api/search').query({ q: 'pdf', limit: 24 });

	it('returns catalog identity and fixed source links without downloading content', async () => {
		const request = search().reply(200, { skills: [record] });
		expect(await service.search(user, 'pdf')).toEqual({
			items: [
				{
					id: record.id,
					name: 'pdf',
					slug: 'pdf',
					source: record.source,
					installs: 42,
					githubUrl: 'https://github.com/acme/skills',
					catalogUrl: 'https://skills.sh/acme/skills/pdf',
				},
			],
			fetchedAt: expect.any(String),
		});
		expect(request.isDone()).toBe(true);
	});

	it('drops unsupported sources, unsafe paths, invalid metrics, and duplicate records', async () => {
		search().reply(200, {
			skills: [
				record,
				record,
				{ ...record, id: 'another/repo/pdf' },
				{ ...record, source: 'https://evil.test' },
				{ ...record, source: 'acme/../secret' },
				{ ...record, skillId: '../secret' },
				{ ...record, installs: -1 },
			],
		});
		expect((await service.search(user, 'pdf')).items).toHaveLength(1);
	});

	it.each([401, 429, 500])(
		'reports upstream status %s without returning an empty catalog',
		async (status) => {
			search().reply(status, { error: 'upstream details' });
			await expect(service.search(user, 'pdf')).rejects.toMatchObject({
				reason: status === 429 ? 'rate_limited' : 'unreachable',
			});
		},
	);

	it('refuses a changed response shape', async () => {
		search().reply(200, { data: [record] });
		await expect(service.search(user, 'pdf')).rejects.toMatchObject({ reason: 'unreachable' });
	});

	it('does not follow redirects to another host', async () => {
		search().reply(302, '', { Location: 'https://elsewhere.test/catalog' });
		await expect(service.search(user, 'pdf')).rejects.toMatchObject({ reason: 'unreachable' });
	});

	it('limits the response body', async () => {
		search().reply(200, { skills: [record], extra: 'x'.repeat(1_048_576) });
		await expect(service.search(user, 'pdf')).rejects.toMatchObject({ reason: 'unreachable' });
	});

	it('makes no outbound request when the feature is off', async () => {
		gate.assertEnabled.mockRejectedValue(new Error('Not found'));
		await expect(service.search(user, 'pdf')).rejects.toThrow('Not found');
		expect(nock.pendingMocks()).toEqual([]);
	});

	it.each(['', 'a', 'x'.repeat(101)])('rejects an invalid query length', (query) => {
		expect(SearchSkillCatalogQueryDto.safeParse({ query }).success).toBe(false);
	});
});
