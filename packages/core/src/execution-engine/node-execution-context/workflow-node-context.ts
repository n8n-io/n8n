import type {
	IGetNodeParameterOptions,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
	IWorkflowNodeContext,
} from 'n8n-workflow';

import { NodeExecutionContext } from './node-execution-context';

export class LoadWorkflowNodeContext extends NodeExecutionContext implements IWorkflowNodeContext {
	// Note that this differs from and does not shadow the function with the
	// same name in `NodeExecutionContext`, as it has the `itemIndex` parameter
	readonly getNodeParameter: IWorkflowNodeContext['getNodeParameter'];

	constructor(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData) {
		super(workflow, node, additionalData, 'internal');
		{
			// We need to cast due to the overloaded IWorkflowNodeContext::getNodeParameter function
			// Which would require us to replicate all overload return types, as TypeScript offers
			// no convenient solution to refer to a set of overloads.
			this.getNodeParameter = ((
				parameterName: string,
				itemIndex: number,
				fallbackValue?: unknown,
				options?: IGetNodeParameterOptions,
			) =>
				this._getNodeParameter(
					parameterName,
					itemIndex,
					fallbackValue,
					options,
				)) as IWorkflowNodeContext['getNodeParameter'];
		}
	}
}
