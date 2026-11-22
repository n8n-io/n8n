import { createPinia, setActivePinia } from 'pinia';

import * as api from './custom-nodes.api';
import { useCustomNodesStore } from './custom-nodes.store';
import {
	createAction,
	createDraft,
	createNode,
	createParentAction,
} from './custom-nodes.test.utils';

const context = { baseUrl: '/rest', pushRef: 'ref' };

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: context }),
}));

describe('custom-nodes.store', () => {
	let store: ReturnType<typeof useCustomNodesStore>;
	const node = createNode();
	const parentAction = createParentAction();

	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
		store = useCustomNodesStore();
		vi.spyOn(api, 'listCustomNodes').mockResolvedValue([node]);
		vi.spyOn(api, 'listParentCustomActions').mockResolvedValue([parentAction]);
	});

	it('fetchAll loads the nodes and the parent actions', async () => {
		await store.fetchAll();

		expect(store.nodes).toEqual([node]);
		expect(store.parentActions).toEqual([parentAction]);
		expect(store.loading).toBe(false);
	});

	it('fetchParents loads the parents that can have actions', async () => {
		const parents = [{ nodeType: 'n8n-nodes-base.slack', shape: 'resource' as const }];
		const spy = vi.spyOn(api, 'listCustomActionParents').mockResolvedValue(parents);

		await store.fetchParents();

		expect(spy).toHaveBeenCalledWith(context);
		expect(store.parents).toEqual(parents);
	});

	describe('ensureParentsLoaded', () => {
		const parents = [{ nodeType: 'n8n-nodes-base.slack', shape: 'resource' as const }];
		const flushPromises = async () => await new Promise((resolve) => setTimeout(resolve, 0));

		it('loads the parents once, after the call', async () => {
			const spy = vi.spyOn(api, 'listCustomActionParents').mockResolvedValue(parents);

			store.ensureParentsLoaded();
			store.ensureParentsLoaded();
			expect(spy).not.toHaveBeenCalled();
			await flushPromises();
			store.ensureParentsLoaded();
			await flushPromises();

			expect(spy).toHaveBeenCalledTimes(1);
			expect(store.parents).toEqual(parents);
		});

		it('tries again on the next call after a failed load', async () => {
			const spy = vi
				.spyOn(api, 'listCustomActionParents')
				.mockRejectedValueOnce(new Error('offline'))
				.mockResolvedValue(parents);

			store.ensureParentsLoaded();
			await flushPromises();
			expect(store.parents).toEqual([]);

			store.ensureParentsLoaded();
			await flushPromises();

			expect(spy).toHaveBeenCalledTimes(2);
			expect(store.parents).toEqual(parents);
		});
	});

	it('fetchNode, fetchActionVersion and preview call their routes without refetching', async () => {
		const getNode = vi.spyOn(api, 'getCustomNode').mockResolvedValue(node);
		const getVersion = vi.spyOn(api, 'getCustomActionVersion').mockResolvedValue({
			version: 2,
			draft: createDraft(),
			revisions: [],
		});
		const previewSpy = vi
			.spyOn(api, 'previewCustomAction')
			.mockResolvedValue({ issues: [], properties: [] });

		await store.fetchNode('node-1');
		await store.fetchActionVersion('action-1', 2);
		await store.preview(createDraft());

		expect(getNode).toHaveBeenCalledWith(context, 'node-1');
		expect(getVersion).toHaveBeenCalledWith(context, 'action-1', 2);
		expect(previewSpy).toHaveBeenCalledWith(context, { draft: createDraft() });
		expect(api.listCustomNodes).not.toHaveBeenCalled();
	});

	it('builds the icon url from the rest context', () => {
		expect(store.iconUrl('node-1')).toBe('/rest/custom-nodes/nodes/node-1/icon');
	});

	describe('writes', () => {
		const saveDto = { draft: createDraft() };
		const cases: Array<[string, () => Promise<unknown>, () => void]> = [
			[
				'createNode',
				async () =>
					await store.createNode({
						displayName: 'Acme',
						baseUrl: 'https://api.acme.test',
						auth: { kind: 'none' },
						actions: [createDraft()],
					}),
				() => vi.spyOn(api, 'createCustomNode').mockResolvedValue(node),
			],
			[
				'updateNode',
				async () => await store.updateNode('node-1', { displayName: 'New' }),
				() => vi.spyOn(api, 'updateCustomNode').mockResolvedValue(node),
			],
			[
				'deleteNode',
				async () => await store.deleteNode('node-1'),
				() => vi.spyOn(api, 'deleteCustomNode').mockResolvedValue(),
			],
			[
				'setNodeIcon',
				async () =>
					await store.setNodeIcon('node-1', { iconDataUri: 'data:image/png;base64,AA==' }),
				() => vi.spyOn(api, 'setCustomNodeIcon').mockResolvedValue(),
			],
			[
				'addActionToNode',
				async () => await store.addActionToNode('node-1', saveDto),
				() => vi.spyOn(api, 'addCustomNodeAction').mockResolvedValue(createAction()),
			],
			[
				'addParentAction',
				async () =>
					await store.addParentAction({
						parentNodeType: 'n8n-nodes-base.slack',
						draft: createDraft(),
					}),
				() => vi.spyOn(api, 'addParentCustomAction').mockResolvedValue(parentAction),
			],
			[
				'saveAction',
				async () => await store.saveAction('action-1', saveDto),
				() =>
					vi
						.spyOn(api, 'saveCustomAction')
						.mockResolvedValue({ action: createAction(), kind: 'revision' }),
			],
			[
				'rollbackRevision',
				async () => await store.rollbackRevision('action-1', 1, { revision: 1 }),
				() => vi.spyOn(api, 'rollbackCustomActionRevision').mockResolvedValue(createAction()),
			],
			[
				'deleteAction',
				async () => await store.deleteAction('action-1'),
				() => vi.spyOn(api, 'deleteCustomAction').mockResolvedValue(),
			],
		];

		it.each(cases)('%s calls its route and then refetches the lists', async (_name, run, mock) => {
			mock();

			await run();

			expect(api.listCustomNodes).toHaveBeenCalledTimes(1);
			expect(api.listParentCustomActions).toHaveBeenCalledTimes(1);
			expect(store.nodes).toEqual([node]);
		});

		it.each(cases)('%s counts one revision', async (_name, run, mock) => {
			mock();
			expect(store.definitionsRevision).toBe(0);

			await run();

			expect(store.definitionsRevision).toBe(1);
		});

		it('does not count a revision when the write fails', async () => {
			vi.spyOn(api, 'deleteCustomNode').mockRejectedValue(new Error('nope'));

			await expect(store.deleteNode('node-1')).rejects.toThrow('nope');

			expect(store.definitionsRevision).toBe(0);
		});

		it('does not refetch when the write fails', async () => {
			vi.spyOn(api, 'deleteCustomNode').mockRejectedValue(new Error('nope'));

			await expect(store.deleteNode('node-1')).rejects.toThrow('nope');

			expect(api.listCustomNodes).not.toHaveBeenCalled();
		});

		it('passes the right arguments to the route', async () => {
			const spy = vi.spyOn(api, 'saveCustomAction').mockResolvedValue({
				action: createAction(),
				kind: 'none',
			});

			await store.saveAction('action-1', saveDto);

			expect(spy).toHaveBeenCalledWith(context, 'action-1', saveDto);
		});
	});
});
