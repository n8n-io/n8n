import type { Logger } from '@n8n/backend-common';
import { camelCase } from 'change-case';
import { UnrecognizedCredentialTypeError, UnrecognizedNodeTypeError } from 'n8n-core';
import {
	ensureError,
	NodeHelpers,
	type ICredentialType,
	type ICredentialTypeData,
	type INodeType,
	type INodeTypeData,
	type INodeTypeDescription,
	type IVersionedNodeType,
	type KnownNodesAndCredentials,
	type LoadedClass,
	type NodeLoader,
} from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import {
	LANGCHAIN_PACKAGE_NAME,
	MCP_REGISTRY_BASE_NODE_NAME,
	MCP_REGISTRY_PACKAGE_NAME,
	serverToCredentialDescription,
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

	types: { nodes: INodeTypeDescription[]; credentials: ICredentialType[] } = {
		nodes: [],
		credentials: [],
	};

	private nodeTypes: INodeTypeData = {};

	private credentialTypes: ICredentialTypeData = {};

	private typesReleased = true;

	constructor(
		private readonly registry: McpRegistryService,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly logger: Logger,
	) {}

	async loadAll(): Promise<void> {
		this.reset();

		const baseLoaded = this.resolveBaseNode();
		this.typesReleased = false;
		if (!baseLoaded) return;

		const { type: baseNode, sourcePath } = baseLoaded;
		const { description: baseDescription } = NodeHelpers.getVersionedNodeType(baseNode);

		for (const server of this.registry.getAll({ includeDeprecated: true })) {
			const nodeDescription = serverToNodeDescription(server, baseDescription);
			const credentialDescription = serverToCredentialDescription(server);
			if (!nodeDescription || !credentialDescription) continue;

			const bareName = camelCase(server.slug);

			this.types.nodes.push(nodeDescription);
			const syntheticNode = Object.create(baseNode, {
				description: { value: nodeDescription, enumerable: true },
			}) as INodeType;
			this.nodeTypes[bareName] = { type: syntheticNode, sourcePath };
			this.known.nodes[bareName] = {
				className: 'McpRegistryClientTool',
				sourcePath,
			};

			this.types.credentials.push(credentialDescription);
			this.credentialTypes[credentialDescription.name] = {
				type: credentialDescription,
				sourcePath: '',
			};
			this.known.credentials[credentialDescription.name] = {
				className: 'McpRegistryApi',
				sourcePath: '',
				extends: credentialDescription.extends,
				supportedNodes: [bareName],
			};
		}
	}

	getNode(nodeType: string): LoadedClass<INodeType | IVersionedNodeType> {
		const entry = this.nodeTypes[nodeType];
		if (!entry) throw new UnrecognizedNodeTypeError(this.packageName, nodeType);
		return entry;
	}

	getCredential(credentialType: string): LoadedClass<ICredentialType> {
		const entry = this.credentialTypes[credentialType];
		if (!entry) throw new UnrecognizedCredentialTypeError(credentialType);
		return entry;
	}

	reset() {
		this.known = { nodes: {}, credentials: {} };
		this.types = { nodes: [], credentials: [] };
		this.nodeTypes = {};
		this.credentialTypes = {};
		this.typesReleased = true;
	}

	releaseTypes() {
		this.types = { nodes: [], credentials: [] };
		this.typesReleased = true;
	}

	async ensureTypesLoaded(): Promise<void> {
		if (this.typesReleased) await this.loadAll();
	}

	resolveSourcePath(sourcePath: string) {
		return sourcePath;
	}

	private resolveBaseNode(): LoadedClass<INodeType | IVersionedNodeType> | undefined {
		const langchainLoader = this.loadNodesAndCredentials.loaders[LANGCHAIN_PACKAGE_NAME];
		if (!langchainLoader) {
			this.logger.warn(
				`McpRegistryNodeLoader: langchain package "${LANGCHAIN_PACKAGE_NAME}" is not loaded; registry nodes will not be available.`,
			);
			return undefined;
		}
		try {
			return langchainLoader.getNode(MCP_REGISTRY_BASE_NODE_NAME);
		} catch (error) {
			this.logger.warn(
				`McpRegistryNodeLoader: failed to resolve base node "${MCP_REGISTRY_BASE_NODE_NAME}"`,
				{ error: ensureError(error) },
			);
			return undefined;
		}
	}
}
