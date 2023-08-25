import { ConnectionTypes, IExecuteFunctions, NodeOperationError } from "n8n-workflow";

export const getAndValidateSupplyInput = async (executionContext: IExecuteFunctions, inputName: ConnectionTypes, required?: boolean, multiple?: boolean): Promise<unknown> =>  {

	const nodes = await executionContext.getInputConnectionData(inputName, 0) || [];
	if (required && nodes.length === 0) {
			throw new NodeOperationError(executionContext.getNode(), `A ${inputName} processor node must be connected!`);
	}
	if (!multiple && nodes.length > 1) {
			throw new NodeOperationError(executionContext.getNode(), `Only one ${inputName} processor node is allowed to be connected!`);
	}

	return multiple ? nodes.map(node => node.response) : (nodes || [])[0]?.response;
}
