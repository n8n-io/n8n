import { CUSTOM_DEFINITIONS_PACKAGE_NAME } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Publisher, PushProxy } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
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
import { ParentActionsProvider } from './parent-actions.provider';

function toNodeView(entity: CustomNodeEntity, restEndpoint: string): CustomNodeView {
	return {
		id: entity.id,
		displayName: entity.displayName,
		...(entity.description !== null && { description: entity.description }),
		baseUrl: entity.baseUrl,
		auth: entity.auth,
		// The icon bytes stay in the database. The editor loads them from the icon route.
		...(entity.iconMimeType !== null && { iconUrl: customNodeIconPath(restEndpoint, entity.id) }),
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

function addTo(map: Map<string, ActionView[]>, key: string, view: ActionView) {
	const list = map.get(key) ?? [];
	list.push(view);
	map.set(key, list);
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
		private readonly parentActionsProvider: ParentActionsProvider,
		private readonly push: PushProxy,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
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

			const { definitions, actionsByParent } = await this.readDefinitions();
			loader.setDefinitions(definitions);
			await loader.loadAll();
			// Before the rebuild: its `transform` post-processor serves the parent actions.
			this.parentActionsProvider.setActions(actionsByParent);
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

	/**
	 * Standalone custom nodes with their actions, and the actions of built-in parent nodes
	 * by full node type name.
	 */
	private async readDefinitions(): Promise<{
		definitions: CustomNodeDefinition[];
		actionsByParent: Map<string, ActionView[]>;
	}> {
		const [nodes, actions] = await Promise.all([
			this.nodeRepository.findAllNodes({}),
			this.actionRepository.findAllActions({}),
		]);

		const actionsByNode = new Map<string, ActionView[]>();
		const actionsByParent = new Map<string, ActionView[]>();
		for (const aggregate of actions) {
			const { customNodeId, parentNodeType } = aggregate.action;
			if (customNodeId !== null) {
				addTo(actionsByNode, customNodeId, toActionView(aggregate));
			} else if (parentNodeType !== null) {
				addTo(actionsByParent, parentNodeType, toActionView(aggregate));
			}
		}

		const definitions = nodes.map((node) => ({
			node: toNodeView(node, this.globalConfig.endpoints.rest),
			actions: actionsByNode.get(node.id) ?? [],
		}));
		return { definitions, actionsByParent };
	}
}
