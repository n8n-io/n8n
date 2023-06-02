import type { IWorkflowExecuteAdditionalData, ResourceMapperFields } from 'n8n-workflow';

import * as NodeExecuteFunctions from './NodeExecuteFunctions';
import { LoadNodeDetails } from './LoadNodeDetails';

export class LoadMappingOptions extends LoadNodeDetails {
	/**
	 * Returns the available mapping fields for the ResourceMapper component
	 */
	async getOptionsViaMethodName(
		methodName: string,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<ResourceMapperFields> {
		const node = this.getTempNode();

		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		const method = nodeType?.methods?.resourceMapping?.[methodName];

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

		return method.call(thisArgs);
	}
}
