import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

export interface AgentInfoRequest {
	type: 'info';
}
export interface AgentJobRequest {
	type: 'job';
	jobId: string;
	jobType: string;
	settings: IDataObject;
	data: INodeExecutionData[];
}
export type AgentRequest = AgentInfoRequest | AgentJobRequest;

export interface AgentInfoResponse {
	type: 'info';
	name: string;
	types: string[];
}
export interface AgentJobDoneResponse {
	type: 'jobdone';
	jobId: string;
	data: INodeExecutionData[];
}
export interface AgentJobErrorResponse {
	type: 'joberror';
	jobId: string;
	error: unknown;
}
export type AgentResponse = AgentInfoResponse | AgentJobDoneResponse | AgentJobErrorResponse;
