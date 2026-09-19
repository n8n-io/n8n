import type { CustomNodeDefinition, CustomOperationDefinition } from '@n8n/api-types';
import { CUSTOM_DEFINITIONS_PACKAGE_NAME } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { UnrecognizedCredentialTypeError, UnrecognizedNodeTypeError } from 'n8n-core';
import type {
	ICredentialType,
	INodeType,
	INodeTypeData,
	INodeTypeDescription,
	IVersionedNodeType,
	KnownNodesAndCredentials,
	LoadedClass,
	NodeLoader,
} from 'n8n-workflow';
import { NodeHelpers, VersionedNodeType } from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { generateCustomNodeDescription, type ParentNodeInfo } from './node-description.generator';

export interface CustomNodeDefinitions {
	operations: CustomOperationDefinition[];
	nodes: CustomNodeDefinition[];
}

/** Path (relative to the instance base URL) the frontend loads a custom node icon from. */
export const customNodeIconPath = (id: string) => `rest/custom-nodes/${id}/icon`;

/**
 * Synthetic node loader: turns stored Custom Node / Custom Operation definitions
 * into declarative node types under the `n8n-custom` package. Modelled on
 * `McpRegistryNodeLoader`. Nothing is read from disk.
 */
export class CustomNodesNodeLoader implements NodeLoader {
	packageName = CUSTOM_DEFINITIONS_PACKAGE_NAME;

	known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	types: { nodes: INodeTypeDescription[]; credentials: ICredentialType[] } = {
		nodes: [],
		credentials: [],
	};

	private nodeTypes: INodeTypeData = {};

	private typesReleased = true;

	private definitions: CustomNodeDefinitions = { operations: [], nodes: [] };

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly logger: Logger,
	) {}

	setDefinitions(definitions: CustomNodeDefinitions) {
		this.definitions = definitions;
	}

	getDefinitions() {
		return this.definitions;
	}

	async loadAll(): Promise<void> {
		this.reset();
		this.typesReleased = false;

		const { operations, nodes } = this.definitions;

		// Operations attached to an existing node are injected into that node by
		// `ParentNodePatcher`; only custom nodes become node types of their own.
		for (const node of nodes) {
			const ownOperations = operations.filter((op) => op.customNodeId === node.id);
			const description = generateCustomNodeDescription(node, ownOperations, {
				iconUrl: node.iconDataUri ? customNodeIconPath(node.id) : undefined,
			});
			this.register(node.id, [description]);
		}
	}

	private register(bareName: string, descriptions: INodeTypeDescription[]) {
		this.types.nodes.push(...descriptions);

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {};
		for (const description of descriptions) {
			const version = Array.isArray(description.version)
				? description.version[description.version.length - 1]
				: description.version;
			// Declarative node: no `execute`, `NodeTypes` assigns a RoutingNode-backed one
			nodeVersions[version] = { description } as INodeType;
		}

		const [first] = descriptions;
		const { properties: _properties, ...baseDescription } = first;
		const type: INodeType | IVersionedNodeType =
			descriptions.length === 1
				? nodeVersions[Object.keys(nodeVersions).map(Number)[0]]
				: new VersionedNodeType(nodeVersions, baseDescription);

		this.nodeTypes[bareName] = { type, sourcePath: '' };
		this.known.nodes[bareName] = { className: 'CustomDefinitionNode', sourcePath: '' };
	}

	resolveParent(parentNodeType: string): ParentNodeInfo | undefined {
		try {
			const { type } = this.loadNodesAndCredentials.getNode(parentNodeType);
			const { description } = NodeHelpers.getVersionedNodeType(type);
			const base = 'nodeVersions' in type ? type.description : description;
			return {
				displayName: base.displayName,
				icon: description.icon ?? base.icon,
				iconUrl: description.iconUrl ?? base.iconUrl,
				iconColor: description.iconColor ?? base.iconColor,
				iconBasePath: description.iconBasePath ?? base.iconBasePath,
				group: description.group,
			};
		} catch (error) {
			this.logger.warn(`Custom operation parent node type "${parentNodeType}" is not loaded`, {
				error,
			});
			return undefined;
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
}
