import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteData,
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
		// Nothing to commit by default: the node's own static-data mutations are
		// persisted by the caller's static-data save.
		readonly __commitCursor: NonNullable<IPollFunctions['__commitCursor']> = async () => {},
		readonly __runPoll: NonNullable<IPollFunctions['__runPoll']> = async (poll) => await poll(),
		// Defaults to the node's real static data, for polls run outside a durable
		// staging scope (e.g. a manual test run).
		private readonly resolveNodeStaticData: () => IDataObject = () =>
			this.workflow.getStaticData('node', this.node),
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

	getWorkflowStaticData(type: string): IDataObject {
		if (type === 'node') return this.resolveNodeStaticData();
		return super.getWorkflowStaticData(type);
	}

	getActivationMode() {
		return this.activation;
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		// No real task run backs a poll, so this only exists to surface `node` to
		// the credentials helper (e.g. for policy checks) — `data`/`source` are unused.
		const executeData: IExecuteData = { data: {}, node: this.node, source: null };

		return await this._getCredentials<T>(type, executeData);
	}
}
