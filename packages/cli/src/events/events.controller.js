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
exports.EventsController = void 0;
const decorators_1 = require('@n8n/decorators');
const event_service_1 = require('./event.service');
let EventsController = class EventsController {
	constructor(eventService) {
		this.eventService = eventService;
	}
	sessionStarted(req) {
		const pushRef = req.headers['push-ref'];
		this.eventService.emit('session-started', { pushRef });
	}
};
exports.EventsController = EventsController;
__decorate(
	[
		(0, decorators_1.Get)('/session-started'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	EventsController.prototype,
	'sessionStarted',
	null,
);
exports.EventsController = EventsController = __decorate(
	[
		(0, decorators_1.RestController)('/events'),
		__metadata('design:paramtypes', [event_service_1.EventService]),
	],
	EventsController,
);
//# sourceMappingURL=events.controller.js.map
