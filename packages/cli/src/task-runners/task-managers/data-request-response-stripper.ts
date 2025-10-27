import type { DataRequestResponse, BrokerMessage } from '@n8n/task-runner';
import type {
	EnvProviderState,
	IPinData,
	IRunData,
	IRunExecutionData,
	ITaskDataConnections,
} from 'n8n-workflow';
import * as a from 'node:assert/strict';

/**
 * Strips data from data request response based on the specified parameters
 */
export class DataRequestResponseStripper {
	private requestedNodeNames = new Set<string>();

	constructor(
		private readonly dataResponse: DataRequestResponse,
		private readonly stripParams: BrokerMessage.ToRequester.TaskDataRequest['requestParams'],
	) {
		this.requestedNodeNames = new Set(stripParams.dataOfNodes);

		if (this.stripParams.prevNode && this.stripParams.dataOfNodes !== 'all') {
			this.requestedNodeNames.add(this.determinePrevNodeName());
		}
	}

	/**
	 * Builds a response to the data request
	 */
	strip(): DataRequestResponse {
		const { dataResponse: dr } = this;

		return {
			...dr,
			inputData: this.stripInputData(dr.inputData),
			envProviderState: this.stripEnvProviderState(dr.envProviderState),
			runExecutionData: this.stripRunExecutionData(dr.runExecutionData),
		};
	}

	private stripRunExecutionData(runExecutionData: IRunExecutionData): IRunExecutionData {
		if (this.stripParams.dataOfNodes === 'all') {
			return runExecutionData;
		}

		return {
			startData: runExecutionData.startData,
			resultData: {
				error: runExecutionData.resultData.error,
				lastNodeExecuted: runExecutionData.resultData.lastNodeExecuted,
				metadata: runExecutionData.resultData.metadata,
				runData: this.stripRunData(runExecutionData.resultData.runData),
				pinData: this.stripPinData(runExecutionData.resultData.pinData),
			},
			// TODO: We could send `runExecutionData.contextData` only if requested,
			// since it's only needed if $input.context or $("node").context is used.
			executionData: runExecutionData.executionData,
		};
	}

	private stripRunData(runData: IRunData): IRunData {
		return this.filterObjectByNodeNames(runData);
	}

	private stripPinData(pinData: IPinData | undefined): IPinData | undefined {
		return pinData ? this.filterObjectByNodeNames(pinData) : undefined;
	}

	private stripEnvProviderState(envProviderState: EnvProviderState): EnvProviderState {
		if (this.stripParams.env) {
			// In case `isEnvAccessBlocked` = true, the provider state has already sanitized
			// the environment variables and we can return it as is.
			return envProviderState;
		}

		return {
			env: {},
			isEnvAccessBlocked: envProviderState.isEnvAccessBlocked,
			isProcessAvailable: envProviderState.isProcessAvailable,
		};
	}

	private stripInputData(inputData: ITaskDataConnections): ITaskDataConnections {
		if (!this.stripParams.input.include) {
			return {};
		}

		return this.stripParams.input.chunk ? this.stripChunkedInputData(inputData) : inputData;
	}

	private stripChunkedInputData(inputData: ITaskDataConnections): ITaskDataConnections {
		const { chunk } = this.stripParams.input;
		a.ok(chunk);

		const inputItems = inputData.main?.[0];
		if (!inputItems) {
			return inputData;
		}

		// If a chunk of the input data is requested, we only return that chunk
		// It is the responsibility of the requester to rebuild the input data
		const chunkInputItems = inputItems.slice(chunk.startIndex, chunk.startIndex + chunk.count);
		const chunkedInputData: ITaskDataConnections = {
			...inputData,
			main: [chunkInputItems],
		};

		return chunkedInputData;
	}

	/**
	 * Assuming the given `obj` is an object where the keys are node names,
	 * filters the object to only include the node names that are requested.
	 */
	private filterObjectByNodeNames<T extends Record<string, unknown>>(obj: T): T {
		if (this.stripParams.dataOfNodes === 'all') {
			return obj;
		}

		const filteredObj: T = {} as T;

		for (const nodeName in obj) {
			if (!Object.prototype.hasOwnProperty.call(obj, nodeName)) {
				continue;
			}

			if (this.requestedNodeNames.has(nodeName)) {
				filteredObj[nodeName] = obj[nodeName];
			}
		}

		return filteredObj;
	}

	private determinePrevNodeName(): string {
		const sourceData = this.dataResponse.connectionInputSource?.main?.[0];
		if (!sourceData) {
			return '';
		}

		return sourceData.previousNode;
	}
}
