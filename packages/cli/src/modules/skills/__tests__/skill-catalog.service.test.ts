import { GetSkillCatalogQueryDto, SearchSkillCatalogQueryDto } from '@n8n/api-types';
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
					category: 'documents',
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

	const page = (records: unknown[]) =>
		`<script>self.__next_f.push(${JSON.stringify([1, `3:["$","$L4",null,${JSON.stringify({ initialSkills: records })}]\n`])})</script>`;
	const snapshot = {
		hash: 'snapshot-hash',
		files: [
			{
				path: 'SKILL.md',
				content:
					'---\nname: pdf\ndescription: Read PDF documents\nlicense: See LICENSE.txt\ncompatibility: Requires Python\n---\nExtract text from a PDF.',
			},
			{ path: 'references/guide.md', content: 'Read the guide.' },
			{ path: 'scripts/read.py', content: 'print("example")' },
			{ path: 'LICENSE.txt', content: 'Example license terms' },
		],
	};

	it('loads and coalesces the popular leaderboard without using search results as rankings', async () => {
		const request = nock('https://www.skills.sh')
			.get('/')
			.reply(200, page([{ ...record, isOfficial: true }]));
		const [first, second] = await Promise.all([
			service.browse(user, 'popular'),
			service.browse(user, 'popular'),
		]);
		expect(first).toEqual(second);
		expect(first).toMatchObject({
			view: 'popular',
			items: [{ id: record.id, installs: 42, category: 'documents', isOfficial: true }],
		});
		expect(request.isDone()).toBe(true);
	});

	it('preserves the order and metric of the trending feed', async () => {
		nock('https://www.skills.sh')
			.get('/trending')
			.reply(200, page([record, { ...record, name: 'design', skillId: 'design', installs: 9 }]));
		const result = await service.browse(user, 'trending');
		expect(result.view).toBe('trending');
		expect(result.items.map(({ installs }) => installs)).toEqual([42, 9]);
	});

	it('reports a changed leaderboard page instead of silently showing no skills', async () => {
		nock('https://www.skills.sh').get('/').reply(200, '<html>Unavailable</html>');
		await expect(service.browse(user, 'popular')).rejects.toMatchObject({ reason: 'unreachable' });
	});

	it('returns a small card summary and reuses its downloaded snapshot for detail', async () => {
		const download = nock('https://www.skills.sh')
			.get(`/api/download/${record.id}`)
			.reply(200, snapshot);
		expect(await service.metadata(user, record.id)).toEqual({
			id: record.id,
			name: 'pdf',
			description: 'Read PDF documents',
			category: 'documents',
		});
		nock('https://api.github.com')
			.get('/repos/acme/skills')
			.reply(200, {
				stargazers_count: 12,
				pushed_at: '2026-11-12T10:00:00Z',
				archived: false,
				topics: ['pdf'],
			});
		nock('https://www.skills.sh')
			.get(`/api/v1/skills/audit/${record.id}`)
			.reply(200, {
				audits: [
					{
						provider: 'Example scanner',
						status: 'warn',
						summary: 'Review required',
						auditedAt: '2026-11-12T10:00:00Z',
					},
				],
			});
		const detail = await service.detail(user, record.id);
		expect(download.isDone()).toBe(true);
		expect(detail).toMatchObject({
			instructions: 'Extract text from a PDF.',
			license: 'See LICENSE.txt',
			compatibility: 'Requires Python',
			repository: { stars: 12 },
			audits: [{ status: 'warn' }],
		});
		expect(detail.files.filter(({ supported }) => !supported).map(({ path }) => path)).toEqual([
			'scripts/read.py',
			'LICENSE.txt',
		]);
	});

	it('keeps skill details usable when repository metadata or audits are unavailable', async () => {
		nock('https://www.skills.sh').get(`/api/download/${record.id}`).reply(200, snapshot);
		nock('https://api.github.com').get('/repos/acme/skills').reply(403);
		nock('https://www.skills.sh').get(`/api/v1/skills/audit/${record.id}`).reply(401);
		const detail = await service.detail(user, record.id);
		expect(detail.description).toBe('Read PDF documents');
		expect(detail.audits).toBeUndefined();
		expect(detail.repository).toBeUndefined();
	});

	it('does not serve a cached listing after the feature is disabled', async () => {
		nock('https://www.skills.sh')
			.get('/')
			.reply(200, page([record]));
		await service.browse(user, 'popular');
		gate.assertEnabled.mockRejectedValue(new Error('Not found'));
		await expect(service.browse(user, 'popular')).rejects.toThrow('Not found');
	});

	it.each([
		'../secrets',
		'acme/skills/../../secret',
		'acme/skills/pdf?extra=true',
		'https://evil.test/path',
	])('rejects unsafe catalog identity %s', (id) => {
		expect(GetSkillCatalogQueryDto.safeParse({ id }).success).toBe(false);
	});
});
