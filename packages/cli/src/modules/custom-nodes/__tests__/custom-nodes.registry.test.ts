import type { Logger } from '@n8n/backend-common';
import type { Publisher, PushProxy } from '@n8n/backend-services';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { CustomNodesNodeLoader } from '../custom-nodes-node-loader';
import { CustomNodesRegistry } from '../custom-nodes.registry';
import type { CustomActionEntity } from '../database/entities/custom-action.entity';
import type { CustomNodeEntity } from '../database/entities/custom-node.entity';
import type {
	ActionAggregate,
	CustomActionRepository,
} from '../database/repositories/custom-action.repository';
import type { CustomNodeRepository } from '../database/repositories/custom-node.repository';

const nodeEntity = (overrides: Partial<CustomNodeEntity> = {}) =>
	({
		id: 'cn_acme',
		displayName: 'Acme Billing',
		description: null,
		baseUrl: 'https://billing.acme.test/api',
		baseUrlHistory: [],
		auth: { kind: 'none' },
		iconMimeType: null,
		createdById: null,
		updatedById: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}) as CustomNodeEntity;

const actionAggregate = (overrides: Partial<CustomActionEntity> = {}): ActionAggregate => ({
	action: {
		id: 'act_list',
		name: 'List Invoices',
		description: null,
		parentNodeType: null,
		customNodeId: 'cn_acme',
		createdById: null,
		updatedById: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as CustomActionEntity,
	versions: [
		{
			id: 1,
			version: 1,
			inputs: [],
			currentRevision: 1,
			revisionCount: 1,
			createdAt: new Date(),
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
});

const deferred = () => {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => (resolve = r));
	return { promise, resolve };
};

function createRegistry(
	options: {
		instanceType?: 'main' | 'worker' | 'webhook';
		nodes?: CustomNodeEntity[];
		actions?: ActionAggregate[];
	} = {},
) {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const loader = new CustomNodesNodeLoader(logger);
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>({ loaders: {} });
	// Assigned after creation, so that the mock does not wrap the real loader.
	loadNodesAndCredentials.loaders['n8n-custom'] = loader;
	const nodeRepository = mock<CustomNodeRepository>();
	nodeRepository.findAllNodes.mockResolvedValue(options.nodes ?? [nodeEntity()]);
	const actionRepository = mock<CustomActionRepository>();
	actionRepository.findAllActions.mockResolvedValue(options.actions ?? [actionAggregate()]);
	const push = mock<PushProxy>();
	const publisher = mock<Publisher>({ publishCommand: vi.fn().mockResolvedValue(undefined) });
	const instanceSettings = mock<InstanceSettings>({
		instanceType: options.instanceType ?? 'main',
	});

	const registry = new CustomNodesRegistry(
		logger,
		nodeRepository,
		actionRepository,
		loadNodesAndCredentials,
		push,
		publisher,
		instanceSettings,
	);
	return { registry, loader, loadNodesAndCredentials, push, publisher, logger };
}

const servedNames = (loader: CustomNodesNodeLoader) => loader.types.nodes.map((d) => d.name);

describe('CustomNodesRegistry', () => {
	it('calls loadAll, postProcessLoaders, releaseTypes in that order', async () => {
		const { registry, loader, loadNodesAndCredentials } = createRegistry();
		const calls: string[] = [];
		const loadAll = loader.loadAll.bind(loader);
		vi.spyOn(loader, 'loadAll').mockImplementation(async () => {
			calls.push('loadAll');
			await loadAll();
		});
		loadNodesAndCredentials.postProcessLoaders.mockImplementation(async () => {
			calls.push('postProcessLoaders');
		});
		loadNodesAndCredentials.releaseTypes.mockImplementation(() => {
			calls.push('releaseTypes');
		});

		await registry.refresh({ notifyEditors: false, notifyInstances: false });

		expect(calls).toEqual(['loadAll', 'postProcessLoaders', 'releaseTypes']);
	});

	it('serves the standalone custom nodes from the database and ignores parent-node actions', async () => {
		const { registry, loader } = createRegistry({
			actions: [
				actionAggregate(),
				actionAggregate({
					id: 'act_parent',
					customNodeId: null,
					parentNodeType: 'n8n-nodes-base.github',
				}),
			],
		});

		await registry.refresh({ notifyEditors: false, notifyInstances: false });

		expect(servedNames(loader)).toEqual(['cn_acme']);
		const { type } = loader.getNode('cn_acme');
		const description = type.description as INodeTypeDescription;
		const operation = description.properties.find((p) => p.name === 'operation');
		expect(JSON.stringify(operation?.options)).toContain('act_list');
		expect(JSON.stringify(description)).not.toContain('act_parent');
	});

	it('sets iconUrl from the icon path only for a node with an icon', async () => {
		const { registry, loader } = createRegistry({
			nodes: [nodeEntity(), nodeEntity({ id: 'cn_icon', iconMimeType: 'image/png' })],
			actions: [],
		});

		await registry.refresh({ notifyEditors: false, notifyInstances: false });

		const iconUrlOf = (id: string) =>
			(loader.getNode(id).type.description as INodeTypeDescription).iconUrl;
		expect(iconUrlOf('cn_icon')).toBe('rest/custom-nodes/nodes/cn_icon/icon');
		expect(iconUrlOf('cn_acme')).toBeUndefined();
	});

	it('broadcasts nodeDescriptionUpdated only when notifyEditors is true', async () => {
		const { registry, push } = createRegistry();

		await registry.refresh({ notifyEditors: false, notifyInstances: false });
		expect(push.broadcast).not.toHaveBeenCalled();

		await registry.refresh({ notifyEditors: true, notifyInstances: false });
		expect(push.broadcast).toHaveBeenCalledTimes(1);
		expect(push.broadcast).toHaveBeenCalledWith({ type: 'nodeDescriptionUpdated', data: {} });
	});

	it('does not broadcast on a worker or webhook instance', async () => {
		for (const instanceType of ['worker', 'webhook'] as const) {
			const { registry, push } = createRegistry({ instanceType });

			await expect(
				registry.refresh({ notifyEditors: true, notifyInstances: false }),
			).resolves.toBeUndefined();
			expect(push.broadcast).not.toHaveBeenCalled();
		}
	});

	it('publishes reload-custom-nodes only when notifyInstances is true', async () => {
		const { registry, publisher } = createRegistry();

		await registry.refresh({ notifyEditors: false, notifyInstances: false });
		expect(publisher.publishCommand).not.toHaveBeenCalled();

		await registry.refresh({ notifyEditors: false, notifyInstances: true });
		expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
		expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-custom-nodes' });
	});

	it('refreshes without notifying instances when it receives reload-custom-nodes', async () => {
		const handler = Container.get(PubSubMetadata)
			.getHandlers()
			.find(
				(h) =>
					h.eventName === 'reload-custom-nodes' &&
					Object.is(h.eventHandlerClass, CustomNodesRegistry),
			);
		expect(handler).toBeDefined();

		const { registry, publisher, push, loader } = createRegistry();
		const refresh = vi.spyOn(registry, 'refresh');
		const method = handler!.methodName as keyof CustomNodesRegistry;
		await (registry[method] as () => Promise<void>).call(registry);

		expect(refresh).toHaveBeenCalledWith({ notifyEditors: true, notifyInstances: false });
		expect(publisher.publishCommand).not.toHaveBeenCalled();
		expect(push.broadcast).toHaveBeenCalledWith({ type: 'nodeDescriptionUpdated', data: {} });
		expect(servedNames(loader)).toEqual(['cn_acme']);
	});

	it('runs two concurrent refresh calls one after the other', async () => {
		const { registry, loader, loadNodesAndCredentials } = createRegistry();
		const events: string[] = [];
		const firstPostProcess = deferred();
		let postProcessCalls = 0;
		const loadAll = loader.loadAll.bind(loader);
		vi.spyOn(loader, 'loadAll').mockImplementation(async () => {
			events.push('loadAll');
			await loadAll();
		});
		loadNodesAndCredentials.postProcessLoaders.mockImplementation(async () => {
			postProcessCalls++;
			if (postProcessCalls === 1) await firstPostProcess.promise;
			events.push('postProcessLoaders');
		});

		const first = registry.refresh({ notifyEditors: false, notifyInstances: false });
		const second = registry.refresh({ notifyEditors: false, notifyInstances: false });
		await vi.waitFor(() => expect(postProcessCalls).toBe(1));
		expect(events).toEqual(['loadAll']);

		firstPostProcess.resolve();
		await Promise.all([first, second]);

		expect(events).toEqual(['loadAll', 'postProcessLoaders', 'loadAll', 'postProcessLoaders']);
	});

	it('keeps serving the valid node when another definition is invalid', async () => {
		const { registry, loader, logger } = createRegistry({
			nodes: [nodeEntity({ id: 'cn_bad', baseUrl: '={{ $credentials.token }}' }), nodeEntity()],
			actions: [actionAggregate(), actionAggregate({ id: 'act_bad', customNodeId: 'cn_bad' })],
		});

		await expect(
			registry.refresh({ notifyEditors: false, notifyInstances: false }),
		).resolves.toBeUndefined();

		expect(servedNames(loader)).toEqual(['cn_acme']);
		expect(logger.error).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ customNodeId: 'cn_bad' }),
		);
	});

	it('does nothing when the custom nodes loader is not registered', async () => {
		const { registry, loadNodesAndCredentials } = createRegistry();
		loadNodesAndCredentials.loaders = {};

		await expect(
			registry.refresh({ notifyEditors: true, notifyInstances: true }),
		).resolves.toBeUndefined();
		expect(loadNodesAndCredentials.postProcessLoaders).not.toHaveBeenCalled();
	});
});
