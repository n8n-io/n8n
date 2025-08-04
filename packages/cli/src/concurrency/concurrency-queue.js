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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ConcurrencyQueue = void 0;
const di_1 = require('@n8n/di');
const typed_emitter_1 = require('@/typed-emitter');
let ConcurrencyQueue = class ConcurrencyQueue extends typed_emitter_1.TypedEmitter {
	constructor(capacity) {
		super();
		this.capacity = capacity;
		this.queue = [];
	}
	async enqueue(executionId) {
		this.capacity--;
		this.debouncedEmit('concurrency-check', { capacity: this.capacity });
		if (this.capacity < 0) {
			this.emit('execution-throttled', { executionId });
			return await new Promise((resolve) => this.queue.push({ executionId, resolve }));
		}
	}
	get currentCapacity() {
		return this.capacity;
	}
	dequeue() {
		this.capacity++;
		this.resolveNext();
	}
	remove(executionId) {
		const index = this.queue.findIndex((item) => item.executionId === executionId);
		if (index > -1) {
			this.queue.splice(index, 1);
			this.capacity++;
			this.resolveNext();
		}
	}
	getAll() {
		return new Set(this.queue.map((item) => item.executionId));
	}
	has(executionId) {
		return this.queue.some((item) => item.executionId === executionId);
	}
	resolveNext() {
		const item = this.queue.shift();
		if (!item) return;
		const { resolve, executionId } = item;
		this.emit('execution-released', executionId);
		resolve();
	}
};
exports.ConcurrencyQueue = ConcurrencyQueue;
exports.ConcurrencyQueue = ConcurrencyQueue = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [Number])],
	ConcurrencyQueue,
);
//# sourceMappingURL=concurrency-queue.js.map
