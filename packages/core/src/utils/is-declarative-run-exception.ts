import type { INode, INodeType } from 'n8n-workflow';

export function isDeclarativeRunException(
	node: INode,
	nodeType: INodeType,
	method: 'webhook' | 'execute',
): boolean {
	if (!nodeType[method]) return false;

	if (nodeType.description.declarativeRunExceptions?.length) {
		const excludedResources: Array<{ resource: string; operation: string }> =
			nodeType.description.declarativeRunExceptions;
		const { resource, operation } = node.parameters;

		let isExcluded = false;
		for (const excludedResource of excludedResources) {
			if (excludedResource.resource === resource && excludedResource.operation === operation) {
				isExcluded = true;
				break;
			}
		}

		return isExcluded;
	}

	return true;
}
