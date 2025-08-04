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
Object.defineProperty(exports, '__esModule', { value: true });
exports.TaskRunnerLifecycleEvents = void 0;
const di_1 = require('@n8n/di');
const typed_emitter_1 = require('@/typed-emitter');
let TaskRunnerLifecycleEvents = class TaskRunnerLifecycleEvents extends typed_emitter_1.TypedEmitter {};
exports.TaskRunnerLifecycleEvents = TaskRunnerLifecycleEvents;
exports.TaskRunnerLifecycleEvents = TaskRunnerLifecycleEvents = __decorate(
	[(0, di_1.Service)()],
	TaskRunnerLifecycleEvents,
);
//# sourceMappingURL=task-runner-lifecycle-events.js.map
