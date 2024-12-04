import { get } from 'lodash';
import { ApplicationError } from 'n8n-workflow';
import type {
	INodeParameterResourceLocator,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	ILocalLoadOptionsFunctions,
	FieldValueOption,
	IWorkflowLoader,
} from 'n8n-workflow';

export class LocalLoadOptionsContext implements ILocalLoadOptionsFunctions {
	constructor(
		private additionalData: IWorkflowExecuteAdditionalData,
		private path: string,
		private workflowLoader: IWorkflowLoader,
	) {}

	async getWorkflowInputValues(): Promise<FieldValueOption[]> {
		const { value } = this.getCurrentNodeParameter('workflowId') as INodeParameterResourceLocator;

		const workflowId = value as string;
		if (!workflowId) {
			throw new ApplicationError('No workflowId parameter defined on node!');
		}

		const workflow = await this.workflowLoader.get(workflowId);

		workflow.nodes.find((node) => node.type === 'n8n-nodes-base.start');

		// TODO: load the inputs from the workflow
		const dummyFields = [
			{ name: 'field1', type: 'string' as const },
			{ name: 'field2', type: 'number' as const },
			{ name: 'field3', type: 'boolean' as const },
			{ name: 'field4', type: 'any' as const },
		];

		return dummyFields;
	}

	getCurrentNodeParameter(parameterPath: string): NodeParameterValueType | object | undefined {
		const nodeParameters = this.additionalData.currentNodeParameters;

		if (parameterPath.startsWith('&')) {
			parameterPath = `${this.path.split('.').slice(1, -1).join('.')}.${parameterPath.slice(1)}`;
		}

		const returnData = get(nodeParameters, parameterPath);

		return returnData;
	}
}
