import type { Response } from 'express';
import type { WebSocket } from 'ws';

import type { User } from '@/databases/entities/user';
import type { AuthenticatedRequest } from '@/requests';

// TODO: move all push related types here

export type PushRequest = AuthenticatedRequest<{}, {}, {}, { pushRef: string }>;

export type SSEPushRequest = PushRequest & { ws: undefined };
export type WebSocketPushRequest = PushRequest & { ws: WebSocket };

export type PushResponse = Response & { req: PushRequest };

export interface OnPushMessage {
	pushRef: string;
	userId: User['id'];
	msg: unknown;
}
