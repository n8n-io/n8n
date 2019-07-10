import {
	IConnections,
	ICredentialsDecrypted,
	ICredentialsEncrypted,
	IDataObject,
	IExecutionError,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowSettings,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { ObjectID, Repository } from "typeorm";


import { Url } from 'url';
import { Request } from 'express';

export interface IActivationError {
	time: number;
	error: {
		message: string;
	};
}

export interface ICustomRequest extends Request {
	parsedUrl: Url | undefined;
}


export interface IDatabaseCollections {
	Credentials: Repository<ICredentialsDb> | null;
	Execution: Repository<IExecutionFlattedDb> | null;
	Workflow: Repository<IWorkflowDb> | null;
}


export interface IWorkflowBase {
	id?: number | string | ObjectID;
	name: string;
	active: boolean;
	createdAt: number | string;
	updatedAt: number | string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	staticData?: IDataObject;
}


// Almost identical to editor-ui.Interfaces.ts
export interface IWorkflowDb extends IWorkflowBase {
	id: number | string | ObjectID;
}

export interface IWorkflowResponse extends IWorkflowBase {
	id: string;
}

export interface IWorkflowShortResponse {
	id: string;
	name: string;
	active: boolean;
	createdAt: number | string;
	updatedAt: number | string;
}

export interface ICredentialsBase {
	createdAt: number | string;
	updatedAt: number | string;
}

export interface ICredentialsDb extends ICredentialsBase, ICredentialsEncrypted{
	id: number | string | ObjectID;
}

export interface ICredentialsResponse extends ICredentialsDb {
	id: string;
}

export interface ICredentialsDecryptedDb extends ICredentialsBase, ICredentialsDecrypted {
	id: number | string | ObjectID;
}

export interface ICredentialsDecryptedResponse extends ICredentialsDecryptedDb {
	id: string;
}

export type DatabaseType = 'mongodb' | 'sqlite';

export interface IExecutionBase {
	id?: number | string | ObjectID;
	mode: WorkflowExecuteMode;
	startedAt: number;
	stoppedAt: number;
	workflowId?: string; // To be able to filter executions easily //
	finished: boolean;
	retryOf?: number | string | ObjectID; // If it is a retry, the id of the execution it is a retry of.
	retrySuccessId?: number | string | ObjectID; // If it failed and a retry did succeed. The id of the successful retry.
}

// Data in regular format with references
export interface IExecutionDb extends IExecutionBase {
	data: IRunExecutionData;
	workflowData?: IWorkflowBase;
}

export interface IExecutionPushResponse {
	executionId?: string;
	waitingForWebhook?: boolean;
}

export interface IExecutionResponse extends IExecutionBase {
	id: string;
	data: IRunExecutionData;
	retryOf?: string;
	retrySuccessId?: string;
	workflowData: IWorkflowBase;
}

// Flatted data to save memory when saving in database or transfering
// via REST API
export interface IExecutionFlatted extends IExecutionBase {
	data: string;
	workflowData: IWorkflowBase;
}

export interface IExecutionFlattedDb extends IExecutionBase {
	id: number | string | ObjectID;
	data: string;
	workflowData: IWorkflowBase;
}

export interface IExecutionFlattedResponse extends IExecutionFlatted {
	id: string;
	retryOf?: string;
}

export interface IExecutionsListResponse {
	count: number;
	// results: IExecutionShortResponse[];
	results: IExecutionsSummary[];
}

export interface IExecutionsStopData {
	finished?: boolean;
	mode: WorkflowExecuteMode;
	startedAt: number | string;
	stoppedAt: number | string;
}

export interface IExecutionsSummary {
	id: string;
	mode: WorkflowExecuteMode;
	finished?: boolean;
	retryOf?: string;
	retrySuccessId?: string;
	startedAt: number | string;
	stoppedAt?: number | string;
	workflowId: string;
	workflowName?: string;
}

export interface IExecutionDeleteFilter {
	deleteBefore?: number;
	filters?: IDataObject;
	ids?: string[];
}

export interface IN8nConfig {
	database: IN8nConfigDatabase;
	nodes?: IN8nConfigNodes;
}

export interface IN8nConfigDatabase {
	type: DatabaseType;
	mongodbConfig?: {
		url: string;
	};
}

export interface IN8nConfigNodes {
	exclude?: string[];
}


export interface IN8nUISettings {
	endpointWebhook: string;
	endpointWebhookTest: string;
	saveDataErrorExecution: string;
	saveDataSuccessExecution: string;
	saveManualExecutions: boolean;
	timezone: string;
	urlBaseWebhook: string;
}


export interface IPushData {
	data: IPushDataExecutionFinished | IPushDataNodeExecuteAfter | IPushDataNodeExecuteBefore | IPushDataTestWebhook;
	type: IPushDataType;
}

export type IPushDataType = 'executionFinished' | 'nodeExecuteAfter' | 'nodeExecuteBefore' | 'testWebhookDeleted' | 'testWebhookReceived';


export interface IPushDataExecutionFinished {
	data: IRun;
	executionId: string;
}


export interface IPushDataNodeExecuteAfter {
	data: ITaskData;
	executionId: string;
	nodeName: string;
}


export interface IPushDataNodeExecuteBefore {
	executionId: string;
	nodeName: string;
}


export interface IPushDataTestWebhook {
	workflowId: string;
}


export interface IResponseCallbackData {
	data?: IDataObject | IDataObject[];
	noWebhookResponse?: boolean;
}


export interface IWorkflowErrorData {
	[key: string]: IDataObject | string | number | IExecutionError;
	execution: {
		id?: string;
		error: IExecutionError;
		lastNodeExecuted: string;
		mode: WorkflowExecuteMode;
	};
	workflow: {
		id?: string;
		name: string;
	};
}
