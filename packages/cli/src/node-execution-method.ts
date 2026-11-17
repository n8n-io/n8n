import type { INodeType } from 'n8n-workflow';

export const shouldAssignExecuteMethod = (nodeType: INodeType) => {
	const isDeclarativeNode = nodeType?.description?.requestDefaults !== undefined;
	return (
		!nodeType.execute &&
		!nodeType.supplyData &&
		!nodeType.poll &&
		!nodeType.trigger &&
		(!nodeType.webhook || isDeclarativeNode) &&
		(!nodeType.methods || isDeclarativeNode)
	);
};
