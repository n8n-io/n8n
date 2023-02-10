import type { Request, Response } from 'express';
import type { WebSocket } from 'ws';
import type { SSEPush } from './sse.push';
import type { WebSocketPush } from './websocket.push';

// TODO: move all push related types here

export type Push = SSEPush | WebSocketPush;

export type PushRequest = Request<{}, {}, {}, { sessionId: string }>;

export type SSEPushRequest = PushRequest & { ws: undefined };
export type WebSocketPushRequest = PushRequest & { ws: WebSocket };

export type PushResponse = Response & { req: PushRequest };
