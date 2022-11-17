/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
	INodeType,
	INodeTypeData,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	NodeHelpers,
	ICredentialType,
} from 'n8n-workflow';
import { CredentialTypes } from '@/CredentialTypes';
import { CUSTOM_API_CALL_KEY, CUSTOM_API_CALL_NAME } from '@/constants';

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {};

	async init(nodeTypes: INodeTypeData): Promise<void> {
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		// eslint-disable-next-line no-restricted-syntax
		for (const nodeTypeData of Object.values(nodeTypes)) {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeTypeData.type);
			const applyParameters = NodeHelpers.getSpecialNodeParameters(nodeType);

			if (applyParameters.length) {
				nodeType.description.properties.unshift(...applyParameters);
			}
		}
		this.nodeTypes = nodeTypes;
	}

	getAll(): Array<INodeType | IVersionedNodeType> {
		return Object.values(this.nodeTypes).map((data) => data.type);
	}

	/**
	 * Variant of `getByNameAndVersion` that includes the node's source path, used to locate a node's translations.
	 */
	getWithSourcePath(
		nodeTypeName: string,
		version: number,
	): { description: INodeTypeDescription } & { sourcePath: string } {
		const nodeType = this.nodeTypes[nodeTypeName];

		if (!nodeType) {
			throw new Error(`Unknown node type: ${nodeTypeName}`);
		}

		const { description } = NodeHelpers.getVersionedNodeType(nodeType.type, version);

		return { description: { ...description }, sourcePath: nodeType.sourcePath };
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		if (this.nodeTypes[nodeType] === undefined) {
			throw new Error(`The node-type "${nodeType}" is not known!`);
		}
		return NodeHelpers.getVersionedNodeType(this.nodeTypes[nodeType].type, version);
	}

	attachNodeType(
		nodeTypeName: string,
		nodeType: INodeType | IVersionedNodeType,
		sourcePath: string,
	): void {
		this.nodeTypes[nodeTypeName] = {
			type: nodeType,
			sourcePath,
		};
	}

	removeNodeType(nodeType: string): void {
		delete this.nodeTypes[nodeType];
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
export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}
