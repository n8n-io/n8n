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
exports.CtaController = void 0;
const decorators_1 = require('@n8n/decorators');
const express_1 = __importDefault(require('express'));
const cta_service_1 = require('@/services/cta.service');
let CtaController = class CtaController {
	constructor(ctaService) {
		this.ctaService = ctaService;
	}
	async getCta(req, res) {
		const becomeCreator = await this.ctaService.getBecomeCreatorCta(req.user.id);
		res.json(becomeCreator);
	}
};
exports.CtaController = CtaController;
__decorate(
	[
		(0, decorators_1.Get)('/become-creator'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	CtaController.prototype,
	'getCta',
	null,
);
exports.CtaController = CtaController = __decorate(
	[
		(0, decorators_1.RestController)('/cta'),
		__metadata('design:paramtypes', [cta_service_1.CtaService]),
	],
	CtaController,
);
//# sourceMappingURL=cta.controller.js.map
