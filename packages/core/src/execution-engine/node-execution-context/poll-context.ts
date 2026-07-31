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

	/** Keys the last cursor carried, so the next one can clear the ones it drops. */
	private stagedCursorKeys: string[] = [];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		private readonly activation: WorkflowActivateMode,
		readonly __emit: IPollFunctions['__emit'] = throwOnEmit,
		readonly __emitError: IPollFunctions['__emitError'] = throwOnEmitError,
		// The cursor accessors default to the node's static data, so a node written
		// against them keeps its state even when no durable cursor store is injected.
		readonly getCursor: IPollFunctions['getCursor'] = async () => {
			const nodeStaticData = this.getWorkflowStaticData('node');
			return Object.keys(nodeStaticData).length === 0 ? null : { ...nodeStaticData };
		},
		readonly setCursor: IPollFunctions['setCursor'] = (cursor) => {
			// An empty cursor means the node has none, so there is nothing to write.
			if (Object.keys(cursor).length === 0) return;
			const nodeStaticData = this.getWorkflowStaticData('node');
			for (const key of this.stagedCursorKeys) {
				if (!(key in cursor)) delete nodeStaticData[key];
			}
			this.stagedCursorKeys = Object.keys(cursor);
			Object.assign(nodeStaticData, cursor);
		},
		// Nothing to commit by default: `setCursor` has already written the static data
		// that the caller's own static-data save persists.
		readonly __commitCursor: NonNullable<IPollFunctions['__commitCursor']> = async () => {},
		readonly __runPoll: NonNullable<IPollFunctions['__runPoll']> = async (poll) => await poll(),
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
