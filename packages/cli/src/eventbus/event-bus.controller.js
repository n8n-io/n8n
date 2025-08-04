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
exports.EventBusController = void 0;
const decorators_1 = require('@n8n/decorators');
const express_1 = __importDefault(require('express'));
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const event_message_classes_1 = require('./event-message-classes');
const message_event_bus_1 = require('./message-event-bus/message-event-bus');
const message_event_bus_destination_sentry_ee_1 = require('./message-event-bus-destination/message-event-bus-destination-sentry.ee');
const message_event_bus_destination_syslog_ee_1 = require('./message-event-bus-destination/message-event-bus-destination-syslog.ee');
const message_event_bus_destination_webhook_ee_1 = require('./message-event-bus-destination/message-event-bus-destination-webhook.ee');
const isWithIdString = (candidate) => {
	const o = candidate;
	if (!o) return false;
	return o.id !== undefined;
};
const isMessageEventBusDestinationWebhookOptions = (candidate) => {
	const o = candidate;
	if (!o) return false;
	return o.url !== undefined;
};
const isMessageEventBusDestinationOptions = (candidate) => {
	const o = candidate;
	if (!o) return false;
	return o.__type !== undefined;
};
let EventBusController = class EventBusController {
	constructor(eventBus) {
		this.eventBus = eventBus;
	}
	async getEventNames() {
		return event_message_classes_1.eventNamesAll;
	}
	async getDestination(req) {
		if (isWithIdString(req.query)) {
			return await this.eventBus.findDestination(req.query.id);
		} else {
			return await this.eventBus.findDestination();
		}
	}
	async postDestination(req) {
		let result;
		if (isMessageEventBusDestinationOptions(req.body)) {
			switch (req.body.__type) {
				case '$$MessageEventBusDestinationSentry':
					if (
						(0,
						message_event_bus_destination_sentry_ee_1.isMessageEventBusDestinationSentryOptions)(
							req.body,
						)
					) {
						result = await this.eventBus.addDestination(
							new message_event_bus_destination_sentry_ee_1.MessageEventBusDestinationSentry(
								this.eventBus,
								req.body,
							),
						);
					}
					break;
				case '$$MessageEventBusDestinationWebhook':
					if (isMessageEventBusDestinationWebhookOptions(req.body)) {
						result = await this.eventBus.addDestination(
							new message_event_bus_destination_webhook_ee_1.MessageEventBusDestinationWebhook(
								this.eventBus,
								req.body,
							),
						);
					}
					break;
				case '$$MessageEventBusDestinationSyslog':
					if (
						(0,
						message_event_bus_destination_syslog_ee_1.isMessageEventBusDestinationSyslogOptions)(
							req.body,
						)
					) {
						result = await this.eventBus.addDestination(
							new message_event_bus_destination_syslog_ee_1.MessageEventBusDestinationSyslog(
								this.eventBus,
								req.body,
							),
						);
					}
					break;
				default:
					throw new bad_request_error_1.BadRequestError(
						`Body is missing ${req.body.__type} options or type ${req.body.__type} is unknown`,
					);
			}
			if (result) {
				await result.saveToDb();
				return {
					...result.serialize(),
					eventBusInstance: undefined,
				};
			}
			throw new bad_request_error_1.BadRequestError('There was an error adding the destination');
		}
		throw new bad_request_error_1.BadRequestError(
			'Body is not configuring MessageEventBusDestinationOptions',
		);
	}
	async sendTestMessage(req) {
		if (isWithIdString(req.query)) {
			return await this.eventBus.testDestination(req.query.id);
		}
		return false;
	}
	async deleteDestination(req) {
		if (isWithIdString(req.query)) {
			await this.eventBus.removeDestination(req.query.id);
			return await this.eventBus.deleteDestination(req.query.id);
		} else {
			throw new bad_request_error_1.BadRequestError('Query is missing id');
		}
	}
};
exports.EventBusController = EventBusController;
__decorate(
	[
		(0, decorators_1.Get)('/eventnames'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	EventBusController.prototype,
	'getEventNames',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:logStreaming'),
		(0, decorators_1.Get)('/destination'),
		(0, decorators_1.GlobalScope)('eventBusDestination:list'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	EventBusController.prototype,
	'getDestination',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:logStreaming'),
		(0, decorators_1.Post)('/destination'),
		(0, decorators_1.GlobalScope)('eventBusDestination:create'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	EventBusController.prototype,
	'postDestination',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:logStreaming'),
		(0, decorators_1.Get)('/testmessage'),
		(0, decorators_1.GlobalScope)('eventBusDestination:test'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	EventBusController.prototype,
	'sendTestMessage',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:logStreaming'),
		(0, decorators_1.Delete)('/destination'),
		(0, decorators_1.GlobalScope)('eventBusDestination:delete'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	EventBusController.prototype,
	'deleteDestination',
	null,
);
exports.EventBusController = EventBusController = __decorate(
	[
		(0, decorators_1.RestController)('/eventbus'),
		__metadata('design:paramtypes', [message_event_bus_1.MessageEventBus]),
	],
	EventBusController,
);
//# sourceMappingURL=event-bus.controller.js.map
