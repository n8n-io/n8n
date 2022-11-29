import { loadClassInIsolation } from 'n8n-core';
import type {
	INodesAndCredentials,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	ICredentialType,
	LoadedClass,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { CredentialTypes } from '@/CredentialTypes';
import { CUSTOM_API_CALL_KEY, CUSTOM_API_CALL_NAME, RESPONSE_ERROR_MESSAGES } from '@/constants';

class NodeTypesClass implements INodeTypes {
	constructor(private nodesAndCredentials: INodesAndCredentials) {
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		// eslint-disable-next-line no-restricted-syntax
		for (const nodeTypeData of Object.values(this.loadedNodes)) {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeTypeData.type);
			this.applySpecialNodeParameters(nodeType);
		}
	}

	getAll(): Array<INodeType | IVersionedNodeType> {
		return Object.values(this.loadedNodes).map(({ type }) => type);
	}

	/**
	 * Variant of `getByNameAndVersion` that includes the node's source path, used to locate a node's translations.
	 */
	getWithSourcePath(
		nodeTypeName: string,
		version: number,
	): { description: INodeTypeDescription } & { sourcePath: string } {
		const nodeType = this.getNode(nodeTypeName);

		if (!nodeType) {
			throw new Error(`Unknown node type: ${nodeTypeName}`);
		}

		const { description } = NodeHelpers.getVersionedNodeType(nodeType.type, version);

		return { description: { ...description }, sourcePath: nodeType.sourcePath };
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.getNode(nodeType).type, version);
	}

	private getNode(type: string): LoadedClass<INodeType | IVersionedNodeType> {
		const loadedNodes = this.loadedNodes;
		if (type in loadedNodes) {
			return loadedNodes[type];
		}

		const knownNodes = this.knownNodes;
		if (type in knownNodes) {
			const { className, sourcePath } = knownNodes[type];
			const loaded: INodeType = loadClassInIsolation(sourcePath, className);
			this.applySpecialNodeParameters(loaded);
			loadedNodes[type] = { sourcePath, type: loaded };
			return loadedNodes[type];
		}
		throw new Error(`${RESPONSE_ERROR_MESSAGES.NO_NODE}: ${type}`);
	}

	private applySpecialNodeParameters(nodeType: INodeType) {
		const applyParameters = NodeHelpers.getSpecialNodeParameters(nodeType);
		if (applyParameters.length) {
			nodeType.description.properties.unshift(...applyParameters);
		}
	}

	private get loadedNodes() {
		return this.nodesAndCredentials.loaded.nodes;
	}

	private get knownNodes() {
		return this.nodesAndCredentials.known.nodes;
	}

	/**
	 * Whether any of the node's credential types may be used to
	 * make a request from a node other than itself.
	 */
	supportsProxyAuth(description: INodeTypeDescription) {
		if (!description.credentials) return false;

		const credentialTypes = CredentialTypes();

		return description.credentials.some(({ name }) => {
			const credType = credentialTypes.getByName(name);

			if (credType.authenticate !== undefined) return true;

			return this.#isOAuth(credType);
		});
	}

	#isOAuth(credType: ICredentialType) {
		return (
			Array.isArray(credType.extends) &&
			credType.extends.some((parentType) =>
				['oAuth2Api', 'googleOAuth2Api', 'oAuth1Api'].includes(parentType),
			)
		);
	}

	/**
	 * Inject a `Custom API Call` option into `resource` and `operation`
	 * parameters in a node that supports proxy auth.
	 */
	injectCustomApiCallOption(description: INodeTypeDescription) {
		if (!this.supportsProxyAuth(description)) return description;

		description.properties.forEach((p) => {
			if (
				['resource', 'operation'].includes(p.name) &&
				Array.isArray(p.options) &&
				p.options[p.options.length - 1].name !== CUSTOM_API_CALL_NAME
			) {
				p.options.push({
					name: CUSTOM_API_CALL_NAME,
					value: CUSTOM_API_CALL_KEY,
				});
			}

			return p;
		});

		return description;
	}
}

let nodeTypesInstance: NodeTypesClass | undefined;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function NodeTypes(nodesAndCredentials?: INodesAndCredentials): NodeTypesClass {
	if (!nodeTypesInstance) {
		if (nodesAndCredentials) {
			nodeTypesInstance = new NodeTypesClass(nodesAndCredentials);
		} else {
			throw new Error('NodeTypes not initialized yet');
		}
	}

	return nodeTypesInstance;
}
