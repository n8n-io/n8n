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
exports.LocalTaskRequester = void 0;
const di_1 = require('@n8n/di');
const event_service_1 = require('@/events/event.service');
const node_types_1 = require('@/node-types');
const task_broker_service_1 = require('@/task-runners/task-broker/task-broker.service');
const task_requester_1 = require('./task-requester');
let LocalTaskRequester = class LocalTaskRequester extends task_requester_1.TaskRequester {
	constructor(nodeTypes, eventService) {
		super(nodeTypes, eventService);
		this.id = 'local-task-requester';
		this.registerRequester();
	}
	registerRequester() {
		this.taskBroker = di_1.Container.get(task_broker_service_1.TaskBroker);
		this.taskBroker.registerRequester(this.id, this.onMessage.bind(this));
	}
	sendMessage(message) {
		void this.taskBroker.onRequesterMessage(this.id, message);
	}
};
exports.LocalTaskRequester = LocalTaskRequester;
exports.LocalTaskRequester = LocalTaskRequester = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [node_types_1.NodeTypes, event_service_1.EventService]),
	],
	LocalTaskRequester,
);
//# sourceMappingURL=local-task-requester.js.map
