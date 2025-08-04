'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isEventMessageConfirm = exports.EventMessageConfirm = void 0;
const luxon_1 = require('luxon');
class EventMessageConfirm {
	constructor(confirm, source) {
		this.__type = '$$EventMessageConfirm';
		this.confirm = confirm;
		this.ts = luxon_1.DateTime.now();
		if (source) this.source = source;
	}
	serialize() {
		return {
			__type: this.__type,
			confirm: this.confirm,
			ts: this.ts.toISO(),
			source: this.source ?? { name: '', id: '' },
		};
	}
}
exports.EventMessageConfirm = EventMessageConfirm;
const isEventMessageConfirm = (candidate) => {
	const o = candidate;
	if (!o) return false;
	return o.confirm !== undefined && o.ts !== undefined;
};
exports.isEventMessageConfirm = isEventMessageConfirm;
//# sourceMappingURL=event-message-confirm.js.map
