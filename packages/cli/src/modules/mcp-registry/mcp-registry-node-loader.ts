import type { Logger } from '@n8n/backend-common';
import { camelCase } from 'change-case';
import { UnrecognizedCredentialTypeError, UnrecognizedNodeTypeError } from 'n8n-core';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
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
	getMcpRegistryCredentialOptions,
	getMcpRegistryRemote,
	serverToCredentialDescription,
	serverToNodeDescription,
	type IsKnownCredentialType,
} from './node-description-transform';
import type { McpRegistryServer } from './registry/mcp-registry.types';

type McpRegistryBaseNode = INodeType & {
	registerEndpoint(
		nodeTypeName: string,
		endpointUrl: string,
		transport: 'httpStreamable' | 'sse',
		credentials: Array<{ credentialType: string; value: string }>,
		trustedDomains?: string,
	): void;
	resetRegistry(): void;
};

function supportsEndpointRegistration(
	node: INodeType | IVersionedNodeType,
): node is McpRegistryBaseNode {
	return (
		'registerEndpoint' in node &&
		typeof node.registerEndpoint === 'function' &&
		'resetRegistry' in node &&
		typeof node.resetRegistry === 'function'
	);
}

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

	private servers: McpRegistryServer[] = [];

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly logger: Logger,
	) {}

	setServers(servers: McpRegistryServer[]): void {
		this.servers = servers;
	}

	async loadAll(): Promise<void> {
		this.reset();

		const baseLoaded = this.resolveBaseNode();
		this.typesReleased = false;
		if (!baseLoaded) return;

		const { type: baseNode, sourcePath } = baseLoaded;
		const { description: baseDescription } = NodeHelpers.getVersionedNodeType(baseNode);
		if (supportsEndpointRegistration(baseNode)) baseNode.resetRegistry();

		const isKnownCredentialType: IsKnownCredentialType = (name) =>
			this.isSupportedOAuth2CredentialType(name);

		for (const server of this.servers) {
			const nodeDescription = serverToNodeDescription(
				server,
				baseDescription,
				isKnownCredentialType,
			);
			const credentialDescription = serverToCredentialDescription(server, isKnownCredentialType);
			if (!nodeDescription) continue;
			if (server.authType !== 'usesCredentials' && !credentialDescription) continue;

			const bareName = camelCase(server.slug);
			const remote = getMcpRegistryRemote(server);
			if (supportsEndpointRegistration(baseNode) && remote) {
				const supportedCredentialTypes = new Set(
					nodeDescription.credentials?.map(({ name }) => name) ?? [],
				);
				baseNode.registerEndpoint(
					bareName,
					remote.endpointUrl,
					remote.transport,
					getMcpRegistryCredentialOptions(server).filter(({ credentialType }) =>
						supportedCredentialTypes.has(credentialType),
					),
					server.authType === 'usesCredentials'
						? new URL(remote.endpointUrl).hostname
						: undefined,
				);
			}

			this.types.nodes.push(nodeDescription);
			const syntheticNode = Object.create(baseNode, {
				description: { value: nodeDescription, enumerable: true },
			}) as INodeType;
			this.nodeTypes[bareName] = { type: syntheticNode, sourcePath };
			this.known.nodes[bareName] = {
				className: 'McpRegistryClientTool',
				sourcePath,
			};

			if (credentialDescription) {
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

	private isSupportedOAuth2CredentialType(name: string): boolean {
		if (!Object.hasOwn(this.loadNodesAndCredentials.knownCredentials, name)) return false;

		try {
			const credentialType = this.loadNodesAndCredentials.getCredential(name).type;
			if (
				credentialType.authenticate !== undefined ||
				credentialType.preAuthentication !== undefined
			) {
				return false;
			}
		} catch {
			return false;
		}

		return name === 'oAuth2Api' || this.getParentCredentialTypes(name).includes('oAuth2Api');
	}

	private getParentCredentialTypes(name: string, seen = new Set<string>()): string[] {
		if (seen.has(name)) return [];
		seen.add(name);

		const parents = this.loadNodesAndCredentials.knownCredentials[name]?.extends ?? [];
		return parents.flatMap((parent) => [
			parent,
			...this.getParentCredentialTypes(parent, seen),
		]);
	}
}
