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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.Push = void 0;
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const http_1 = require('http');
const pick_1 = __importDefault(require('lodash/pick'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const url_1 = require('url');
const ws_1 = require('ws');
const auth_service_1 = require('@/auth/auth.service');
const constants_1 = require('@/constants');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const typed_emitter_1 = require('@/typed-emitter');
const push_config_1 = require('./push.config');
const sse_push_1 = require('./sse.push');
const websocket_push_1 = require('./websocket.push');
const MAX_PAYLOAD_SIZE_BYTES = 5 * 1024 * 1024;
let Push = class Push extends typed_emitter_1.TypedEmitter {
	constructor(config, instanceSettings, logger, authService, publisher) {
		super();
		this.config = config;
		this.instanceSettings = instanceSettings;
		this.logger = logger;
		this.authService = authService;
		this.publisher = publisher;
		this.useWebSockets = this.config.backend === 'websocket';
		this.isBidirectional = this.useWebSockets;
		this.backend = this.useWebSockets
			? di_1.Container.get(websocket_push_1.WebSocketPush)
			: di_1.Container.get(sse_push_1.SSEPush);
		this.logger = this.logger.scoped('push');
		if (this.useWebSockets) this.backend.on('message', (msg) => this.emit('message', msg));
	}
	getBackend() {
		return this.backend;
	}
	setupPushServer(restEndpoint, server, app) {
		if (this.useWebSockets) {
			const wsServer = new ws_1.Server({ noServer: true });
			server.on('upgrade', (request, socket, upgradeHead) => {
				if ((0, url_1.parse)(request.url).pathname === `/${restEndpoint}/push`) {
					wsServer.handleUpgrade(request, socket, upgradeHead, (ws) => {
						request.ws = ws;
						const response = new http_1.ServerResponse(request);
						response.writeHead = (statusCode) => {
							if (statusCode > 200) ws.close();
							return response;
						};
						app.handle(request, response);
					});
				}
			});
		}
	}
	setupPushHandler(restEndpoint, app) {
		app.use(`/${restEndpoint}/push`, this.authService.createAuthMiddleware(false), (req, res) =>
			this.handleRequest(req, res),
		);
	}
	handleRequest(req, res) {
		const {
			ws,
			query: { pushRef },
			user,
			headers,
		} = req;
		let connectionError = '';
		const originHost = headers.origin?.replace(/^https?:\/\//, '');
		if (!pushRef) {
			connectionError = 'The query parameter "pushRef" is missing!';
		} else if (!originHost) {
			this.logger.warn('Origin header is missing');
			connectionError = 'Invalid origin!';
		} else if (backend_common_1.inProduction) {
			const expectedHost =
				typeof headers['x-forwarded-host'] === 'string'
					? headers['x-forwarded-host']
					: headers.host;
			if (expectedHost !== originHost) {
				this.logger.warn(
					`Origin header does NOT match the expected origin. (Origin: "${originHost}", Expected: "${expectedHost}")`,
					{
						headers: (0, pick_1.default)(headers, [
							'host',
							'origin',
							'x-forwarded-proto',
							'x-forwarded-host',
						]),
					},
				);
				connectionError = 'Invalid origin!';
			}
		}
		if (connectionError) {
			if (ws) {
				ws.send(connectionError);
				ws.close(1008);
				return;
			}
			throw new bad_request_error_1.BadRequestError(connectionError);
		}
		if (req.ws) {
			this.backend.add(pushRef, user.id, req.ws);
		} else if (!this.useWebSockets) {
			this.backend.add(pushRef, user.id, { req, res });
		} else {
			res.status(401).send('Unauthorized');
			return;
		}
		this.emit('editorUiConnected', pushRef);
	}
	broadcast(pushMsg) {
		this.backend.sendToAll(pushMsg);
	}
	hasPushRef(pushRef) {
		return this.backend.hasPushRef(pushRef);
	}
	send(pushMsg, pushRef) {
		if (this.shouldRelayViaPubSub(pushRef)) {
			this.relayViaPubSub(pushMsg, pushRef);
			return;
		}
		this.backend.sendToOne(pushMsg, pushRef);
	}
	sendToUsers(pushMsg, userIds) {
		this.backend.sendToUsers(pushMsg, userIds);
	}
	onShutdown() {
		this.backend.closeAllConnections();
	}
	shouldRelayViaPubSub(pushRef) {
		const { isWorker, isMultiMain } = this.instanceSettings;
		return isWorker || (isMultiMain && !this.hasPushRef(pushRef));
	}
	handleRelayExecutionLifecycleEvent({ pushRef, ...pushMsg }) {
		if (!this.hasPushRef(pushRef)) return;
		this.send(pushMsg, pushRef);
	}
	relayViaPubSub(pushMsg, pushRef) {
		const eventSizeBytes = new TextEncoder().encode(JSON.stringify(pushMsg.data)).length;
		if (eventSizeBytes <= MAX_PAYLOAD_SIZE_BYTES) {
			void this.publisher.publishCommand({
				command: 'relay-execution-lifecycle-event',
				payload: { ...pushMsg, pushRef },
			});
			return;
		}
		const pushMsgCopy = (0, n8n_workflow_1.deepCopy)(pushMsg);
		const toMb = (bytes) => (bytes / (1024 * 1024)).toFixed(0);
		const eventMb = toMb(eventSizeBytes);
		const maxMb = toMb(MAX_PAYLOAD_SIZE_BYTES);
		const { type } = pushMsgCopy;
		this.logger.warn(`Size of "${type}" (${eventMb} MB) exceeds max size ${maxMb} MB. Trimming...`);
		if (type === 'nodeExecuteAfter') {
			pushMsgCopy.data.itemCount = pushMsgCopy.data.data.data?.main[0]?.length ?? 1;
			pushMsgCopy.data.data.data = constants_1.TRIMMED_TASK_DATA_CONNECTIONS;
		} else if (type === 'executionFinished') {
			pushMsgCopy.data.rawData = '';
		}
		void this.publisher.publishCommand({
			command: 'relay-execution-lifecycle-event',
			payload: { ...pushMsgCopy, pushRef },
		});
	}
};
exports.Push = Push;
__decorate(
	[
		(0, decorators_1.OnShutdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	Push.prototype,
	'onShutdown',
	null,
);
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('relay-execution-lifecycle-event', { instanceType: 'main' }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	Push.prototype,
	'handleRelayExecutionLifecycleEvent',
	null,
);
exports.Push = Push = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			push_config_1.PushConfig,
			n8n_core_1.InstanceSettings,
			backend_common_1.Logger,
			auth_service_1.AuthService,
			publisher_service_1.Publisher,
		]),
	],
	Push,
);
//# sourceMappingURL=index.js.map
