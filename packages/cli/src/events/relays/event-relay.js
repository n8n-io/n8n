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
exports.EventRelay = void 0;
const di_1 = require('@n8n/di');
const event_service_1 = require('@/events/event.service');
let EventRelay = class EventRelay {
	constructor(eventService) {
		this.eventService = eventService;
	}
	setupListeners(map) {
		for (const [eventName, handler] of Object.entries(map)) {
			this.eventService.on(eventName, async (event) => {
				await handler(event);
			});
		}
	}
};
exports.EventRelay = EventRelay;
exports.EventRelay = EventRelay = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [event_service_1.EventService])],
	EventRelay,
);
//# sourceMappingURL=event-relay.js.map
