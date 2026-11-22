import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';

import * as api from '../custom-nodes.api';
import { createNode } from '../custom-nodes.test.utils';
import { useCustomNodeEntryPoints } from './useCustomNodeEntryPoints';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'ref' } }),
}));

const flushPromises = async () => await new Promise((resolve) => setTimeout(resolve, 0));

const customNode = createNode({ id: 'node-1', nodeType: 'n8n-custom.acme' });

describe('useCustomNodeEntryPoints', () => {
	let listNodes: ReturnType<typeof vi.spyOn>;
	let listParents: ReturnType<typeof vi.spyOn>;

	const setup = ({
		active = true,
		scopes = ['customNode:list', 'customNode:create', 'customNode:update'],
	}: { active?: boolean; scopes?: Scope[] } = {}) => {
		useSettingsStore().settings.activeModules = active ? ['custom-nodes'] : [];
		useRBACStore().setGlobalScopes(scopes);
		return useCustomNodeEntryPoints();
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
		listNodes = vi.spyOn(api, 'listCustomNodes').mockResolvedValue([customNode]);
		vi.spyOn(api, 'listParentCustomActions').mockResolvedValue([]);
		listParents = vi
			.spyOn(api, 'listCustomActionParents')
			.mockResolvedValue([{ nodeType: 'n8n-nodes-base.slack', shape: 'resource' }]);
	});

	describe('canCreate', () => {
		it('is true with the module active and the create scope', () => {
			expect(setup().canCreate()).toBe(true);
		});

		it('is false without the create scope', () => {
			expect(setup({ scopes: ['customNode:list'] }).canCreate()).toBe(false);
		});

		it('is false with the module off', () => {
			expect(setup({ active: false }).canCreate()).toBe(false);
		});
	});

	describe('addActionDataFor', () => {
		it('returns the parent node type for a parent from the parent list', async () => {
			const entryPoints = setup();
			entryPoints.addActionDataFor('n8n-nodes-base.slack');
			await flushPromises();

			expect(entryPoints.addActionDataFor('n8n-nodes-base.slack')).toEqual({
				mode: 'create',
				parentNodeType: 'n8n-nodes-base.slack',
			});
		});

		it('returns the custom node id for a custom node', async () => {
			const entryPoints = setup();
			entryPoints.addActionDataFor('n8n-custom.acme');
			await flushPromises();

			expect(entryPoints.addActionDataFor('n8n-custom.acme')).toEqual({
				mode: 'create',
				customNodeId: 'node-1',
			});
		});

		it('returns undefined for a node that is not in the parent list', async () => {
			const entryPoints = setup();
			entryPoints.addActionDataFor('n8n-nodes-base.set');
			await flushPromises();

			expect(entryPoints.addActionDataFor('n8n-nodes-base.set')).toBeUndefined();
		});

		it('loads the lists once', async () => {
			const entryPoints = setup();
			entryPoints.addActionDataFor('n8n-nodes-base.slack');
			entryPoints.addActionDataFor('n8n-nodes-base.set');
			await flushPromises();
			entryPoints.addActionDataFor('n8n-nodes-base.slack');
			await flushPromises();

			expect(listParents).toHaveBeenCalledTimes(1);
			expect(listNodes).toHaveBeenCalledTimes(1);
		});

		it('returns undefined for a custom node without the update scope', async () => {
			const entryPoints = setup({ scopes: ['customNode:list', 'customNode:create'] });
			entryPoints.addActionDataFor('n8n-custom.acme');
			await flushPromises();

			expect(entryPoints.addActionDataFor('n8n-custom.acme')).toBeUndefined();
			expect(entryPoints.addActionDataFor('n8n-nodes-base.slack')).toEqual({
				mode: 'create',
				parentNodeType: 'n8n-nodes-base.slack',
			});
		});

		it('returns the custom node id with the update scope and no create scope', async () => {
			const entryPoints = setup({ scopes: ['customNode:list', 'customNode:update'] });
			entryPoints.addActionDataFor('n8n-custom.acme');
			await flushPromises();

			expect(entryPoints.addActionDataFor('n8n-custom.acme')).toEqual({
				mode: 'create',
				customNodeId: 'node-1',
			});
			expect(entryPoints.addActionDataFor('n8n-nodes-base.slack')).toBeUndefined();
			expect(listParents).not.toHaveBeenCalled();
		});

		it.each<[string, { active?: boolean; scopes?: Scope[] }]>([
			['the module is off', { active: false }],
			['the user has no create or update scope', { scopes: ['customNode:list'] }],
			['the user has no list scope', { scopes: ['customNode:create', 'customNode:update'] }],
		])('returns undefined and loads nothing when %s', async (_name, options) => {
			const entryPoints = setup(options);

			expect(entryPoints.addActionDataFor('n8n-nodes-base.slack')).toBeUndefined();
			await flushPromises();

			expect(listParents).not.toHaveBeenCalled();
			expect(listNodes).not.toHaveBeenCalled();
		});
	});
});
