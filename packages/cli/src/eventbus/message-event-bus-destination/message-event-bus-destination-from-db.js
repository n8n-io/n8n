'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.messageEventBusDestinationFromDb = messageEventBusDestinationFromDb;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const message_event_bus_destination_sentry_ee_1 = require('./message-event-bus-destination-sentry.ee');
const message_event_bus_destination_syslog_ee_1 = require('./message-event-bus-destination-syslog.ee');
const message_event_bus_destination_webhook_ee_1 = require('./message-event-bus-destination-webhook.ee');
function messageEventBusDestinationFromDb(eventBusInstance, dbData) {
	const destinationData = dbData.destination;
	if ('__type' in destinationData) {
		switch (destinationData.__type) {
			case '$$MessageEventBusDestinationSentry':
				return message_event_bus_destination_sentry_ee_1.MessageEventBusDestinationSentry.deserialize(
					eventBusInstance,
					destinationData,
				);
			case '$$MessageEventBusDestinationSyslog':
				return message_event_bus_destination_syslog_ee_1.MessageEventBusDestinationSyslog.deserialize(
					eventBusInstance,
					destinationData,
				);
			case '$$MessageEventBusDestinationWebhook':
				return message_event_bus_destination_webhook_ee_1.MessageEventBusDestinationWebhook.deserialize(
					eventBusInstance,
					destinationData,
				);
			default:
				di_1.Container.get(backend_common_1.Logger).debug(
					'MessageEventBusDestination __type unknown',
				);
		}
	}
	return null;
}
//# sourceMappingURL=message-event-bus-destination-from-db.js.map
