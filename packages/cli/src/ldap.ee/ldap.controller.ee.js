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
exports.LdapController = void 0;
const decorators_1 = require('@n8n/decorators');
const pick_1 = __importDefault(require('lodash/pick'));
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const event_service_1 = require('@/events/event.service');
const constants_1 = require('./constants');
const helpers_ee_1 = require('./helpers.ee');
const ldap_service_ee_1 = require('./ldap.service.ee');
let LdapController = class LdapController {
	constructor(ldapService, eventService) {
		this.ldapService = ldapService;
		this.eventService = eventService;
	}
	async getConfig() {
		return await this.ldapService.loadConfig();
	}
	async testConnection() {
		try {
			await this.ldapService.testConnection();
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async updateConfig(req) {
		try {
			await this.ldapService.updateConfig(req.body);
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
		const data = await this.ldapService.loadConfig();
		this.eventService.emit('ldap-settings-updated', {
			userId: req.user.id,
			...(0, pick_1.default)(data, constants_1.NON_SENSIBLE_LDAP_CONFIG_PROPERTIES),
		});
		return data;
	}
	async getLdapSync(req) {
		const { page = '0', perPage = '20' } = req.query;
		return await (0, helpers_ee_1.getLdapSynchronizations)(
			parseInt(page, 10),
			parseInt(perPage, 10),
		);
	}
	async syncLdap(req) {
		try {
			await this.ldapService.runSync(req.body.type);
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
};
exports.LdapController = LdapController;
__decorate(
	[
		(0, decorators_1.Get)('/config'),
		(0, decorators_1.GlobalScope)('ldap:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	LdapController.prototype,
	'getConfig',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/test-connection'),
		(0, decorators_1.GlobalScope)('ldap:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	LdapController.prototype,
	'testConnection',
	null,
);
__decorate(
	[
		(0, decorators_1.Put)('/config'),
		(0, decorators_1.GlobalScope)('ldap:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	LdapController.prototype,
	'updateConfig',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/sync'),
		(0, decorators_1.GlobalScope)('ldap:sync'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	LdapController.prototype,
	'getLdapSync',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/sync'),
		(0, decorators_1.GlobalScope)('ldap:sync'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	LdapController.prototype,
	'syncLdap',
	null,
);
exports.LdapController = LdapController = __decorate(
	[
		(0, decorators_1.RestController)('/ldap'),
		__metadata('design:paramtypes', [ldap_service_ee_1.LdapService, event_service_1.EventService]),
	],
	LdapController,
);
//# sourceMappingURL=ldap.controller.ee.js.map
