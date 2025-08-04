'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ChatServer = void 0;
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const http_1 = require('http');
const url_1 = require('url');
const ws_1 = require('ws');
const chat_service_1 = require('./chat-service');
let ChatServer = class ChatServer {
	constructor(chatService) {
		this.chatService = chatService;
		this.wsServer = new ws_1.Server({ noServer: true });
	}
	setup(server, app) {
		server.on('upgrade', (req, socket, head) => {
			const parsedUrl = (0, url_1.parse)(req.url ?? '');
			if (parsedUrl.pathname?.startsWith('/chat')) {
				this.wsServer.handleUpgrade(req, socket, head, (ws) => {
					this.attachToApp(req, ws, app);
				});
			}
		});
		app.use('/chat', async (req) => {
			await this.chatService.startSession(req);
		});
	}
	attachToApp(req, ws, app) {
		req.ws = ws;
		const res = new http_1.ServerResponse(req);
		res.writeHead = (statusCode) => {
			if (statusCode > 200) ws.close();
			return res;
		};
		app.handle(req, res);
	}
	shutdown() {
		this.wsServer.close();
	}
};
exports.ChatServer = ChatServer;
__decorate(
	[
		(0, decorators_1.OnShutdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	ChatServer.prototype,
	'shutdown',
	null,
);
exports.ChatServer = ChatServer = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [chat_service_1.ChatService])],
	ChatServer,
);
//# sourceMappingURL=chat-server.js.map
