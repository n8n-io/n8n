'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.EventMessageQueue = void 0;
const abstract_event_message_1 = require('./abstract-event-message');
class EventMessageQueue extends abstract_event_message_1.AbstractEventMessage {
	constructor(options) {
		super(options);
		this.__type = '$$EventMessageRunner';
		if (options.payload) this.setPayload(options.payload);
		if (options.anonymize) {
			this.anonymize();
		}
	}
	setPayload(payload) {
		this.payload = payload;
		return this;
	}
	deserialize(data) {
		if ((0, abstract_event_message_1.isEventMessageOptionsWithType)(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload);
		}
		return this;
	}
}
exports.EventMessageQueue = EventMessageQueue;
//# sourceMappingURL=event-message-queue.js.map
