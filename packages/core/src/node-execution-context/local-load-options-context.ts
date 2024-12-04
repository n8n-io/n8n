import { get } from 'lodash';
import { ApplicationError } from 'n8n-workflow';
import type {
	INodeParameterResourceLocator,
	IGetNodeParameterOptions,
	INode,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	Workflow,
	ILocalLoadOptionsFunctions,
	FieldValueOption,
} from 'n8n-workflow';

import { extractValue } from '@/ExtractValue';

import { NodeExecutionContext } from './node-execution-context';

export class LocalLoadOptionsContext
	extends NodeExecutionContext
	implements ILocalLoadOptionsFunctions
{
	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		private readonly path: string,
	) {
		super(workflow, node, additionalData, 'internal');
	}

	getWorkflowInputValues(): FieldValueOption[] {
		const { value } = this.getCurrentNodeParameter('workflowId') as INodeParameterResourceLocator;

		const workflowId = value as string;
		if (!workflowId) {
			throw new ApplicationError('No workflowId parameter defined on node!');
		}

		// TODO: load the inputs from the workflow
		const dummyFields = [
			{ name: 'field1', type: 'string' as const },
			{ name: 'field2', type: 'number' as const },
			{ name: 'field3', type: 'boolean' as const },
			{ name: 'field4', type: 'any' as const },
		];

		return dummyFields;
	}

	getCurrentNodeParameter(
		parameterPath: string,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object | undefined {
		const nodeParameters = this.additionalData.currentNodeParameters;

		if (parameterPath.startsWith('&')) {
			parameterPath = `${this.path.split('.').slice(1, -1).join('.')}.${parameterPath.slice(1)}`;
		}

		let returnData = get(nodeParameters, parameterPath);

		// This is outside the try/catch because it throws errors with proper messages
		if (options?.extractValue) {
			const nodeType = this.workflow.nodeTypes.getByNameAndVersion(
				this.node.type,
				this.node.typeVersion,
			);
			returnData = extractValue(
				returnData,
				parameterPath,
				this.node,
				nodeType,
			) as NodeParameterValueType;
		}

		return returnData;
	}
}
