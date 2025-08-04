'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
exports.MessageEventBusDestinationSentry = exports.isMessageEventBusDestinationSentryOptions =
	void 0;
const Sentry = __importStar(require('@sentry/node'));
const constants_1 = require('@/constants');
const message_event_bus_destination_ee_1 = require('./message-event-bus-destination.ee');
const event_message_generic_1 = require('../event-message-classes/event-message-generic');
const isMessageEventBusDestinationSentryOptions = (candidate) => {
	const o = candidate;
	if (!o) return false;
	return o.dsn !== undefined;
};
exports.isMessageEventBusDestinationSentryOptions = isMessageEventBusDestinationSentryOptions;
class MessageEventBusDestinationSentry extends message_event_bus_destination_ee_1.MessageEventBusDestination {
	constructor(eventBusInstance, options) {
		super(eventBusInstance, options);
		this.tracesSampleRate = 1.0;
		this.label = options.label ?? 'Sentry DSN';
		this.__type = options.__type ?? '$$MessageEventBusDestinationSentry';
		this.dsn = options.dsn;
		if (options.sendPayload) this.sendPayload = options.sendPayload;
		if (options.tracesSampleRate) this.tracesSampleRate = options.tracesSampleRate;
		const { ENVIRONMENT: environment } = process.env;
		this.sentryClient = new Sentry.NodeClient({
			dsn: this.dsn,
			tracesSampleRate: this.tracesSampleRate,
			environment,
			release: constants_1.N8N_VERSION,
			transport: Sentry.makeNodeTransport,
			integrations: Sentry.getDefaultIntegrations({}),
			stackParser: Sentry.defaultStackParser,
		});
	}
	async receiveFromEventBus(emitterPayload) {
		const { msg, confirmCallback } = emitterPayload;
		let sendResult = false;
		if (!this.sentryClient) return sendResult;
		if (msg.eventName !== event_message_generic_1.eventMessageGenericDestinationTestEvent) {
			if (!this.license.isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
		try {
			const payload = this.anonymizeAuditMessages ? msg.anonymize() : msg.payload;
			const scope = new Sentry.Scope();
			const level = msg.eventName.toLowerCase().endsWith('error') ? 'error' : 'log';
			scope.setLevel(level);
			scope.setTags({
				event: msg.getEventName(),
				logger: this.label ?? this.getId(),
				app: 'n8n',
			});
			if (this.sendPayload) {
				scope.setExtras(payload);
			}
			const sentryResult = this.sentryClient.captureMessage(
				msg.message ?? msg.eventName,
				level,
				{ event_id: msg.id, data: payload },
				scope,
			);
			if (sentryResult) {
				confirmCallback(msg, { id: this.id, name: this.label });
				sendResult = true;
			}
		} catch (error) {
			if (error.message) this.logger.debug(error.message);
		}
		return sendResult;
	}
	serialize() {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
			dsn: this.dsn,
			tracesSampleRate: this.tracesSampleRate,
			sendPayload: this.sendPayload,
		};
	}
	static deserialize(eventBusInstance, data) {
		if (
			'__type' in data &&
			data.__type === '$$MessageEventBusDestinationSentry' &&
			(0, exports.isMessageEventBusDestinationSentryOptions)(data)
		) {
			return new MessageEventBusDestinationSentry(eventBusInstance, data);
		}
		return null;
	}
	toString() {
		return JSON.stringify(this.serialize());
	}
	async close() {
		await super.close();
		await this.sentryClient?.close();
	}
}
exports.MessageEventBusDestinationSentry = MessageEventBusDestinationSentry;
//# sourceMappingURL=message-event-bus-destination-sentry.ee.js.map
