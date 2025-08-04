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
exports.WebhookServer = void 0;
const di_1 = require('@n8n/di');
const abstract_server_1 = require('@/abstract-server');
let WebhookServer = class WebhookServer extends abstract_server_1.AbstractServer {};
exports.WebhookServer = WebhookServer;
exports.WebhookServer = WebhookServer = __decorate([(0, di_1.Service)()], WebhookServer);
//# sourceMappingURL=webhook-server.js.map
