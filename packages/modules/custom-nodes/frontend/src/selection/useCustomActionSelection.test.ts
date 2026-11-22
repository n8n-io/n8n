import { CUSTOM_ACTION_RESOURCE_VALUE } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';

import * as api from '../custom-nodes.api';
import { useCustomNodesStore } from '../custom-nodes.store';
import { createAction, createNode, createParentAction } from '../custom-nodes.test.utils';
import { useCustomActionSelection } from './useCustomActionSelection';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'ref' } }),
}));

const flushPromises = async () => await new Promise((resolve) => setTimeout(resolve, 0));

const version = (n: number, pinValues: Record<string, string>) => ({
	version: n,
	currentRevision: 1,
	revisionCount: 1,
	createdAt: '2026-01-01T00:00:00.000Z',
	pinValues,
});

const nodePin = (n: number) => ({
	operation: `action-1@${n}`,
	customActionId: 'action-1',
	customActionName: 'Get weather',
});

const parentPin = (n: number) => ({
	resource: CUSTOM_ACTION_RESOURCE_VALUE,
	operation: `parent-action-1@${n}`,
	customActionId: 'parent-action-1',
	customActionName: 'Archive channel',
});

const customNode = createNode({
	nodeType: 'n8n-custom.acme',
	actions: [
		createAction({
			name: 'Get weather',
			newestVersion: 2,
			versions: [version(1, nodePin(1)), version(2, nodePin(2))],
		}),
	],
});

const parentAction = createParentAction({
	parentNodeType: 'n8n-nodes-base.slack',
	newestVersion: 1,
	versions: [version(1, parentPin(1))],
});

describe('useCustomActionSelection', () => {
	let listNodes: ReturnType<typeof vi.spyOn>;
	let listParentActions: ReturnType<typeof vi.spyOn>;

	const setup = ({
		active = true,
		scopes = ['customNode:list'],
	}: { active?: boolean; scopes?: Scope[] } = {}) => {
		useSettingsStore().settings.activeModules = active ? ['custom-nodes'] : [];
		useRBACStore().setGlobalScopes(scopes);
		return useCustomActionSelection();
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
		listNodes = vi.spyOn(api, 'listCustomNodes').mockResolvedValue([customNode]);
		listParentActions = vi.spyOn(api, 'listParentCustomActions').mockResolvedValue([parentAction]);
	});

	describe('pinValuesFor', () => {
		it('returns the pin values of the custom node version that the operation selects', async () => {
			const selection = setup();
			selection.pinValuesFor('n8n-custom.acme', {});
			await flushPromises();

			expect(selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' })).toEqual(
				nodePin(1),
			);
			expect(selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@2' })).toEqual(
				nodePin(2),
			);
		});

		it('returns the pin values of a parent action, with the resource', async () => {
			const selection = setup();
			selection.pinValuesFor('n8n-nodes-base.slack', {});
			await flushPromises();

			expect(
				selection.pinValuesFor('n8n-nodes-base.slack', { operation: 'parent-action-1@1' }),
			).toEqual(parentPin(1));
		});

		it('returns undefined for a built-in operation, another node type, or no operation', async () => {
			const selection = setup();
			selection.pinValuesFor('n8n-custom.acme', {});
			await flushPromises();

			expect(selection.pinValuesFor('n8n-nodes-base.slack', { operation: 'archive' })).toBe(
				undefined,
			);
			expect(selection.pinValuesFor('n8n-nodes-base.slack', { operation: 'action-1@1' })).toBe(
				undefined,
			);
			expect(selection.pinValuesFor('n8n-custom.acme', {})).toBe(undefined);
			expect(selection.pinValuesFor('n8n-custom.acme', { operation: 1 })).toBe(undefined);
		});

		it('returns a copy, so a caller cannot change the store', async () => {
			const selection = setup();
			selection.pinValuesFor('n8n-custom.acme', {});
			await flushPromises();

			const values = selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' });
			if (values) values.operation = 'changed';

			expect(selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' })).toEqual(
				nodePin(1),
			);
		});
	});

	describe('newestPinValuesFor', () => {
		it('returns the newest version when the node uses an older version', async () => {
			const selection = setup();
			selection.newestPinValuesFor('n8n-custom.acme', {});
			await flushPromises();

			expect(selection.newestPinValuesFor('n8n-custom.acme', { operation: 'action-1@1' })).toEqual(
				nodePin(2),
			);
		});

		it('returns undefined on the newest version, for an unknown operation, or for no operation', async () => {
			const selection = setup();
			selection.newestPinValuesFor('n8n-custom.acme', {});
			await flushPromises();

			expect(selection.newestPinValuesFor('n8n-custom.acme', { operation: 'action-1@2' })).toBe(
				undefined,
			);
			expect(selection.newestPinValuesFor('n8n-custom.acme', { operation: 'gone@1' })).toBe(
				undefined,
			);
			expect(selection.newestPinValuesFor('n8n-custom.acme', {})).toBe(undefined);
		});
	});

	describe('actionNameFor', () => {
		it('returns the name of a known custom action', async () => {
			const selection = setup();
			selection.actionNameFor({});
			await flushPromises();

			expect(selection.actionNameFor({ operation: 'action-1@1' })).toBe('Get weather');
			expect(
				selection.actionNameFor({
					resource: CUSTOM_ACTION_RESOURCE_VALUE,
					operation: 'parent-action-1@1',
				}),
			).toBe('Archive channel');
		});

		it('returns the stored name when the custom action is not known', async () => {
			const selection = setup();
			selection.actionNameFor({});
			await flushPromises();

			expect(
				selection.actionNameFor({
					resource: CUSTOM_ACTION_RESOURCE_VALUE,
					operation: 'deleted@1',
					customActionName: 'Old action',
				}),
			).toBe('Old action');
		});

		it('returns undefined for a built-in selection', async () => {
			const selection = setup();
			selection.actionNameFor({});
			await flushPromises();

			expect(
				selection.actionNameFor({
					resource: 'channel',
					operation: 'archive',
					customActionName: 'x',
				}),
			).toBe(undefined);
		});
	});

	describe('loading', () => {
		it('loads the custom actions once', async () => {
			const selection = setup();

			selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' });
			selection.newestPinValuesFor('n8n-custom.acme', { operation: 'action-1@1' });
			selection.actionNameFor({ operation: 'action-1@1' });
			await flushPromises();
			selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' });
			useCustomActionSelection().actionNameFor({});

			expect(listNodes).toHaveBeenCalledTimes(1);
			expect(listParentActions).toHaveBeenCalledTimes(1);
		});

		it('does nothing and loads nothing when the module is not active', async () => {
			const selection = setup({ active: false });
			useCustomNodesStore().nodes = [customNode];

			expect(selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' })).toBe(
				undefined,
			);
			expect(selection.newestPinValuesFor('n8n-custom.acme', { operation: 'action-1@1' })).toBe(
				undefined,
			);
			expect(selection.actionNameFor({ operation: 'action-1@1' })).toBe(undefined);
			await flushPromises();

			expect(listNodes).not.toHaveBeenCalled();
		});

		it('loads nothing for a user without customNode:list', async () => {
			const selection = setup({ scopes: [] });

			expect(selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' })).toBe(
				undefined,
			);
			await flushPromises();

			expect(listNodes).not.toHaveBeenCalled();
		});

		it('does not throw when the load fails', async () => {
			listNodes.mockRejectedValue(new Error('offline'));
			const selection = setup();

			expect(selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' })).toBe(
				undefined,
			);
			await flushPromises();

			expect(selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' })).toBe(
				undefined,
			);
		});
	});

	describe('store refresh', () => {
		it('reloads the lists after a load', async () => {
			const selection = setup();
			selection.pinValuesFor('n8n-custom.acme', {});
			await flushPromises();

			await useCustomNodesStore().refresh();

			expect(listNodes).toHaveBeenCalledTimes(2);
		});

		it('loads nothing when nothing was loaded before', async () => {
			setup();

			await useCustomNodesStore().refresh();

			expect(listNodes).not.toHaveBeenCalled();
		});

		it('keeps the old lists when the reload fails', async () => {
			const selection = setup();
			selection.pinValuesFor('n8n-custom.acme', {});
			await flushPromises();
			listNodes.mockRejectedValue(new Error('offline'));

			await expect(useCustomNodesStore().refresh()).resolves.toBeUndefined();

			expect(selection.pinValuesFor('n8n-custom.acme', { operation: 'action-1@1' })).toEqual(
				nodePin(1),
			);
		});
	});
});
