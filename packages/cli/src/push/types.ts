import type { Response } from 'express';
import type { WebSocket } from 'ws';

import type { User } from '@db/entities/User';
import type { AuthenticatedRequest } from '@/requests';

// TODO: move all push related types here

export type PushRequest = AuthenticatedRequest<{}, {}, {}, { sessionId: string }>;

export type SSEPushRequest = PushRequest & { ws: undefined; userId: User['id'] };
export type WebSocketPushRequest = PushRequest & { ws: WebSocket; userId: User['id'] };

export type PushResponse = Response & { req: PushRequest };

export type OnPushMessageEvent = {
	sessionId: string;
	userId: User['id'];
	msg: unknown;
};
