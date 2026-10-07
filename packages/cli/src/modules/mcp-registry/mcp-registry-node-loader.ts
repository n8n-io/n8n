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
	type McpRegistryConnection,
	type McpRegistryRuntime,
	type NodeLoader,
} from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import {
	LANGCHAIN_PACKAGE_NAME,
	MCP_REGISTRY_BASE_NODE_NAME,
	MCP_REGISTRY_PACKAGE_NAME,
	serverToCredentialDescription,
	serverToNodeDescription,
	serversToNodeDescription,
	type IsKnownCredentialType,
} from './node-description-transform';
import {
	isSupportedMcpRegistryCredentialType,
	mergeMcpRegistryConnections,
	prepareMcpRegistryConnection,
	resolveMcpRegistryConnection,
} from './mcp-registry-connection';
import type { McpRegistryServer } from './registry/mcp-registry.types';

type McpRegistryBaseNode = INodeType & {
	setRegistryRuntime(runtime: McpRegistryRuntime): void;
};

function supportsRegistryRuntime(
	node: INodeType | IVersionedNodeType,
): node is McpRegistryBaseNode {
	return 'setRegistryRuntime' in node && typeof node.setRegistryRuntime === 'function';
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

	private connections = new Map<string, McpRegistryConnection>();

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

		const credentialTypes = this.getCredentialTypes();
		const isKnownCredentialType: IsKnownCredentialType = (name) =>
			isSupportedMcpRegistryCredentialType(credentialTypes, name);

		// Rows that share a node type (same slug) collapse into one entry: an
		// official server and its Gateway credits twin become a single node whose
		// credential picker routes each choice to its own endpoint.
		const groups = new Map<string, McpRegistryServer[]>();
		for (const server of this.servers) {
			const bareName = camelCase(server.slug);
			groups.set(bareName, [...(groups.get(bareName) ?? []), server]);
		}

		for (const [bareName, group] of groups) {
			const resolved = group.map((server) => ({
				server,
				connection: resolveMcpRegistryConnection(server),
			}));

			const mergedDescription =
				group.length >= 2
					? serversToNodeDescription(group, baseDescription, isKnownCredentialType)
					: null;
			const mergedConnection = mergedDescription
				? mergeMcpRegistryConnections(
						resolved
							.map(({ connection }) => connection)
							.filter((connection): connection is McpRegistryConnection => connection !== null),
					)
				: null;

			let description: INodeTypeDescription | null;
			let connection: McpRegistryConnection | null;
			let credentials: Array<ICredentialType | null>;
			if (mergedDescription && mergedConnection) {
				description = mergedDescription;
				connection = mergedConnection;
				credentials = group.map((server) =>
					serverToCredentialDescription(server, isKnownCredentialType),
				);
			} else {
				// Last row wins, so a live overlay replaces a stored row of the same slug.
				const last = [...resolved].reverse().find(({ connection }) => connection !== null);
				const credential =
					last && serverToCredentialDescription(last.server, isKnownCredentialType);
				if (!last || (last.server.authType !== 'usesCredentials' && !credential)) continue;
				description = serverToNodeDescription(last.server, baseDescription, isKnownCredentialType);
				connection = last.connection;
				credentials = [credential ?? null];
			}
			if (!description || !connection) continue;

			const supportedCredentialTypes = new Set(
				description.credentials?.map(({ name }) => name) ?? [],
			);
			this.connections.set(connection.nodeTypeName, {
				...connection,
				credentialBindings: connection.credentialBindings.filter(({ credentialType }) =>
					supportedCredentialTypes.has(credentialType),
				),
			});

			this.types.nodes.push(description);
			const syntheticNode = Object.create(baseNode, {
				description: { value: description, enumerable: true },
			}) as INodeType;
			this.nodeTypes[bareName] = { type: syntheticNode, sourcePath };
			this.known.nodes[bareName] = {
				className: 'McpRegistryClientTool',
				sourcePath,
			};

			for (const credentialDescription of credentials) {
				if (!credentialDescription) continue;
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

		if (supportsRegistryRuntime(baseNode)) {
			baseNode.setRegistryRuntime({
				resolveConnection: (nodeTypeName, selector, nodeCredentialTypes) => {
					const connection = this.connections.get(nodeTypeName);
					if (!connection) return undefined;
					const bindings = connection.credentialBindings;
					const binding =
						bindings.length === 1
							? bindings[0]
							: (bindings.find((candidate) => candidate.selector === selector) ??
								// A node saved before the merge has no selector yet; fall back to
								// the binding for the credential it already carries.
								bindings.find((candidate) =>
									nodeCredentialTypes?.includes(candidate.credentialType),
								));
					return binding ? { connection, binding } : undefined;
				},
				prepareConnection: prepareMcpRegistryConnection,
			});
		}
	}

	getConnection(nodeTypeName: string): McpRegistryConnection | undefined {
		return this.connections.get(nodeTypeName);
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
		this.connections.clear();
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

	private getCredentialTypes() {
		return {
			recognizes: (name: string) =>
				Object.hasOwn(this.loadNodesAndCredentials.knownCredentials, name),
			getByName: (name: string) => this.loadNodesAndCredentials.getCredential(name).type,
			getSupportedNodes: (name: string) =>
				this.loadNodesAndCredentials.knownCredentials[name]?.supportedNodes ?? [],
			getParentTypes: (name: string) => this.getParentCredentialTypes(name),
		};
	}

	private getParentCredentialTypes(name: string, seen = new Set<string>()): string[] {
		if (seen.has(name)) return [];
		seen.add(name);

		const parents = this.loadNodesAndCredentials.knownCredentials[name]?.extends ?? [];
		return parents.flatMap((parent) => [parent, ...this.getParentCredentialTypes(parent, seen)]);
	}
}
