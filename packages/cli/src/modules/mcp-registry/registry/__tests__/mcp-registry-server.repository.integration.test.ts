import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { McpRegistryServerRepository } from '../mcp-registry-server.repository';

beforeAll(async () => {
	await testModules.loadModules(['mcp-registry']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

it('keeps the latest fetch for each slug', async () => {
	const repository = Container.get(McpRegistryServerRepository);
	const row = {
		slug: 'upsert-fetched-servers-test',
		status: 'active' as const,
		version: '1',
		registryUpdatedAt: new Date('2026-01-01T00:00:00Z'),
		data: {
			name: 'sample',
			title: 'Sample',
			tagline: '',
			description: '',
			authType: 'none',
			origin: 'registry',
			isOfficial: false,
			icons: [],
			remotes: [],
			tools: [],
		},
	};
	const first = new Date('2026-01-02T00:00:00Z');
	const second = new Date('2026-01-03T00:00:00Z');

	await repository.upsertFetchedServers([row], second);
	await repository.upsertFetchedServers([{ ...row, version: 'stale' }], first);
	await repository.upsertFetchedServers([{ ...row, version: 'same' }], second);
	expect((await repository.findOneByOrFail({ slug: row.slug })).version).toBe('1');

	await repository.upsertFetchedServers(
		[{ ...row, version: '2' }],
		new Date('2026-01-04T00:00:00Z'),
	);
	expect((await repository.findOneByOrFail({ slug: row.slug })).version).toBe('2');
});
