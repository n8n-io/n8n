import { CUSTOM_DEFINITIONS_PACKAGE_NAME } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { ensureError } from '@n8n/utils/errors/ensure-error';
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

import {
	generateCustomNodeDescription,
	type ActionView,
	type CustomNodeView,
} from './node-description.generator';

export const customNodeTypeName = (id: string) => `${CUSTOM_DEFINITIONS_PACKAGE_NAME}.${id}`;

/**
 * Relative to the instance base URL. `restEndpoint` is the configured REST prefix
 * (`GlobalConfig.endpoints.rest`), so the path matches the route of the icon controller.
 */
export const customNodeIconPath = (restEndpoint: string, id: string) =>
	`${restEndpoint}/custom-nodes/nodes/${id}/icon`;

export interface CustomNodeDefinition {
	node: CustomNodeView;
	actions: ActionView[];
}

/**
 * Serves each stored custom node as a declarative node type.
 * The node types have no `execute`, so `NodeTypes` runs them with `RoutingNode`.
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

	private definitions: CustomNodeDefinition[] = [];

	/** Ids of invalid definitions that were logged, so that a rebuild does not log them again. */
	private reportedInvalid = new Set<string>();

	constructor(private readonly logger: Logger) {}

	setDefinitions(definitions: CustomNodeDefinition[]): void {
		this.definitions = definitions;
		this.reportedInvalid.clear();
	}

	async loadAll(): Promise<void> {
		this.reset();
		this.typesReleased = false;

		for (const { node, actions } of this.definitions) {
			let description: INodeTypeDescription;
			try {
				// Always a new object: a caller can still hold the previous description.
				description = generateCustomNodeDescription(node, actions);
			} catch (error) {
				this.reportInvalid(node.id, error);
				continue;
			}

			const type: INodeType = { description };
			this.types.nodes.push(description);
			this.nodeTypes[node.id] = { type, sourcePath: '' };
			// No source file exists. An empty path makes file lookups (schemas, translations) skip it.
			this.known.nodes[node.id] = { className: 'CustomNode', sourcePath: '' };
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

	/** Logs only the id and the error. The definition holds request templates. */
	private reportInvalid(customNodeId: string, error: unknown) {
		if (this.reportedInvalid.has(customNodeId)) return;
		this.reportedInvalid.add(customNodeId);
		this.logger.error('Skipped a custom node with an invalid definition', {
			customNodeId,
			error: ensureError(error),
		});
	}
}
