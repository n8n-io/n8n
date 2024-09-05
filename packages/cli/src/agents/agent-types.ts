import type { INodeExecutionData } from 'n8n-workflow';

export type DataRequestType = 'input' | 'node' | 'all';

export namespace N8nMessage {
	export namespace ToAgent {
		export interface InfoRequest {
			type: 'n8n:inforequest';
		}

		export interface AgentRegistered {
			type: 'n8n:agentregistered';
		}

		export interface JobOfferAccept {
			type: 'n8n:jobofferaccept';
			jobId: string;
			offerId: string;
		}

		export interface JobCancel {
			type: 'n8n:jobcancel';
			jobId: string;
			reason: string;
		}

		export interface JobSettings {
			type: 'n8n:jobsettings';
			jobId: string;
			settings: unknown;
		}

		export interface RPCResponse {
			type: 'n8n:rpcresponse';
			callId: string;
			jobId: string;
			status: 'success' | 'error';
			data: unknown;
		}

		export interface JobDataResponse {
			type: 'n8n:jobdataresponse';
			jobId: string;
			requestId: string;
			data: unknown;
		}

		export type All =
			| InfoRequest
			| JobOfferAccept
			| JobCancel
			| JobSettings
			| AgentRegistered
			| RPCResponse
			| JobDataResponse;
	}

	export namespace ToWorker {
		export interface JobReady {
			type: 'n8n:jobready';
			requestId: string;
			jobId: string;
		}

		export interface JobDone {
			type: 'n8n:jobdone';
			jobId: string;
			data: INodeExecutionData[];
		}

		export interface JobError {
			type: 'n8n:joberror';
			jobId: string;
			error: unknown;
		}

		export interface JobDataRequest {
			type: 'n8n:jobdatarequest';
			jobId: string;
			requestId: string;
			requestType: DataRequestType;
			param?: string;
		}

		export interface RPC {
			type: 'n8n:rpc';
			callId: string;
			jobId: string;
			name: (typeof RPC_ALLOW_LIST)[number];
			params: unknown[];
		}

		export type All = JobReady | JobDone | JobError | JobDataRequest | RPC;
	}
}

export namespace WorkerMessage {
	export namespace ToN8n {
		export interface JobSettings {
			type: 'worker:jobsettings';
			jobId: string;
			settings: unknown;
		}

		export interface JobCancel {
			type: 'worker:jobcancel';
			jobId: string;
			reason: string;
		}

		export interface JobDataResponse {
			type: 'worker:jobdataresponse';
			jobId: string;
			requestId: string;
			data: unknown;
		}

		export interface RPCResponse {
			type: 'worker:rpcresponse';
			jobId: string;
			callId: string;
			status: 'success' | 'error';
			data: unknown;
		}

		export interface JobRequest {
			type: 'worker:jobrequest';
			requestId: string;
			jobType: string;
		}

		export type All = JobSettings | JobCancel | RPCResponse | JobDataResponse | JobRequest;
	}
}

export namespace AgentMessage {
	export namespace ToN8n {
		export interface Info {
			type: 'agent:info';
			name: string;
			types: string[];
		}

		export interface JobAccepted {
			type: 'agent:jobaccepted';
			jobId: string;
		}

		export interface JobRejected {
			type: 'agent:jobrejected';
			jobId: string;
			reason: string;
		}

		export interface JobDone {
			type: 'agent:jobdone';
			jobId: string;
			data: INodeExecutionData[];
		}

		export interface JobError {
			type: 'agent:joberror';
			jobId: string;
			error: unknown;
		}

		export interface JobOffer {
			type: 'agent:joboffer';
			offerId: string;
			jobType: string;
			validFor: number;
		}

		export interface JobDataRequest {
			type: 'agent:jobdatarequest';
			jobId: string;
			requestId: string;
			requestType: DataRequestType;
			param?: string;
		}

		export interface RPC {
			type: 'agent:rpc';
			callId: string;
			jobId: string;
			name: (typeof RPC_ALLOW_LIST)[number];
			params: unknown[];
		}

		export type All =
			| Info
			| JobDone
			| JobError
			| JobAccepted
			| JobRejected
			| JobOffer
			| RPC
			| JobDataRequest;
	}
}

export const RPC_ALLOW_LIST = [
	'helpers.httpRequestWithAuthentication',
	'helpers.requestWithAuthenticationPaginated',
	// "helpers.normalizeItems"
	// "helpers.constructExecutionMetaData"
	// "helpers.assertBinaryData"
	'helpers.getBinaryDataBuffer',
	// "helpers.copyInputItems"
	// "helpers.returnJsonArray"
	'helpers.getSSHClient',
	'helpers.createReadStream',
	// "helpers.getStoragePath"
	'helpers.writeContentToFile',
	'helpers.prepareBinaryData',
	'helpers.setBinaryDataBuffer',
	'helpers.copyBinaryFile',
	'helpers.binaryToBuffer',
	// "helpers.binaryToString"
	// "helpers.getBinaryPath"
	'helpers.getBinaryStream',
	'helpers.getBinaryMetadata',
	'helpers.createDeferredPromise',
	'helpers.httpRequest',
] as const;
