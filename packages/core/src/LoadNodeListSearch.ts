import {
	INodeListSearchResult,
	IWorkflowExecuteAdditionalData,
	requireDistNode,
} from 'n8n-workflow';

import { NodeExecuteFunctions } from '.';
import { LoadNodeDetails } from './LoadNodeDetails';

export class LoadNodeListSearch extends LoadNodeDetails {
	/**
	 * Returns the available options via a predefined method
	 */
	async getOptionsViaMethodName(
		methodName: string,
		additionalData: IWorkflowExecuteAdditionalData,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		const node = this.getTempNode();

		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (!nodeType) {
			throw new Error(`Unknown node type "${node.type}"`);
		}

		const method = nodeType?.methods?.listSearch?.[methodName];

		if (!method) {
			throw new Error(`Node type "${node.type}" does not have method "${methodName}"`);
		}

		const loadOptionsFunctions = NodeExecuteFunctions.getLoadOptionsFunctions(
			this.workflow,
			node,
			this.path,
			additionalData,
		);

		const isCachedNode = typeof method === 'string';

		// uncached node, run method from memory

		if (!isCachedNode) {
			return method.call(loadOptionsFunctions, filter, paginationToken);
		}

		// cached node, run method from source

		const distNode = requireDistNode(nodeType, this.workflow);

		const distMethod = distNode.methods.listSearch?.[methodName];

		if (!distMethod) {
			throw new Error(`Node type "${node.type}" does not have method "${methodName}"`);
		}

		return distMethod.call(loadOptionsFunctions, filter, paginationToken);
	}
}
