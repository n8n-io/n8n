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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.WebhooksController = void 0;
const decorators_1 = require('@n8n/decorators');
const get_1 = __importDefault(require('lodash/get'));
const webhook_service_1 = require('./webhook.service');
let WebhooksController = class WebhooksController {
	constructor(webhookService) {
		this.webhookService = webhookService;
	}
	async findWebhook(req) {
		const body = (0, get_1.default)(req, 'body', {});
		try {
			const webhook = await this.webhookService.findWebhook(body.method, body.path);
			return webhook;
		} catch (error) {
			return null;
		}
	}
};
exports.WebhooksController = WebhooksController;
__decorate(
	[
		(0, decorators_1.Post)('/find'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WebhooksController.prototype,
	'findWebhook',
	null,
);
exports.WebhooksController = WebhooksController = __decorate(
	[
		(0, decorators_1.RestController)('/webhooks'),
		__metadata('design:paramtypes', [webhook_service_1.WebhookService]),
	],
	WebhooksController,
);
//# sourceMappingURL=webhooks.controller.js.map
