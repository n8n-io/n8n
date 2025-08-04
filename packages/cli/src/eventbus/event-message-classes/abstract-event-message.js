'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AbstractEventMessage =
	exports.isEventMessageOptionsWithType =
	exports.isEventMessageOptions =
	exports.isEventMessage =
		void 0;
const luxon_1 = require('luxon');
const uuid_1 = require('uuid');
function modifyUnderscoredKeys(input, modifier = () => '*') {
	const result = {};
	if (!input) return input;
	Object.keys(input).forEach((key) => {
		if (typeof input[key] === 'string') {
			if (key.substring(0, 1) === '_') {
				const modifierResult = modifier(input[key]);
				if (modifierResult !== undefined) {
					result[key] = modifier(input[key]);
				}
			} else {
				result[key] = input[key];
			}
		} else if (typeof input[key] === 'object') {
			if (Array.isArray(input[key])) {
				result[key] = input[key].map((item) => {
					if (typeof item === 'object' && !Array.isArray(item)) {
						return modifyUnderscoredKeys(item, modifier);
					} else {
						return item;
					}
				});
			} else {
				result[key] = modifyUnderscoredKeys(input[key], modifier);
			}
		} else {
			result[key] = input[key];
		}
	});
	return result;
}
const isEventMessage = (candidate) => {
	const o = candidate;
	if (!o) return false;
	return (
		o.eventName !== undefined &&
		o.id !== undefined &&
		o.ts !== undefined &&
		o.getEventName !== undefined
	);
};
exports.isEventMessage = isEventMessage;
const isEventMessageOptions = (candidate) => {
	const o = candidate;
	if (!o) return false;
	if (o.eventName !== undefined) {
		if (o.eventName.match(/^[\w\s]+\.[\w\s]+\.[\w\s]+/)) {
			return true;
		}
	}
	return false;
};
exports.isEventMessageOptions = isEventMessageOptions;
const isEventMessageOptionsWithType = (candidate, expectedType) => {
	const o = candidate;
	if (!o) return false;
	return o.eventName !== undefined && o.__type !== undefined && o.__type === expectedType;
};
exports.isEventMessageOptionsWithType = isEventMessageOptionsWithType;
class AbstractEventMessage {
	constructor(options) {
		this.setOptionsOrDefault(options);
	}
	anonymize() {
		const anonymizedPayload = modifyUnderscoredKeys(this.payload);
		return anonymizedPayload;
	}
	serialize() {
		return {
			__type: this.__type,
			id: this.id,
			ts: this.ts.toISO(),
			eventName: this.eventName,
			message: this.message,
			payload: this.payload,
		};
	}
	setOptionsOrDefault(options) {
		this.id = options.id ?? (0, uuid_1.v4)();
		this.eventName = options.eventName;
		this.message = options.message ?? options.eventName;
		if (typeof options.ts === 'string') {
			this.ts = luxon_1.DateTime.fromISO(options.ts) ?? luxon_1.DateTime.now();
		} else {
			this.ts = options.ts ?? luxon_1.DateTime.now();
		}
	}
	getEventName() {
		return this.eventName;
	}
	toString() {
		return JSON.stringify(this.serialize());
	}
}
exports.AbstractEventMessage = AbstractEventMessage;
//# sourceMappingURL=abstract-event-message.js.map
