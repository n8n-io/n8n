import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
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

	private stagedCursor?: IDataObject;

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		private readonly activation: WorkflowActivateMode,
		readonly __emit: IPollFunctions['__emit'] = throwOnEmit,
		readonly __emitError: IPollFunctions['__emitError'] = throwOnEmitError,
		private readonly cursor?: IDataObject,
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

	getCursor<T extends IDataObject = IDataObject>(): T | undefined {
		return (this.stagedCursor ?? this.cursor) as T | undefined;
	}

	setCursor<T extends IDataObject = IDataObject>(cursor: T): void {
		this.stagedCursor = cursor;
	}

	/**
	 * The cursor staged during this poll, or `undefined` if the node staged none.
	 *
	 * Clears it, so a later poll on a context that outlives this one cannot re-commit a
	 * value it did not stage. A throw leaves the context unread, so a staged cursor never
	 * reaches the database.
	 */
	__takeStagedCursor(): IDataObject | undefined {
		const staged = this.stagedCursor;
		this.stagedCursor = undefined;
		return staged;
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await this._getCredentials<T>(type);
	}
}
