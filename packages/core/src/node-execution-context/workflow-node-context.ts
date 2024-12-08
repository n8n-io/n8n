import type {
	IGetNodeParameterOptions,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
	IWorkflowNodeContext,
} from 'n8n-workflow';

import { NodeExecutionContext } from './node-execution-context';

export class LoadWorkflowNodeContext extends NodeExecutionContext implements IWorkflowNodeContext {
	readonly getNodeParameter: IWorkflowNodeContext['getNodeParameter'];

	constructor(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData) {
		super(workflow, node, additionalData, 'internal');
		{
			this.getNodeParameter = ((
				parameterName: string,
				itemIndex: number,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				fallbackValue?: any,
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
