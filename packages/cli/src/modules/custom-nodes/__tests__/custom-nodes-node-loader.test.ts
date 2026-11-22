import type { Logger } from '@n8n/backend-common';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	CustomNodesNodeLoader,
	customNodeIconPath,
	customNodeTypeName,
} from '../custom-nodes-node-loader';
import type { ActionView, CustomNodeView } from '../node-description.generator';

const node: CustomNodeView = {
	id: 'cn_acme',
	displayName: 'Acme Billing',
	baseUrl: 'https://billing.acme.test/api',
	auth: { kind: 'none' },
};

const action: ActionView = {
	id: 'act_list',
	name: 'List Invoices',
	versions: [
		{
			version: 1,
			inputs: [],
			request: {
				method: 'GET',
				url: '/invoices',
				headers: {},
				query: {},
				bodyType: 'none',
				body: {},
				inputTargets: {},
			},
		},
	],
};

const descriptionOf = (loader: CustomNodesNodeLoader, id: string): INodeTypeDescription => {
	const { type } = loader.getNode(id);
	if (!('properties' in type.description)) throw new Error('Expected a non-versioned node');
	return type.description;
};

describe('CustomNodesNodeLoader', () => {
	let logger: Logger;
	let loader: CustomNodesNodeLoader;

	beforeEach(() => {
		logger = mock<Logger>();
		loader = new CustomNodesNodeLoader(logger);
	});

	it('has the package name n8n-custom and builds type names and icon paths', () => {
		expect(loader.packageName).toBe('n8n-custom');
		expect(customNodeTypeName('cn_acme')).toBe('n8n-custom.cn_acme');
		expect(customNodeIconPath('rest', 'cn_acme')).toBe('rest/custom-nodes/nodes/cn_acme/icon');
		expect(customNodeIconPath('api/v0', 'cn_acme')).toBe('api/v0/custom-nodes/nodes/cn_acme/icon');
	});

	it('serves one description and one known entry for each custom node', async () => {
		const other: CustomNodeView = { ...node, id: 'cn_other', displayName: 'Other' };
		loader.setDefinitions([
			{ node, actions: [action] },
			{ node: other, actions: [] },
		]);

		await loader.loadAll();

		expect(loader.types.nodes.map((d) => d.name)).toEqual(['cn_acme', 'cn_other']);
		expect(loader.types.credentials).toEqual([]);
		expect(Object.keys(loader.known.nodes)).toEqual(['cn_acme', 'cn_other']);
		expect(descriptionOf(loader, 'cn_acme').displayName).toBe('Acme Billing');
		expect(descriptionOf(loader, 'cn_acme').userDefinedEndpoint).toBe(true);
		expect(loader.resolveSourcePath(loader.known.nodes.cn_acme.sourcePath)).toBe('');
	});

	it('returns an INodeType without execute, so NodeTypes assigns the RoutingNode execute', async () => {
		loader.setDefinitions([{ node, actions: [action] }]);
		await loader.loadAll();

		const { type } = loader.getNode(node.id);
		expect('execute' in type && type.execute).toBeFalsy();
		expect(loader.getNode(node.id).type).not.toHaveProperty('execute');
	});

	it('throws UnrecognizedNodeTypeError for an unknown id', async () => {
		loader.setDefinitions([{ node, actions: [action] }]);
		await loader.loadAll();

		expect(() => loader.getNode('cn_unknown')).toThrow(UnrecognizedNodeTypeError);
	});

	it('rebuilds types after releaseTypes through ensureTypesLoaded', async () => {
		loader.setDefinitions([{ node, actions: [action] }]);
		await loader.loadAll();

		loader.releaseTypes();
		expect(loader.types.nodes).toEqual([]);

		await loader.ensureTypesLoaded();
		expect(loader.types.nodes.map((d) => d.name)).toEqual(['cn_acme']);
		expect(descriptionOf(loader, 'cn_acme').displayName).toBe('Acme Billing');
	});

	it('does not rebuild in ensureTypesLoaded while types are loaded', async () => {
		loader.setDefinitions([{ node, actions: [action] }]);
		await loader.loadAll();
		const before = loader.getNode(node.id).type;

		await loader.ensureTypesLoaded();

		expect(loader.getNode(node.id).type).toBe(before);
	});

	it('sets iconUrl only for a node with an icon', async () => {
		const withIcon: CustomNodeView = {
			...node,
			id: 'cn_icon',
			iconUrl: customNodeIconPath('rest', 'cn_icon'),
		};
		loader.setDefinitions([
			{ node, actions: [] },
			{ node: withIcon, actions: [] },
		]);
		await loader.loadAll();

		expect(descriptionOf(loader, 'cn_icon').iconUrl).toBe('rest/custom-nodes/nodes/cn_icon/icon');
		expect(descriptionOf(loader, 'cn_icon').icon).toBeUndefined();
		expect(descriptionOf(loader, 'cn_acme').iconUrl).toBeUndefined();
		expect(descriptionOf(loader, 'cn_acme').icon).toBe('fa:cube');
	});

	it('skips an invalid definition, logs its id, and serves the others', async () => {
		const invalid: CustomNodeView = {
			...node,
			id: 'cn_invalid',
			baseUrl: '={{ $credentials.token }}',
		};
		loader.setDefinitions([
			{ node: invalid, actions: [action] },
			{ node, actions: [action] },
		]);

		await loader.loadAll();

		expect(loader.types.nodes.map((d) => d.name)).toEqual(['cn_acme']);
		expect(Object.keys(loader.known.nodes)).toEqual(['cn_acme']);
		expect(() => loader.getNode('cn_invalid')).toThrow(UnrecognizedNodeTypeError);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ customNodeId: 'cn_invalid' }),
		);
		expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain('$credentials');

		// A rebuild of the same definitions does not log the same error again.
		loader.releaseTypes();
		await loader.ensureTypesLoaded();
		expect(logger.error).toHaveBeenCalledTimes(1);
	});

	it('ignores an action that has no versions and keeps an empty node', async () => {
		loader.setDefinitions([{ node, actions: [{ ...action, versions: [] }] }]);
		await loader.loadAll();

		expect(loader.types.nodes.map((d) => d.name)).toEqual(['cn_acme']);
	});

	it('keeps a description object unchanged for a caller that already holds it', async () => {
		loader.setDefinitions([{ node, actions: [action] }]);
		await loader.loadAll();
		const before = loader.getNode(node.id).type.description;
		const snapshot = structuredClone(before);

		const changed = [
			{
				node: { ...node, displayName: 'Acme Billing v2', baseUrl: 'https://new.acme.test' },
				actions: [{ ...action, name: 'List All Invoices' }],
			},
		];
		loader.setDefinitions(changed);
		await loader.loadAll();

		expect(before).toEqual(snapshot); // rebuild creates new objects, it does not mutate
		expect(loader.getNode(node.id).type.description).not.toBe(before);
		expect(descriptionOf(loader, node.id).displayName).toBe('Acme Billing v2');
	});

	it('removes a node that is no longer in the definitions', async () => {
		loader.setDefinitions([{ node, actions: [action] }]);
		await loader.loadAll();

		loader.setDefinitions([]);
		await loader.loadAll();

		expect(loader.types.nodes).toEqual([]);
		expect(loader.known.nodes).toEqual({});
		expect(() => loader.getNode(node.id)).toThrow(UnrecognizedNodeTypeError);
	});

	it('has no credential types', () => {
		expect(() => loader.getCredential('httpHeaderAuth')).toThrow();
	});
});
