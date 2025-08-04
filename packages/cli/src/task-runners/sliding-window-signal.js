'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SlidingWindowSignal = void 0;
class SlidingWindowSignal {
	constructor(eventEmitter, eventName, opts = {}) {
		this.eventEmitter = eventEmitter;
		this.eventName = eventName;
		this.lastSignal = null;
		this.lastSignalTime = 0;
		const { windowSizeInMs = 500 } = opts;
		this.windowSizeInMs = windowSizeInMs;
		eventEmitter.on(eventName, (signal) => {
			this.lastSignal = signal;
			this.lastSignalTime = Date.now();
		});
	}
	async getSignal() {
		const timeSinceLastEvent = Date.now() - this.lastSignalTime;
		if (timeSinceLastEvent <= this.windowSizeInMs) return this.lastSignal;
		return await new Promise((resolve) => {
			let timeoutTimerId = null;
			const onExit = (signal) => {
				if (timeoutTimerId) clearTimeout(timeoutTimerId);
				resolve(signal);
			};
			timeoutTimerId = setTimeout(() => {
				this.eventEmitter.off(this.eventName, onExit);
				resolve(null);
			});
			this.eventEmitter.once(this.eventName, onExit);
		});
	}
}
exports.SlidingWindowSignal = SlidingWindowSignal;
//# sourceMappingURL=sliding-window-signal.js.map
