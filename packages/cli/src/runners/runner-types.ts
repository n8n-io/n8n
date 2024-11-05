import type { Response } from 'express';
import type { INodeExecutionData } from 'n8n-workflow';
import type WebSocket from 'ws';

import type { TaskRunner } from './task-broker.service';
import type { AuthlessRequest } from '../requests';

/**
 * Specifies what data should be included for a task data request.
 */
export interface TaskDataRequestParams {
	dataOfNodes: string[] | 'all';
	prevNode: boolean;
	/** Whether input data for the node should be included */
	input: boolean;
	/** Whether env provider's state should be included */
	env: boolean;
}

export interface DisconnectAnalyzer {
	determineDisconnectReason(runnerId: TaskRunner['id']): Promise<Error>;
}

export type DataRequestType = 'input' | 'node' | 'all';

export interface TaskResultData {
	result: INodeExecutionData[];
	customData?: Record<string, string>;
}

export interface TaskRunnerServerInitRequest
	extends AuthlessRequest<{}, {}, {}, { id: TaskRunner['id']; token?: string }> {
	ws: WebSocket;
}

export type TaskRunnerServerInitResponse = Response & { req: TaskRunnerServerInitRequest };
