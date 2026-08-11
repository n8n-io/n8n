import { LockService } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { CacheService } from '@/services/cache/cache.service';

import { CallbackStore } from '../callback-store';

async function createCache(): Promise<CacheService> {
	const globalConfig = mock<GlobalConfig>({
		cache: {
			backend: 'memory',
			memory: { maxSize: 10 * 1024 * 1024, ttl: 60_000 },
			redis: { prefix: 'cache', ttl: 60_000 },
		},
		executions: { mode: 'regular' },
		redis: { prefix: 'n8n' },
	} as GlobalConfig);
	const cache = new CacheService(globalConfig);
	await cache.init();
	return cache;
}

function createLockService(): LockService {
	return Container.get(LockService);
}

describe('CallbackStore', () => {
	it('resolves a key written by another same-scope instance sharing the cache', async () => {
		const cache = await createCache();
		const lockService = createLockService();
		const writer = new CallbackStore(cache, lockService, 'agent-1:discord:cred-1');
		const reader = new CallbackStore(cache, lockService, 'agent-1:discord:cred-1');

		const key = await writer.store('resume:run:tool:0', '{"approved":true}', {
			kind: 'approval',
		});

		await expect(reader.resolve(key)).resolves.toEqual({
			actionId: 'resume:run:tool:0',
			value: '{"approved":true}',
			kind: 'approval',
		});
	});

	it('does not resolve a key from a different scope', async () => {
		const cache = await createCache();
		const lockService = createLockService();
		const writer = new CallbackStore(cache, lockService, 'agent-1:discord:cred-1');
		const otherScope = new CallbackStore(cache, lockService, 'agent-2:discord:cred-1');

		const key = await writer.store('resume:run:tool:0', 'yes');

		await expect(otherScope.resolve(key)).resolves.toBeUndefined();
		await expect(writer.resolve(key)).resolves.toMatchObject({
			actionId: 'resume:run:tool:0',
			value: 'yes',
		});
	});

	it('invalidates sibling callbacks when one group member is resolved', async () => {
		const cache = await createCache();
		const lockService = createLockService();
		const store = new CallbackStore(cache, lockService, 'agent-1:discord:cred-1');

		const approveKey = await store.store('resume:run:tool:0', '{"approved":true}', {
			groupId: 'card-1',
		});
		const declineKey = await store.store('resume:run:tool:1', '{"approved":false}', {
			groupId: 'card-1',
		});

		await expect(store.resolve(approveKey)).resolves.toMatchObject({
			value: '{"approved":true}',
			groupId: 'card-1',
		});
		await expect(store.resolve(declineKey)).resolves.toBeUndefined();
	});

	it('cannot resolve a consumed key again', async () => {
		const cache = await createCache();
		const lockService = createLockService();
		const store = new CallbackStore(cache, lockService, 'agent-1:telegram:cred-1');

		const key = await store.store('resume:run:tool:0', 'once');
		await expect(store.resolve(key)).resolves.toMatchObject({ value: 'once' });
		await expect(store.resolve(key)).resolves.toBeUndefined();
	});
});
