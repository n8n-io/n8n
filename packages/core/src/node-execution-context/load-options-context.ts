import { get } from 'lodash';
import type {
	ICredentialDataDecryptedObject,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	ILoadOptionsFunctions,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	Workflow,
} from 'n8n-workflow';

import { extractValue } from '@/ExtractValue';
// eslint-disable-next-line import/no-cycle
import {
	getAdditionalKeys,
	getCredentials,
	getNodeParameter,
	getRequestHelperFunctions,
	getSSHTunnelFunctions,
} from '@/NodeExecuteFunctions';

import { NodeExecutionContext } from './node-execution-context';

export class LoadOptionsContext extends NodeExecutionContext implements ILoadOptionsFunctions {
	readonly helpers: ILoadOptionsFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		private readonly path: string,
	) {
		super(workflow, node, additionalData, 'internal');

		this.helpers = {
			...getSSHTunnelFunctions(),
			...getRequestHelperFunctions(workflow, node, additionalData),
		};
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await getCredentials<T>(this.workflow, this.node, type, this.additionalData, this.mode);
	}

	getCurrentNodeParameter(
		parameterPath: string,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object | undefined {
		const nodeParameters = this.additionalData.currentNodeParameters;

		if (parameterPath.charAt(0) === '&') {
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

	getCurrentNodeParameters() {
		return this.additionalData.currentNodeParameters;
	}

	getNodeParameter(
		parameterName: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object {
		const runExecutionData: IRunExecutionData | null = null;
		const itemIndex = 0;
		const runIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];

		return getNodeParameter(
			this.workflow,
			runExecutionData,
			runIndex,
			connectionInputData,
			this.node,
			parameterName,
			itemIndex,
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, runExecutionData),
			undefined,
			fallbackValue,
			options,
		);
	}
}
