"use strict";


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_lower_bound$1 = require('./lower-bound.cjs');

//#region ../../node_modules/.pnpm/p-queue@6.6.2/node_modules/p-queue/dist/priority-queue.js
var require_priority_queue = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/p-queue@6.6.2/node_modules/p-queue/dist/priority-queue.js": ((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	const lower_bound_1 = require_lower_bound$1.require_lower_bound();
	var PriorityQueue = class {
		constructor() {
			this._queue = [];
		}
		enqueue(run, options) {
			options = Object.assign({ priority: 0 }, options);
			const element = {
				priority: options.priority,
				run
			};
			if (this.size && this._queue[this.size - 1].priority >= options.priority) {
				this._queue.push(element);
				return;
			}
			const index = lower_bound_1.default(this._queue, element, (a, b) => b.priority - a.priority);
			this._queue.splice(index, 0, element);
		}
		dequeue() {
			const item = this._queue.shift();
			return item === null || item === void 0 ? void 0 : item.run;
		}
		filter(options) {
			return this._queue.filter((element) => element.priority === options.priority).map((element) => element.run);
		}
		get size() {
			return this._queue.length;
		}
	};
	exports.default = PriorityQueue;
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_priority_queue();
  }
});
//# sourceMappingURL=priority-queue.cjs.map