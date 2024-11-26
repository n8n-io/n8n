import { get } from 'lodash';
import type {
	ICredentialDataDecryptedObject,
	IGetNodeParameterOptions,
	INode,
	ILoadOptionsFunctions,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	Workflow,
} from 'n8n-workflow';

import { extractValue } from '@/ExtractValue';
// eslint-disable-next-line import/no-cycle
import { getRequestHelperFunctions, getSSHTunnelFunctions } from '@/NodeExecuteFunctions';

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
		return await this._getCredentials<T>(type);
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
}
