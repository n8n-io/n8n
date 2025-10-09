import type { INodeTypeBaseDescription } from 'n8n-workflow';

import type {
	NeededNodeType,
	AVAILABLE_RPC_METHODS,
	TaskDataRequestParams,
	TaskResultData,
} from './runner-types';

export namespace BrokerMessage {
	export namespace ToRunner {
		export interface InfoRequest {
			type: 'broker:inforequest';
		}

		export interface RunnerRegistered {
			type: 'broker:runnerregistered';
		}

		export interface TaskOfferAccept {
			type: 'broker:taskofferaccept';
			taskId: string;
			offerId: string;
		}

		export interface TaskCancel {
			type: 'broker:taskcancel';
			taskId: string;
			reason: string;
		}

		export interface TaskSettings {
			type: 'broker:tasksettings';
			taskId: string;
			settings: unknown;
		}

		export interface RPCResponse {
			type: 'broker:rpcresponse';
			callId: string;
			taskId: string;
			status: 'success' | 'error';
			data: unknown;
		}

		export interface TaskDataResponse {
			type: 'broker:taskdataresponse';
			taskId: string;
			requestId: string;
			data: unknown;
		}

		export interface NodeTypes {
			type: 'broker:nodetypes';
			taskId: string;
			requestId: string;
			nodeTypes: INodeTypeBaseDescription[];
		}

		export type All =
			| InfoRequest
			| TaskOfferAccept
			| TaskCancel
			| TaskSettings
			| RunnerRegistered
			| RPCResponse
			| TaskDataResponse
			| NodeTypes;
	}

	export namespace ToRequester {
		export interface TaskReady {
			type: 'broker:taskready';
			requestId: string;
			taskId: string;
		}

		export interface TaskDone {
			type: 'broker:taskdone';
			taskId: string;
			data: TaskResultData;
		}

		export interface TaskError {
			type: 'broker:taskerror';
			taskId: string;
			error: unknown;
		}

		export interface TaskDataRequest {
			type: 'broker:taskdatarequest';
			taskId: string;
			requestId: string;
			requestParams: TaskDataRequestParams;
		}

		export interface NodeTypesRequest {
			type: 'broker:nodetypesrequest';
			taskId: string;
			requestId: string;
			requestParams: NeededNodeType[];
		}

		export interface RPC {
			type: 'broker:rpc';
			callId: string;
			taskId: string;
			name: (typeof AVAILABLE_RPC_METHODS)[number];
			params: unknown[];
		}

		export type All = TaskReady | TaskDone | TaskError | TaskDataRequest | NodeTypesRequest | RPC;
	}
}

export namespace RequesterMessage {
	export namespace ToBroker {
		export interface TaskSettings {
			type: 'requester:tasksettings';
			taskId: string;
			settings: unknown;
		}

		export interface TaskCancel {
			type: 'requester:taskcancel';
			taskId: string;
			reason: string;
		}

		export interface TaskDataResponse {
			type: 'requester:taskdataresponse';
			taskId: string;
			requestId: string;
			data: unknown;
		}

		export interface NodeTypesResponse {
			type: 'requester:nodetypesresponse';
			taskId: string;
			requestId: string;
			nodeTypes: INodeTypeBaseDescription[];
		}

		export interface RPCResponse {
			type: 'requester:rpcresponse';
			taskId: string;
			callId: string;
			status: 'success' | 'error';
			data: unknown;
		}

		export interface TaskRequest {
			type: 'requester:taskrequest';
			requestId: string;
			taskType: string;
		}

		export type All =
			| TaskSettings
			| TaskCancel
			| RPCResponse
			| TaskDataResponse
			| NodeTypesResponse
			| TaskRequest;
	}
}

export namespace RunnerMessage {
	export namespace ToBroker {
		export interface Info {
			type: 'runner:info';
			name: string;
			types: string[];
		}

		export interface TaskAccepted {
			type: 'runner:taskaccepted';
			taskId: string;
		}

		export interface TaskRejected {
			type: 'runner:taskrejected';
			taskId: string;
			reason: string;
		}

		/** Message where launcher (impersonating runner) requests broker to hold task until runner is ready. */
		export interface TaskDeferred {
			type: 'runner:taskdeferred';
			taskId: string;
		}

		export interface TaskDone {
			type: 'runner:taskdone';
			taskId: string;
			data: TaskResultData;
		}

		export interface TaskError {
			type: 'runner:taskerror';
			taskId: string;
			error: unknown;
		}

		export interface TaskOffer {
			type: 'runner:taskoffer';
			offerId: string;
			taskType: string;
			validFor: number;
		}

		export interface TaskDataRequest {
			type: 'runner:taskdatarequest';
			taskId: string;
			requestId: string;
			requestParams: TaskDataRequestParams;
		}

		export interface NodeTypesRequest {
			type: 'runner:nodetypesrequest';
			taskId: string;
			requestId: string;

			/**
			 * Which node types should be included in the runner's node types request.
			 *
			 * Node types are needed only when the script relies on paired item functionality.
			 * If so, we need only the node types not already cached in the runner.
			 *
			 * TODO: In future we can trim this down to only node types in the paired item chain,
			 * rather than assuming we need all node types in the workflow.
			 *
			 * @example [{ name: 'n8n-nodes-base.httpRequest', version: 1 }]
			 */
			requestParams: NeededNodeType[];
		}

		export interface RPC {
			type: 'runner:rpc';
			callId: string;
			taskId: string;
			name: (typeof AVAILABLE_RPC_METHODS)[number];
			params: unknown[];
		}

		export type All =
			| Info
			| TaskDone
			| TaskError
			| TaskAccepted
			| TaskRejected
			| TaskDeferred
			| TaskOffer
			| RPC
			| TaskDataRequest
			| NodeTypesRequest;
	}
}
