import { ServerResponse } from 'http';
import type { Server } from 'http';
import type { Socket } from 'net';
import type { Application, RequestHandler } from 'express';
import { Server as WSServer } from 'ws';
import { parse as parseUrl } from 'url';
import config from '@/config';
import { resolveJwt } from '@/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/constants';
import { SSEPush } from './sse.push';
import { WebSocketPush } from './websocket.push';
import type { Push, PushResponse, SSEPushRequest, WebSocketPushRequest } from './types';
export type { Push } from './types';

const useWebSockets = config.getEnv('push.backend') === 'websocket';

let pushInstance: Push;
export const getPushInstance = () => {
	if (!pushInstance) pushInstance = useWebSockets ? new WebSocketPush() : new SSEPush();
	return pushInstance;
};

export const setupPushServer = (restEndpoint: string, server: Server, app: Application) => {
	if (useWebSockets) {
		const wsServer = new WSServer({ noServer: true });
		server.on('upgrade', (request: WebSocketPushRequest, socket: Socket, head) => {
			if (parseUrl(request.url).pathname === `/${restEndpoint}/push`) {
				wsServer.handleUpgrade(request, socket, head, (ws) => {
					request.ws = ws;

					const response = new ServerResponse(request);
					response.writeHead = (statusCode) => {
						if (statusCode > 200) ws.close();
						return response;
					};

					// @ts-ignore
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					app.handle(request, response);
				});
			}
		});
	}
};

export const setupPushHandler = (
	restEndpoint: string,
	app: Application,
	isUserManagementEnabled: boolean,
) => {
	const push = getPushInstance();
	const endpoint = `/${restEndpoint}/push`;

	const pushValidationMiddleware: RequestHandler = async (
		req: SSEPushRequest | WebSocketPushRequest,
		res,
		next,
	) => {
		const ws = req.ws;

		const { sessionId } = req.query;
		if (sessionId === undefined) {
			if (ws) {
				ws.send('The query parameter "sessionId" is missing!');
				ws.close(400);
			} else {
				next(new Error('The query parameter "sessionId" is missing!'));
			}
			return;
		}

		// Handle authentication
		if (isUserManagementEnabled) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				const authCookie: string = req.cookies?.[AUTH_COOKIE_NAME] ?? '';
				await resolveJwt(authCookie);
			} catch (error) {
				if (ws) {
					ws.send(`Unauthorized: ${(error as Error).message}`);
					ws.close(401);
				} else {
					res.status(401).send('Unauthorized');
				}
				return;
			}
		}

		next();
	};

	app.use(
		endpoint,
		pushValidationMiddleware,
		(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) => {
			if (req.ws) {
				(push as WebSocketPush).add(req.query.sessionId, req.ws);
			} else if (!useWebSockets) {
				(push as SSEPush).add(req.query.sessionId, { req, res });
			} else {
				res.status(401).send('Unauthorized');
			}
		},
	);
};
