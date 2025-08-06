import type { AuthenticatedRequest, User } from '@n8n/db';
import type { Request, Response } from 'express';
import type { WebSocket } from 'ws';

// TODO: move all push related types here

export type PushRequest = AuthenticatedRequest<{}, {}, {}, { pushRef: string }>;

export type SSEPushRequest = PushRequest & { ws: undefined };
export type WebSocketPushRequest = PushRequest & {
	ws: WebSocket;
	headers: Request['headers'];
};

export type PushResponse = Response & {
	req: PushRequest;
	/**
	 * `flush()` is defined in the compression middleware.
	 * This is necessary because the compression middleware sometimes waits
	 * for a certain amount of data before sending the data to the client
	 */
	flush: () => void;
};

export interface OnPushMessage {
	pushRef: string;
	userId: User['id'];
	msg: unknown;
}
