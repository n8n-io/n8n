import { UnrecognizedCredentialTypeError, UnrecognizedNodeTypeError } from 'n8n-core';
import {
	NodeHelpers,
	type ICredentialType,
	type ICredentialTypeData,
	type INodeType,
	type INodeTypeData,
	type INodeTypeNameVersion,
	type IVersionedNodeType,
	type KnownNodesAndCredentials,
	type LoadedClass,
	type NodeLoader,
	type NodeLoaderTypes,
} from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import {
	LANGCHAIN_PACKAGE_NAME,
	MCP_REGISTRY_BASE_NODE_NAME,
	MCP_REGISTRY_PACKAGE_NAME,
	bareNodeNameFromSlug,
	serverToNodeDescription,
} from './node-description-transform';
import type { McpRegistryService } from './registry/mcp-registry.service';

/**
 * Synthetic node loader: turns each registry server into a node type, all
 * routed to the `McpRegistryClientTool` runtime class
 */
export class McpRegistryNodeLoader implements NodeLoader {
	packageName = MCP_REGISTRY_PACKAGE_NAME;

	known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	types: NodeLoaderTypes = { nodes: [], credentials: [] };

	nodeTypes: INodeTypeData = {};

	credentialTypes: ICredentialTypeData = {};

	loadedNodes: INodeTypeNameVersion[] = [];

	constructor(
		private readonly registry: McpRegistryService,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

	async loadAll(): Promise<void> {
		this.reset();

		const baseLoaded = this.resolveBaseNode();
		if (!baseLoaded) return;

		const { type: baseNode, sourcePath } = baseLoaded;
		const { description: baseDescription } = NodeHelpers.getVersionedNodeType(baseNode);

		for (const server of this.registry.getAll()) {
			const description = serverToNodeDescription(server, baseDescription);
			if (!description) continue;

			const bareName = bareNodeNameFromSlug(server.slug);

			this.types.nodes.push(description);
			const syntheticNode: INodeType = Object.create(baseNode, {
				description: { value: description, enumerable: true },
			});
			this.nodeTypes[bareName] = { type: syntheticNode, sourcePath };
			this.known.nodes[bareName] = {
				className: 'McpRegistryClientTool',
				sourcePath,
			};
			this.loadedNodes.push({ name: bareName, version: 1 });
		}
	}

	getNode(nodeType: string): LoadedClass<INodeType | IVersionedNodeType> {
		const entry = this.nodeTypes[nodeType];
		if (!entry) throw new UnrecognizedNodeTypeError(this.packageName, nodeType);
		return entry;
	}

	getCredential(credentialType: string): LoadedClass<ICredentialType> {
		throw new UnrecognizedCredentialTypeError(credentialType);
	}

	reset() {
		this.known = { nodes: {}, credentials: {} };
		this.types = { nodes: [], credentials: [] };
		this.nodeTypes = {};
		this.loadedNodes = [];
	}

	releaseTypes() {
		this.types = { nodes: [], credentials: [] };
	}

	async ensureTypesLoaded(): Promise<void> {
		if (this.types.nodes.length === 0) await this.loadAll();
	}

	private resolveBaseNode(): LoadedClass<INodeType | IVersionedNodeType> | undefined {
		const langchainLoader = this.loadNodesAndCredentials.loaders[LANGCHAIN_PACKAGE_NAME];
		try {
			return langchainLoader?.getNode(MCP_REGISTRY_BASE_NODE_NAME);
		} catch {
			return undefined;
		}
	}
}
