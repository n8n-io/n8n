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
import { ApplicationError } from 'n8n-workflow';

import { getAdditionalKeys, getCredentials, getNodeParameter } from '@/NodeExecuteFunctions';
import { BaseContext } from './base-contexts';
import { RequestHelpers } from './helpers/request-helpers';
import { get } from 'lodash';
import { extractValue } from '@/ExtractValue';
import { SSHTunnelHelpers } from './helpers/ssh-tunnel-helpers';

export class LoadOptionsContext extends BaseContext implements ILoadOptionsFunctions {
	readonly helpers: ILoadOptionsFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		private readonly path: string,
	) {
		super(workflow, node, additionalData);

		const requestHelpers = new RequestHelpers(this, workflow, node, additionalData);
		const sshTunnelHelpers = new SSHTunnelHelpers();

		this.helpers = {
			httpRequest: requestHelpers.httpRequest.bind(requestHelpers),
			httpRequestWithAuthentication:
				requestHelpers.httpRequestWithAuthentication.bind(requestHelpers),
			requestWithAuthenticationPaginated:
				requestHelpers.requestWithAuthenticationPaginated.bind(requestHelpers),
			request: requestHelpers.request.bind(requestHelpers),
			requestWithAuthentication: requestHelpers.requestWithAuthentication.bind(requestHelpers),
			requestOAuth1: requestHelpers.requestOAuth1.bind(requestHelpers),
			requestOAuth2: requestHelpers.requestOAuth2.bind(requestHelpers),
			getSSHClient: sshTunnelHelpers.getSSHClient.bind(sshTunnelHelpers),
		};
	}

	// TODO: This is mostly identical to PollContext
	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		// TODO: move `this.mode` to the base class, instead of repeating `internal` everywhere in this class
		return await getCredentials<T>(this.workflow, this.node, type, this.additionalData, 'internal');
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
			if (nodeType === undefined) {
				throw new ApplicationError('Node type is not known so cannot return parameter value', {
					tags: { nodeType: this.node.type },
				});
			}
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

	// TODO: This is identical to PollContext
	getNodeParameter(
		parameterName: string,
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
			'internal',
			getAdditionalKeys(this.additionalData, 'internal', runExecutionData),
			undefined,
			fallbackValue,
			options,
		);
	}
}
