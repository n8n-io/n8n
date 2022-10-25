import type { INodeListSearchResult, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

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
		const method = nodeType?.methods?.listSearch?.[methodName];

		if (typeof method !== 'function') {
			throw new Error(
				`The node-type "${node.type}" does not have the method "${methodName}" defined!`,
			);
		}

		const thisArgs = NodeExecuteFunctions.getLoadOptionsFunctions(
			this.workflow,
			node,
			this.path,
			additionalData,
		);

		return method.call(thisArgs, filter, paginationToken);
	}
}
