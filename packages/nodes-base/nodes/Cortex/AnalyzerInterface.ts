import type { IDataObject } from 'n8n-workflow';

export const JobStatuses = {
	WAITING: 'Waiting',
	INPROGRESS: 'InProgress',
	SUCCESS: 'Success',
	FAILURE: 'Failure',
	DELETED: 'Deleted',
} as const;

export type JobStatus = (typeof JobStatuses)[keyof typeof JobStatuses];

export const TLPs = {
	white: 0,
	green: 1,
	amber: 2,
	red: 3,
} as const;

export type TLP = (typeof TLPs)[keyof typeof TLPs];

export const ObservableDataTypes = {
	domain: 'domain',
	file: 'file',
	filename: 'filename',
	fqdn: 'fqdn',
	hash: 'hash',
	ip: 'ip',
	mail: 'mail',
	mail_subject: 'mail_subject',
	other: 'other',
	regexp: 'regexp',
	registry: 'registry',
	uri_path: 'uri_path',
	url: 'url',
	'user-agent': 'user-agent',
} as const;

export type ObservableDataType = (typeof ObservableDataTypes)[keyof typeof ObservableDataTypes];

export interface IJob {
	id?: string;
	organization?: string;
	analyzerDefinitionId?: string;
	analyzerId?: string;
	analyzerName?: string;
	dataType?: ObservableDataType;
	status?: JobStatus;
	data?: string;
	attachment?: IDataObject;
	parameters?: IDataObject;
	message?: string;
	tlp?: TLP;
	startDate?: Date;
	endDate?: Date;
	createdAt?: Date;
	createdBy?: string;
	updatedAt?: Date;
	updatedBy?: Date;
	report?: IDataObject | string;
}
export interface IAnalyzer {
	id?: string;
	analyzerDefinitionId?: string;
	name?: string;
	version?: string;
	description?: string;
	author?: string;
	url?: string;
	license?: string;
	dataTypeList?: ObservableDataType[];
	baseConfig?: string;
	jobCache?: number;
	rate?: number;
	rateUnit?: string;
	configuration?: IDataObject;
	createdBy?: string;
	updatedAt?: Date;
	updatedBy?: Date;
}

export interface IResponder {
	id?: string;
	name?: string;
	version?: string;
	description?: string;
	dataTypeList?: string[];
	maxTlp?: number;
	maxPap?: number;
	cortexIds?: string[] | undefined;
}
