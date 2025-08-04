'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.EventMessageAiNode = void 0;
const abstract_event_message_1 = require('./abstract-event-message');
class EventMessageAiNode extends abstract_event_message_1.AbstractEventMessage {
	constructor(options) {
		super(options);
		this.__type = '$$EventMessageAiNode';
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
exports.EventMessageAiNode = EventMessageAiNode;
//# sourceMappingURL=event-message-ai-node.js.map
