'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.TypedEmitter = void 0;
const debounce_1 = __importDefault(require('lodash/debounce'));
const node_events_1 = require('node:events');
class TypedEmitter extends node_events_1.EventEmitter {
	constructor() {
		super(...arguments);
		this.debounceWait = 300;
		this.debouncedEmit = (0, debounce_1.default)(
			(eventName, payload) => super.emit(eventName, payload),
			this.debounceWait,
		);
	}
	on(eventName, listener) {
		return super.on(eventName, listener);
	}
	once(eventName, listener) {
		return super.once(eventName, listener);
	}
	off(eventName, listener) {
		return super.off(eventName, listener);
	}
	emit(eventName, payload) {
		return super.emit(eventName, payload);
	}
}
exports.TypedEmitter = TypedEmitter;
//# sourceMappingURL=typed-emitter.js.map
