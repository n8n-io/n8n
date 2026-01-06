import { Service } from '@n8n/di';
import { OnShutdown } from '@n8n/decorators';
import type { Application } from 'express';
import type { Server as HttpServer } from 'http';
import { ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import type { WebSocket } from 'ws';
import { Server as WebSocketServer } from 'ws';

import { ChatService } from './chat-service';
import type { ChatRequest } from './chat-service.types';

interface ExpressApplication extends Application {
	handle: (req: any, res: any) => void;
}

@Service()
export class ChatServer {
	private readonly wsServer = new WebSocketServer({ noServer: true });

	constructor(private readonly chatService: ChatService) {}

	setup(server: HttpServer, app: Application) {
		server.on('upgrade', (req: ChatRequest, socket, head) => {
			const parsedUrl = parseUrl(req.url ?? '');

			if (parsedUrl.pathname?.startsWith('/chat')) {
				this.wsServer.handleUpgrade(req, socket, head, (ws) => {
					this.attachToApp(req, ws, app as ExpressApplication);
				});
			}
		});

		app.use('/chat', async (req: ChatRequest) => {
			await this.chatService.startSession(req);
		});
	}

	private attachToApp(req: ChatRequest, ws: WebSocket, app: ExpressApplication) {
		req.ws = ws;
		const res = new ServerResponse(req);
		res.writeHead = (statusCode) => {
			if (statusCode > 200) ws.close();
			return res;
		};

		app.handle(req, res);
	}

	@OnShutdown()
	shutdown() {
		this.wsServer.close();
	}
}
