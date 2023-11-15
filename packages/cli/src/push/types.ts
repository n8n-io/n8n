import type { User } from '@db/entities/User';
import type { Request, Response } from 'express';
import type { WebSocket } from 'ws';

// TODO: move all push related types here

export type PushRequest = Request<{}, {}, {}, { sessionId: string }>;

export type SSEPushRequest = PushRequest & { ws: undefined; userId: User['id'] };
export type WebSocketPushRequest = PushRequest & { ws: WebSocket; userId: User['id'] };

export type PushResponse = Response & { req: PushRequest };

export type OnPushMessageEvent = {
	sessionId: string;
	userId: User['id'];
	msg: unknown;
};
