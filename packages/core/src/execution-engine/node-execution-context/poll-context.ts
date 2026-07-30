import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	ICredentialDataDecryptedObject,
	INode,
	IPollFunctions,
	IWorkflowExecuteAdditionalData,
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

const throwOnEmit = () => {
	throw new UnexpectedError('Overwrite PollContext.__emit function');
};

const throwOnEmitError = () => {
	throw new UnexpectedError('Overwrite PollContext.__emitError function');
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
		readonly getCursor: IPollFunctions['getCursor'] = async () => {
			const nodeStaticData = this.getWorkflowStaticData('node');
			return Object.keys(nodeStaticData).length === 0 ? null : nodeStaticData;
		},
		readonly setCursor: IPollFunctions['setCursor'] = (cursor) => {
			if (Object.keys(cursor).length === 0) return;
			const nodeStaticData = this.getWorkflowStaticData('node');
			for (const key of Object.keys(nodeStaticData)) {
				if (!(key in cursor)) delete nodeStaticData[key];
			}
			Object.assign(nodeStaticData, cursor);
		},
		readonly __commitCursor: IPollFunctions['__commitCursor'] = async () => {},
		readonly __runPoll: IPollFunctions['__runPoll'] = async (poll) => await poll(),
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
