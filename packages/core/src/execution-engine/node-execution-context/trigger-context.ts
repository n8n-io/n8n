import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	ICredentialDataDecryptedObject,
	INode,
	ITriggerFunctions,
	IWorkflowExecuteAdditionalData,
	SchedulingFunctions,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { NodeExecutionContext } from './node-execution-context';
import { getBinaryHelperFunctions } from './utils/binary-helper-functions';
import { getRequestHelperFunctions } from './utils/request-helper-functions';
import { returnJsonArray } from './utils/return-json-array';
import { getSchedulingFunctions } from './utils/scheduling-helper-functions';
import { getSSHTunnelFunctions } from './utils/ssh-tunnel-helper-functions';

const throwOnEmit = () => {
	throw new UnexpectedError('Overwrite TriggerContext.emit function');
};

const throwOnEmitError = () => {
	throw new UnexpectedError('Overwrite TriggerContext.emitError function');
};

const throwOnSaveFailedExecution = () => {
	throw new UnexpectedError('Overwrite TriggerContext.saveFailedExecution function');
};

export class TriggerContext extends NodeExecutionContext implements ITriggerFunctions {
	readonly helpers: ITriggerFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		private readonly activation: WorkflowActivateMode,
		readonly emit: ITriggerFunctions['emit'] = throwOnEmit,
		readonly emitError: ITriggerFunctions['emitError'] = throwOnEmitError,
		readonly saveFailedExecution: ITriggerFunctions['saveFailedExecution'] = throwOnSaveFailedExecution,
		schedulingFunctions: SchedulingFunctions = getSchedulingFunctions(
			workflow.id,
			workflow.timezone,
			node.id,
		),
	) {
		super(workflow, node, additionalData, mode);

		this.helpers = {
			createDeferredPromise,
			returnJsonArray,
			...getSSHTunnelFunctions(),
			...getRequestHelperFunctions(workflow, node, additionalData),
			...getBinaryHelperFunctions(additionalData, workflow.id),
			...schedulingFunctions,
		};
	}

	getActivationMode() {
		return this.activation;
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await this._getCredentials<T>(type);
	}
}
