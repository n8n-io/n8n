import type { SkillListItem, SkillListResponse, SkillSourceListItem } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useRootStore } from '@n8n/stores/useRootStore';

import { useSkillsStore } from './skills.store';

const list = vi.fn();
const sources = vi.fn();
const checkSource = vi.fn();
const creators = vi.fn();
const agents = vi.fn();
const discoverSource = vi.fn();
const connectSource = vi.fn();
const sourceCredentials = vi.fn();
const sourceRepositories = vi.fn();

vi.mock('./skills.api', () => ({
	listSkillSources: async (...args: unknown[]) => await sources(...args),
	checkSkillSource: async (...args: unknown[]) => await checkSource(...args),
	getSkills: async (...args: unknown[]) => await list(...args),
	getSkillCreators: async (...args: unknown[]) => await creators(...args),
	getSkillAgents: async (...args: unknown[]) => await agents(...args),
	discoverSkillSource: async (...args: unknown[]) => await discoverSource(...args),
	connectSkillSource: async (...args: unknown[]) => await connectSource(...args),
	getSkillSourceCredentials: async (...args: unknown[]) => await sourceCredentials(...args),
	getSkillSourceRepositories: async (...args: unknown[]) => await sourceRepositories(...args),
}));

function deferred<T>() {
	let settle: (value: T) => void = () => {};
	const promise = new Promise<T>((resolve) => {
		settle = resolve;
	});
	return { promise, settle };
}

function page(name: string, count = 1): SkillListResponse {
	return { count, data: [{ id: name, name } as SkillListItem] };
}

describe('useSkillsStore', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		list.mockReset();
	});

	it('discards a superseded source response so callers cannot prune current folds with it', async () => {
		const older = deferred<SkillSourceListItem[]>();
		const newer = deferred<SkillSourceListItem[]>();
		sources.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
		const store = useSkillsStore();
		const first = store.fetchSources();
		const second = store.fetchSources();
		const current = [{ id: 'current' }] as SkillSourceListItem[];
		newer.settle(current);
		expect(await second).toBe(current);
		older.settle([]);
		expect(await first).toBeUndefined();
		expect(store.sources).toEqual(current);
		expect(sources).toHaveBeenCalledWith(useRootStore().restApiContext);
	});

	it('checks a source with the REST context and returns its result', async () => {
		const result = { updatesFound: 2, throttled: false };
		checkSource.mockResolvedValue(result);
		const store = useSkillsStore();
		expect(await store.checkSource('source-1')).toBe(result);
		expect(checkSource).toHaveBeenCalledWith(useRootStore().restApiContext, 'source-1');
	});

	it('keeps the previous sources when a read fails', async () => {
		const store = useSkillsStore();
		store.sources = [{ id: 'current' }] as SkillSourceListItem[];
		sources.mockRejectedValueOnce(new Error('unavailable'));
		await expect(store.fetchSources()).rejects.toThrow('unavailable');
		expect(store.sources.map(({ id }) => id)).toEqual(['current']);
	});

	it('stores grouped page metadata and clears it for an ungrouped list', async () => {
		const store = useSkillsStore();
		list.mockResolvedValueOnce({ ...page('a'), page: 2, pageCount: 3, collapsedSources: [] });
		await store.fetchSkills({ groupBy: 'source' });
		expect(store.page).toBe(2);
		expect(store.pageCount).toBe(3);
		list.mockResolvedValueOnce(page('a'));
		await store.fetchSkills();
		expect(store.pageCount).toBeUndefined();
	});

	it('keeps the newest list when an older request answers last', async () => {
		const older = deferred<SkillListResponse>();
		const newer = deferred<SkillListResponse>();
		list.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
		const store = useSkillsStore();

		const first = store.fetchSkills({ search: 'b' });
		const second = store.fetchSkills({ search: 'brand' });
		newer.settle(page('brand-voice', 1));
		await second;
		older.settle(page('bulk-skill', 9));
		await first;

		expect(store.skills.map((skill) => skill.name)).toEqual(['brand-voice']);
		expect(store.count).toBe(1);
		expect(store.loading).toBe(false);
	});

	it('stays loading until the newest request answers', async () => {
		const older = deferred<SkillListResponse>();
		const newer = deferred<SkillListResponse>();
		list.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
		const store = useSkillsStore();

		const first = store.fetchSkills();
		const second = store.fetchSkills();
		older.settle(page('a'));
		await first;

		expect(store.loading).toBe(true);
		newer.settle(page('b'));
		await second;
		expect(store.loading).toBe(false);
	});

	it('asks for one row for the overview count', async () => {
		list.mockResolvedValue(page('a', 7));
		const store = useSkillsStore();

		await store.fetchSkillCount();

		expect(list).toHaveBeenCalledWith(expect.anything(), { take: 1 });
		expect(store.count).toBe(7);
	});

	it('reads the creators for the creator filter without touching the list', async () => {
		const ada = { id: 'u1', email: 'ada@example.com', firstName: 'Ada', lastName: null };
		creators.mockResolvedValue([ada]);
		const store = useSkillsStore();

		expect(await store.fetchCreators()).toEqual([ada]);
		expect(list).not.toHaveBeenCalled();
		expect(store.loading).toBe(false);
	});

	it('reads a GitHub link with the REST context', async () => {
		const payload = { url: 'https://github.com/acme/skills', scope: 'instance' as const };
		const answer = { skills: [] };
		discoverSource.mockResolvedValue(answer);
		const store = useSkillsStore();

		expect(await store.discoverSource(payload)).toBe(answer);
		expect(discoverSource).toHaveBeenCalledWith(useRootStore().restApiContext, payload);
	});

	it('connects a GitHub link with the REST context', async () => {
		const payload = {
			url: 'https://github.com/acme/skills',
			scope: 'project' as const,
			projectId: 'team-1',
			skillKeys: ['skills/pdf'],
		};
		const answer = { sourceId: 'src-1', imported: [], failed: [] };
		connectSource.mockResolvedValue(answer);
		const store = useSkillsStore();

		expect(await store.connectSource(payload)).toBe(answer);
		expect(connectSource).toHaveBeenCalledWith(useRootStore().restApiContext, payload);
	});

	it('lists the credentials a source scope accepts with the REST context', async () => {
		const query = { scope: 'project' as const, projectId: 'team-1' };
		const answer = [{ id: 'cred-1', name: 'GitHub token', type: 'githubApi' }];
		sourceCredentials.mockResolvedValue(answer);
		const store = useSkillsStore();

		expect(await store.fetchSourceCredentials(query)).toBe(answer);
		expect(sourceCredentials).toHaveBeenCalledWith(useRootStore().restApiContext, query);
	});

	it('lists the repositories a credential can read with the REST context', async () => {
		const query = { scope: 'instance' as const, credentialId: 'cred-1' };
		const answer = { repositories: [], truncated: false };
		sourceRepositories.mockResolvedValue(answer);
		const store = useSkillsStore();

		expect(await store.fetchSourceRepositories(query)).toBe(answer);
		expect(sourceRepositories).toHaveBeenCalledWith(useRootStore().restApiContext, query);
	});

	it('searches the agents for the agent filter with the REST context', async () => {
		const bot = { id: 'agent-1', name: 'Support bot' };
		agents.mockResolvedValue([bot]);
		const store = useSkillsStore();

		expect(await store.fetchAgents({ search: 'sup', take: 5 })).toEqual([bot]);
		expect(agents).toHaveBeenCalledWith(useRootStore().restApiContext, { search: 'sup', take: 5 });
		expect(list).not.toHaveBeenCalled();
	});
});
