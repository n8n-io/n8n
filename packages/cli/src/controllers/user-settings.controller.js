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
exports.UserSettingsController = void 0;
const decorators_1 = require('@n8n/decorators');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const user_service_1 = require('@/services/user.service');
function getNpsSurveyState(state) {
	if (typeof state !== 'object' || state === null) {
		return;
	}
	if (!('lastShownAt' in state) || typeof state.lastShownAt !== 'number') {
		return;
	}
	if ('responded' in state && state.responded === true) {
		return {
			responded: true,
			lastShownAt: state.lastShownAt,
		};
	}
	if (
		'waitingForResponse' in state &&
		state.waitingForResponse === true &&
		'ignoredCount' in state &&
		typeof state.ignoredCount === 'number'
	) {
		return {
			waitingForResponse: true,
			ignoredCount: state.ignoredCount,
			lastShownAt: state.lastShownAt,
		};
	}
	return;
}
let UserSettingsController = class UserSettingsController {
	constructor(userService) {
		this.userService = userService;
	}
	async updateNpsSurvey(req) {
		const state = getNpsSurveyState(req.body);
		if (!state) {
			throw new bad_request_error_1.BadRequestError('Invalid nps survey state structure');
		}
		await this.userService.updateSettings(req.user.id, {
			npsSurvey: state,
		});
	}
};
exports.UserSettingsController = UserSettingsController;
__decorate(
	[
		(0, decorators_1.Patch)('/nps-survey'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	UserSettingsController.prototype,
	'updateNpsSurvey',
	null,
);
exports.UserSettingsController = UserSettingsController = __decorate(
	[
		(0, decorators_1.RestController)('/user-settings'),
		__metadata('design:paramtypes', [user_service_1.UserService]),
	],
	UserSettingsController,
);
//# sourceMappingURL=user-settings.controller.js.map
