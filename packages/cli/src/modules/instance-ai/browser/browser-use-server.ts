import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Application, Request, Response } from 'express';
import { ServerResponse, type Server as HttpServer } from 'http';
import { Server as WSServer } from 'ws';

import {
	BROWSER_USE_WS_NAMESPACE,
	type BrowserUseUpgradeRequest,
} from './browser-use-ws.constants';
import { InstanceAiBrowserSessionService } from './instance-ai-browser-session.service';

/**
 * Serves the Browser Use relay WebSockets (`/browser-use/extension/:sessionId`
 * and `/browser-use/cdp/:sessionId`) over the main n8n server, so no extra port
 * is needed. Authentication is performed per endpoint by the session service.
 */
@Service()
export class BrowserUseServer {
	private readonly wsServer = new WSServer({ noServer: true });

	constructor(private readonly sessionService: InstanceAiBrowserSessionService) {}

	setup(server: HttpServer, app: Application): void {
		server.on('upgrade', (req: BrowserUseUpgradeRequest, socket, head) => {
			const pathname = URL.parse(req.url ?? '', 'http://localhost')?.pathname;
			if (!pathname?.startsWith(`${BROWSER_USE_WS_NAMESPACE}/`)) return;
			this.wsServer.handleUpgrade(req, socket, head, (ws) => {
				req.ws = ws;
				const res = new ServerResponse(req);
				res.writeHead = (statusCode) => {
					if (statusCode > 200) ws.close();
					return res;
				};
				// @ts-expect-error `handle` isn't documented
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				app.handle(req, res);
			});
		});

		app.all(
			`${BROWSER_USE_WS_NAMESPACE}/extension/:sessionId`,
			this.onUpgrade((req) => this.sessionService.handleExtensionUpgrade(req)),
		);
		app.all(
			`${BROWSER_USE_WS_NAMESPACE}/cdp/:sessionId`,
			this.onUpgrade((req) => this.sessionService.handleCdpUpgrade(req)),
		);
	}

	/** Wraps a handler so plain (non-upgrade) HTTP hits get a 426 instead of crashing. */
	private onUpgrade(handle: (req: BrowserUseUpgradeRequest) => void) {
		return (req: Request, res: Response) => {
			const wsReq = req as BrowserUseUpgradeRequest;
			if (!wsReq.ws) {
				res.status(426).end();
				return;
			}
			handle(wsReq);
		};
	}

	@OnShutdown()
	shutdown(): void {
		this.wsServer.close();
	}
}
