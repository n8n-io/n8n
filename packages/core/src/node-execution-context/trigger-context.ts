import type {
	ICredentialDataDecryptedObject,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ITriggerFunctions,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise } from 'n8n-workflow';

import {
	getAdditionalKeys,
	getCredentials,
	getNodeParameter,
	returnJsonArray,
} from '@/NodeExecuteFunctions';
import { BaseContext } from './base-contexts';
import { BinaryHelpers } from './helpers/binary-helpers';
import { RequestHelpers } from './helpers/request-helpers';
import { SchedulingHelpers } from './helpers/scheduling-helpers';
import { SSHTunnelHelpers } from './helpers/ssh-tunnel-helpers';

const throwOnEmit = () => {
	throw new ApplicationError('Overwrite TriggerContext.emit function');
};

const throwOnEmitError = () => {
	throw new ApplicationError('Overwrite TriggerContext.emitError function');
};

export class TriggerContext extends BaseContext implements ITriggerFunctions {
	readonly helpers: ITriggerFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		private readonly mode: WorkflowExecuteMode,
		private readonly activation: WorkflowActivateMode,
		readonly emit: ITriggerFunctions['emit'] = throwOnEmit,
		readonly emitError: ITriggerFunctions['emitError'] = throwOnEmitError,
	) {
		super(workflow, node, additionalData);

		const binaryHelpers = new BinaryHelpers(workflow, additionalData);
		const requestHelpers = new RequestHelpers(this, workflow, node, additionalData);
		const schedulingHelpers = new SchedulingHelpers(workflow);
		const sshTunnelHelpers = new SSHTunnelHelpers();

		// TODO: This is almost identical to the helpers in PollContext.
		this.helpers = {
			createDeferredPromise: () => createDeferredPromise(),
			returnJsonArray: (items) => returnJsonArray(items),

			getBinaryPath: (id) => binaryHelpers.getBinaryPath(id),
			getBinaryMetadata: (id) => binaryHelpers.getBinaryMetadata(id),
			getBinaryStream: (id) => binaryHelpers.getBinaryStream(id),
			binaryToBuffer: (body) => binaryHelpers.binaryToBuffer(body),
			binaryToString: (body) => binaryHelpers.binaryToString(body),
			prepareBinaryData: binaryHelpers.prepareBinaryData.bind(binaryHelpers),
			setBinaryDataBuffer: binaryHelpers.setBinaryDataBuffer.bind(binaryHelpers),
			copyBinaryFile: () => binaryHelpers.copyBinaryFile(),

			httpRequest: requestHelpers.httpRequest.bind(requestHelpers),
			httpRequestWithAuthentication:
				requestHelpers.httpRequestWithAuthentication.bind(requestHelpers),
			requestWithAuthenticationPaginated:
				requestHelpers.requestWithAuthenticationPaginated.bind(requestHelpers),
			request: requestHelpers.request.bind(requestHelpers),
			requestWithAuthentication: requestHelpers.requestWithAuthentication.bind(requestHelpers),
			requestOAuth1: requestHelpers.requestOAuth1.bind(requestHelpers),
			requestOAuth2: requestHelpers.requestOAuth2.bind(requestHelpers),

			registerCron: schedulingHelpers.registerCron.bind(schedulingHelpers),

			getSSHClient: sshTunnelHelpers.getSSHClient.bind(sshTunnelHelpers),
		};
	}

	// TODO: all the following are duplicated from PollContext. abstract these our into another base class
	getMode() {
		return this.mode;
	}

	getActivationMode() {
		return this.activation;
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await getCredentials<T>(this.workflow, this.node, type, this.additionalData, this.mode);
	}

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
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, runExecutionData),
			undefined,
			fallbackValue,
			options,
		);
	}
}
