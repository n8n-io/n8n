import type {
	ICredentialDataDecryptedObject,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IPollFunctions,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise } from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	getAdditionalKeys,
	getBinaryHelperFunctions,
	getCredentials,
	getNodeParameter,
	getRequestHelperFunctions,
	getSchedulingFunctions,
	returnJsonArray,
} from '@/NodeExecuteFunctions';

import { NodeExecutionContext } from './node-execution-context';

const throwOnEmit = () => {
	throw new ApplicationError('Overwrite PollContext.__emit function');
};

const throwOnEmitError = () => {
	throw new ApplicationError('Overwrite PollContext.__emitError function');
};

export class PollContext extends NodeExecutionContext implements IPollFunctions {
	readonly helpers: IPollFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		private readonly activation: WorkflowActivateMode,
		readonly __emit: IPollFunctions['__emit'] = throwOnEmit,
		readonly __emitError: IPollFunctions['__emitError'] = throwOnEmitError,
	) {
		super(workflow, node, additionalData, mode);

		this.helpers = {
			createDeferredPromise,
			returnJsonArray,
			...getRequestHelperFunctions(workflow, node, additionalData),
			...getBinaryHelperFunctions(additionalData, workflow.id),
			...getSchedulingFunctions(workflow),
		};
	}

	getActivationMode() {
		return this.activation;
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await getCredentials<T>(this.workflow, this.node, type, this.additionalData, this.mode);
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
