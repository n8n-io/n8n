import { CUSTOM_DEFINITIONS_PACKAGE_NAME } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Publisher, PushProxy } from '@n8n/backend-services';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import pLimit from 'p-limit';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import {
	CustomNodesNodeLoader,
	customNodeIconPath,
	type CustomNodeDefinition,
} from './custom-nodes-node-loader';
import type { CustomNodeEntity } from './database/entities/custom-node.entity';
import {
	CustomActionRepository,
	type ActionAggregate,
} from './database/repositories/custom-action.repository';
import { CustomNodeRepository } from './database/repositories/custom-node.repository';
import type { ActionView, CustomNodeView } from './node-description.generator';

function toNodeView(entity: CustomNodeEntity): CustomNodeView {
	return {
		id: entity.id,
		displayName: entity.displayName,
		...(entity.description !== null && { description: entity.description }),
		baseUrl: entity.baseUrl,
		auth: entity.auth,
		// The icon bytes stay in the database. The editor loads them from the icon route.
		...(entity.iconMimeType !== null && { iconUrl: customNodeIconPath(entity.id) }),
	};
}

function toActionView({ action, versions }: ActionAggregate): ActionView {
	return {
		id: action.id,
		name: action.name,
		...(action.description !== null && { description: action.description }),
		versions: versions.map(({ version, inputs, request }) => ({ version, inputs, request })),
	};
}

/** Keeps the node loader of custom nodes in step with the database. */
@Service()
export class CustomNodesRegistry {
	/** One rebuild at a time. Interleaved rebuilds could publish an old set of definitions. */
	private readonly lock = pLimit(1);

	constructor(
		private readonly logger: Logger,
		private readonly nodeRepository: CustomNodeRepository,
		private readonly actionRepository: CustomActionRepository,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly push: PushProxy,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = logger.scoped('custom-nodes');
	}

	/** Reads all definitions, rebuilds the loader, and republishes node types. One rebuild at a time. */
	async refresh(options: { notifyEditors: boolean; notifyInstances: boolean }): Promise<void> {
		await this.lock(async () => {
			const loader = this.loadNodesAndCredentials.loaders[CUSTOM_DEFINITIONS_PACKAGE_NAME];
			if (!(loader instanceof CustomNodesNodeLoader)) {
				this.logger.warn('The custom nodes loader is not registered. Custom nodes are not served.');
				return;
			}

			const definitions = await this.readDefinitions();
			loader.setDefinitions(definitions);
			await loader.loadAll();
			await this.loadNodesAndCredentials.postProcessLoaders();
			this.loadNodesAndCredentials.releaseTypes();
			this.logger.debug('Custom nodes loaded', { nodeCount: loader.types.nodes.length });

			// Only a main instance has editor connections.
			if (options.notifyEditors && this.instanceSettings.instanceType === 'main') {
				this.push.broadcast({ type: 'nodeDescriptionUpdated', data: {} });
			}
			if (options.notifyInstances) {
				await this.publisher.publishCommand({ command: 'reload-custom-nodes' });
			}
		});
	}

	@OnPubSubEvent('reload-custom-nodes')
	async handleReloadCustomNodes(): Promise<void> {
		await this.refresh({ notifyEditors: true, notifyInstances: false });
	}

	/** Standalone custom nodes only. Actions of a built-in parent node are served elsewhere. */
	private async readDefinitions(): Promise<CustomNodeDefinition[]> {
		const [nodes, actions] = await Promise.all([
			this.nodeRepository.findAllNodes({}),
			this.actionRepository.findAllActions({}),
		]);

		const actionsByNode = new Map<string, ActionView[]>();
		for (const aggregate of actions) {
			const { customNodeId } = aggregate.action;
			if (customNodeId === null) continue;
			const list = actionsByNode.get(customNodeId) ?? [];
			list.push(toActionView(aggregate));
			actionsByNode.set(customNodeId, list);
		}

		return nodes.map((node) => ({
			node: toNodeView(node),
			actions: actionsByNode.get(node.id) ?? [],
		}));
	}
}
