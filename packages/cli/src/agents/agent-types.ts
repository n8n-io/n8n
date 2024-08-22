import type { INodeExecutionData } from 'n8n-workflow';

export namespace N8nMessage {
	export namespace ToAgent {
		export interface InfoRequest {
			type: 'n8n:inforequest';
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
			jobId: Job['id'];
			settings: unknown;
		}
		export type All = InfoRequest | JobOfferAccept | JobCancel | JobSettings;
	}

	export namespace ToWorker {
		export interface JobReady {
			type: 'n8n:jobready';
			jobId: Job['id'];
		}

		export type All = JobReady;
	}
}

export namespace WorkerMessage {
	export namespace ToN8n {
		export interface JobSettings {
			type: 'worker:jobsettings';
			jobId: Job['id'];
			settings: unknown;
		}

		export type All = JobSettings;
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
		export type All = Info | JobDone | JobError | JobAccepted | JobRejected;
	}
}

export interface Agent {
	id: string;
	name?: string;
	jobTypes: string[];
	lastSeen: Date;
}

export interface Job {
	id: string;
	agentId: Agent['id'];
	workerId: string;
	jobType: string;

	jobDoneHandler: (data: INodeExecutionData[]) => void;
	jobErrorHandler: (error: unknown) => void;
}

export interface JobOffer {
	offerId: string;
	agentId: Agent['id'];
	jobType: string;
	validFor: number;
	validUntil: number;
}

export interface JobRequest {
	requestId: string;
	workerId: string;
	jobType: string;
	validFor: number;
	validUntil: number;

	acceptInProgress?: boolean;
}
