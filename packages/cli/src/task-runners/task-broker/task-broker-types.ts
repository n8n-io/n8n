import type { TaskRunner } from '@n8n/task-runner';
import type { Response } from 'express';
import type WebSocket from 'ws';

import type { AuthlessRequest } from '../../requests';

export interface DisconnectAnalyzer {
	isCloudDeployment: boolean;

	toDisconnectError(opts: DisconnectErrorOptions): Promise<Error>;
}

export interface TaskBrokerServerInitRequest
	extends AuthlessRequest<{}, {}, {}, { id: TaskRunner['id']; token?: string }> {
	ws: WebSocket;
}

export type TaskBrokerServerInitResponse = Response & { req: TaskBrokerServerInitRequest };

export type DisconnectReason = 'shutting-down' | 'failed-heartbeat-check' | 'unknown';

export type DisconnectErrorOptions = {
	runnerId?: TaskRunner['id'];
	reason?: DisconnectReason;
	heartbeatInterval?: number;
};
