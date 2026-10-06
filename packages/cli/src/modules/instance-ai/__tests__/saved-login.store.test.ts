import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { JsonFileSavedLoginStore } from '../browser/saved-login.store';

const cipher = {
	encrypt: async (value: string) => await Promise.resolve(`enc:${value}`),
	decrypt: async (value: string) => await Promise.resolve(value.replace(/^enc:/, '')),
};

describe('JsonFileSavedLoginStore', () => {
	let dir: string;
	let file: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'saved-logins-'));
		file = join(dir, 'cloud-browser-saved-logins.json');
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	const login = (userId: string, site: string) => ({
		userId,
		site,
		label: site,
		region: 'us-west-2',
		contextId: `ctx-${userId}-${site}`,
	});

	it('stores the context id encrypted and returns it decrypted', async () => {
		const store = new JsonFileSavedLoginStore(file, cipher);

		const saved = await store.add(login('u1', 'example.com'));

		const onDisk = JSON.parse(await readFile(file, 'utf8')) as Array<{ contextId: string }>;
		expect(onDisk[0].contextId).toBe('enc:ctx-u1-example.com');
		expect(await store.findBySite('u1', 'example.com')).toEqual(saved);
	});

	it('scopes saved logins to their user', async () => {
		const store = new JsonFileSavedLoginStore(file, cipher);
		const mine = await store.add(login('u1', 'example.com'));
		await store.add(login('u2', 'example.com'));

		expect(await store.list('u1')).toEqual([mine]);
		expect(await store.remove('u2', mine.id)).toBeUndefined();
		expect(await store.remove('u1', mine.id)).toEqual(mine);
		expect(await store.list('u1')).toEqual([]);
	});

	it('keeps every write when writes overlap', async () => {
		const store = new JsonFileSavedLoginStore(file, cipher);

		await Promise.all([
			store.add(login('u1', 'a.com')),
			store.add(login('u1', 'b.com')),
			store.add(login('u1', 'c.com')),
		]);

		expect((await store.list('u1')).map((l) => l.site).sort()).toEqual(['a.com', 'b.com', 'c.com']);
	});

	it('records when a saved login was last used and verified', async () => {
		const store = new JsonFileSavedLoginStore(file, cipher);
		const saved = await store.add(login('u1', 'example.com'));

		await store.touch(saved.id, {
			lastUsedAt: '2026-10-06T10:00:00.000Z',
			lastVerifiedAt: undefined,
		});

		const [stored] = await store.list('u1');
		expect(stored.lastUsedAt).toBe('2026-10-06T10:00:00.000Z');
		expect(stored).not.toHaveProperty('lastVerifiedAt');
	});
});
