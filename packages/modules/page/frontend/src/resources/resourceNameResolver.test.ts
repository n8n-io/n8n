import {
	createResourceNameResolver,
	toResourceKey,
	type ResourceFetchers,
} from './resourceNameResolver';

function createFetchers(): {
	[K in keyof ResourceFetchers]: ReturnType<typeof vi.fn<ResourceFetchers[K]>>;
} {
	return {
		workflow: vi.fn<ResourceFetchers['workflow']>().mockResolvedValue({
			name: 'Sync orders',
			active: true,
			updatedAt: '2026-11-16T10:00:00.000Z',
			nodes: [{ id: 'node-1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }],
		}),
		credential: vi.fn<ResourceFetchers['credential']>().mockResolvedValue({ name: 'Stripe key' }),
		dataTable: vi.fn<ResourceFetchers['dataTable']>().mockResolvedValue({ name: 'Orders' }),
		page: vi
			.fn<ResourceFetchers['page']>()
			.mockResolvedValue({ name: 'Runbook', updatedAt: '2026-11-15T08:00:00.000Z' }),
	};
}

describe('createResourceNameResolver', () => {
	it('resolves the name of each resource type', async () => {
		const resolver = createResourceNameResolver(createFetchers());

		expect(await resolver.resolveName({ resourceType: 'workflow', resourceId: 'wf-1' })).toBe(
			'Sync orders',
		);
		expect(await resolver.resolveName({ resourceType: 'credential', resourceId: 'c-1' })).toBe(
			'Stripe key',
		);
		expect(await resolver.resolveName({ resourceType: 'dataTable', resourceId: 'dt-1' })).toBe(
			'Orders',
		);
		expect(await resolver.resolveName({ resourceType: 'page', resourceId: 'p-1' })).toBe('Runbook');
	});

	it('names a node after its workflow and itself', async () => {
		const resolver = createResourceNameResolver(createFetchers());

		const name = await resolver.resolveName({
			resourceType: 'node',
			resourceId: 'node-1',
			workflowId: 'wf-1',
		});

		expect(name).toBe('Sync orders › HTTP Request');
	});

	it('gives the state and the last change of a workflow', async () => {
		const resolver = createResourceNameResolver(createFetchers());

		expect(await resolver.resolve({ resourceType: 'workflow', resourceId: 'wf-1' })).toEqual({
			name: 'Sync orders',
			isActive: true,
			updatedAt: '2026-11-16T10:00:00.000Z',
		});
	});

	it('gives both name parts of a node and the state of its workflow', async () => {
		const resolver = createResourceNameResolver(createFetchers());

		const details = await resolver.resolve({
			resourceType: 'node',
			resourceId: 'node-1',
			workflowId: 'wf-1',
		});

		expect(details).toEqual({
			name: 'Sync orders › HTTP Request',
			nodeName: 'HTTP Request',
			nodeType: 'n8n-nodes-base.httpRequest',
			workflowName: 'Sync orders',
			isActive: true,
			updatedAt: '2026-11-16T10:00:00.000Z',
		});
	});

	it('gives the last change of a page', async () => {
		const resolver = createResourceNameResolver(createFetchers());

		expect(await resolver.resolve({ resourceType: 'page', resourceId: 'p-1' })).toEqual({
			name: 'Runbook',
			updatedAt: '2026-11-15T08:00:00.000Z',
		});
	});

	it('makes one request for a workflow and all its nodes', async () => {
		const fetchers = createFetchers();
		const resolver = createResourceNameResolver(fetchers);
		const workflow = { resourceType: 'workflow', resourceId: 'wf-1' } as const;
		const node = { resourceType: 'node', resourceId: 'node-1', workflowId: 'wf-1' } as const;

		await Promise.all([
			...Array.from({ length: 10 }, async () => await resolver.resolveName(workflow)),
			resolver.resolveName(node),
		]);
		await resolver.resolveName(workflow);

		expect(fetchers.workflow).toHaveBeenCalledTimes(1);
		expect(fetchers.workflow).toHaveBeenCalledWith('wf-1');
	});

	it('gives undefined when the request fails, and does not ask again', async () => {
		const fetchers = createFetchers();
		fetchers.credential.mockRejectedValue(new Error('Forbidden'));
		const resolver = createResourceNameResolver(fetchers);
		const credential = { resourceType: 'credential', resourceId: 'c-1' } as const;

		expect(await resolver.resolveName(credential)).toBeUndefined();
		expect(await resolver.resolveName(credential)).toBeUndefined();
		expect(fetchers.credential).toHaveBeenCalledTimes(1);
	});

	it('gives undefined for a node that the workflow does not have', async () => {
		const resolver = createResourceNameResolver(createFetchers());

		const name = await resolver.resolveName({
			resourceType: 'node',
			resourceId: 'deleted-node',
			workflowId: 'wf-1',
		});

		expect(name).toBeUndefined();
	});

	it('asks the server again after forget', async () => {
		const fetchers = createFetchers();
		const resolver = createResourceNameResolver(fetchers);
		const page = { resourceType: 'page', resourceId: 'p-1' } as const;

		await resolver.resolveName(page);
		fetchers.page.mockResolvedValue({ name: 'Renamed runbook' });
		resolver.forget(page);

		expect(await resolver.resolveName(page)).toBe('Renamed runbook');
		expect(fetchers.page).toHaveBeenCalledTimes(2);
	});
});

describe('toResourceKey', () => {
	it('separates a node from a workflow with the same id', () => {
		expect(toResourceKey({ resourceType: 'workflow', resourceId: 'a' })).toBe('workflow:a');
		expect(toResourceKey({ resourceType: 'node', resourceId: 'a', workflowId: 'wf' })).toBe(
			'node:wf:a',
		);
	});
});
