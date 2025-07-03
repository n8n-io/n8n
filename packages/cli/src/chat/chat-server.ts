import { Service } from '@n8n/di';
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

type UpgradeRecord = { count: number; lastAttempt: number };

const UPGRADE_LIMIT = 20;
const UPGRADE_WINDOW = 60 * 1000;

@Service()
export class ChatServer {
	private readonly wsServer = new WebSocketServer({ noServer: true });

	private readonly upgradeAttempts = new Map<string, UpgradeRecord>();

	constructor(private readonly chatService: ChatService) {}

	setup(server: HttpServer, app: Application) {
		server.on('upgrade', (req: ChatRequest, socket, head) => {
			const ip = req.socket.remoteAddress;

			if (!ip) {
				socket.destroy();
				return;
			}

			const now = Date.now();

			const record: UpgradeRecord = this.upgradeAttempts.get(ip) || { count: 0, lastAttempt: now };

			if (now - record.lastAttempt > UPGRADE_WINDOW) {
				record.count = 0;
			}

			record.count += 1;
			record.lastAttempt = now;

			if (record.count > UPGRADE_LIMIT) {
				socket.destroy();
				return;
			}

			this.upgradeAttempts.set(ip, record);

			if (parseUrl(req.url).pathname?.startsWith('/chat')) {
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
}
