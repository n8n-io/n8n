import type {
	ICredentialDataDecryptedObject,
	INode,
	IPollFunctions,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise } from 'n8n-workflow';

import { NodeExecutionContext } from './node-execution-context';
import { getBinaryHelperFunctions } from './utils/binary-helper-functions';
import { getRequestHelperFunctions } from './utils/request-helper-functions';
import { returnJsonArray } from './utils/return-json-array';
import { getSchedulingFunctions } from './utils/scheduling-helper-functions';

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
			...getSchedulingFunctions(workflow.id, workflow.timezone, node.id),
		};
	}

	getActivationMode() {
		return this.activation;
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await this._getCredentials<T>(type);
	}
}
