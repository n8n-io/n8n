import type { Response } from 'express';
import type { INodeExecutionData } from 'n8n-workflow';
import type WebSocket from 'ws';

import type { TaskRunner } from './task-broker.service';
import type { AuthlessRequest } from '../requests';

export interface DisconnectAnalyzer {
	isCloudDeployment: boolean;

	toDisconnectError(opts: DisconnectErrorOptions): Promise<Error>;
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

export type DisconnectReason = 'shutting-down' | 'failed-heartbeat-check' | 'unknown';

export type DisconnectErrorOptions = {
	runnerId?: TaskRunner['id'];
	reason?: DisconnectReason;
	heartbeatInterval?: number;
};
