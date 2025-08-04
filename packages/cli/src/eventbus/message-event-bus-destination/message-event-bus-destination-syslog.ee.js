'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.MessageEventBusDestinationSyslog = exports.isMessageEventBusDestinationSyslogOptions =
	void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const syslog_client_1 = __importDefault(require('syslog-client'));
const message_event_bus_destination_ee_1 = require('./message-event-bus-destination.ee');
const event_message_generic_1 = require('../event-message-classes/event-message-generic');
const isMessageEventBusDestinationSyslogOptions = (candidate) => {
	const o = candidate;
	if (!o) return false;
	return o.host !== undefined;
};
exports.isMessageEventBusDestinationSyslogOptions = isMessageEventBusDestinationSyslogOptions;
class MessageEventBusDestinationSyslog extends message_event_bus_destination_ee_1.MessageEventBusDestination {
	constructor(eventBusInstance, options) {
		super(eventBusInstance, options);
		this.__type = options.__type ?? '$$MessageEventBusDestinationSyslog';
		this.label = options.label ?? 'Syslog Server';
		this.host = options.host ?? 'localhost';
		this.port = options.port ?? 514;
		this.protocol = options.protocol ?? 'udp';
		this.facility = options.facility ?? syslog_client_1.default.Facility.Local0;
		this.app_name = options.app_name ?? 'n8n';
		this.eol = options.eol ?? '\n';
		this.expectedStatusCode = options.expectedStatusCode ?? 200;
		this.client = syslog_client_1.default.createClient(this.host, {
			appName: this.app_name,
			facility: syslog_client_1.default.Facility.Local0,
			port: this.port,
			transport:
				options.protocol !== undefined && options.protocol === 'tcp'
					? syslog_client_1.default.Transport.Tcp
					: syslog_client_1.default.Transport.Udp,
		});
		this.logger.debug(`MessageEventBusDestinationSyslog with id ${this.getId()} initialized`);
		this.client.on('error', function (error) {
			di_1.Container.get(backend_common_1.Logger).error(`${error.message}`);
		});
	}
	async receiveFromEventBus(emitterPayload) {
		const { msg, confirmCallback } = emitterPayload;
		let sendResult = false;
		if (msg.eventName !== event_message_generic_1.eventMessageGenericDestinationTestEvent) {
			if (!this.license.isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
		try {
			const serializedMessage = msg.serialize();
			if (this.anonymizeAuditMessages) {
				serializedMessage.payload = msg.anonymize();
			}
			delete serializedMessage.__type;
			this.client.log(
				JSON.stringify(serializedMessage),
				{
					severity: msg.eventName.toLowerCase().endsWith('error')
						? syslog_client_1.default.Severity.Error
						: syslog_client_1.default.Severity.Debug,
					msgid: msg.id,
					timestamp: msg.ts.toJSDate(),
				},
				async (error) => {
					if (error?.message) {
						this.logger.debug(error.message);
					} else {
						confirmCallback(msg, { id: this.id, name: this.label });
						sendResult = true;
					}
				},
			);
		} catch (error) {
			if (error.message) this.logger.debug(error.message);
		}
		if (msg.eventName === event_message_generic_1.eventMessageGenericDestinationTestEvent) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		return sendResult;
	}
	serialize() {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
			expectedStatusCode: this.expectedStatusCode,
			host: this.host,
			port: this.port,
			protocol: this.protocol,
			facility: this.facility,
			app_name: this.app_name,
			eol: this.eol,
		};
	}
	static deserialize(eventBusInstance, data) {
		if (
			'__type' in data &&
			data.__type === '$$MessageEventBusDestinationSyslog' &&
			(0, exports.isMessageEventBusDestinationSyslogOptions)(data)
		) {
			return new MessageEventBusDestinationSyslog(eventBusInstance, data);
		}
		return null;
	}
	toString() {
		return JSON.stringify(this.serialize());
	}
	async close() {
		await super.close();
		this.client.close();
	}
}
exports.MessageEventBusDestinationSyslog = MessageEventBusDestinationSyslog;
//# sourceMappingURL=message-event-bus-destination-syslog.ee.js.map
