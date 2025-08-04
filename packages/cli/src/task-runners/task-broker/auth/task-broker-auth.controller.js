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
exports.TaskBrokerAuthController = void 0;
const di_1 = require('@n8n/di');
const task_broker_auth_schema_1 = require('./task-broker-auth.schema');
const task_broker_auth_service_1 = require('./task-broker-auth.service');
const bad_request_error_1 = require('../../../errors/response-errors/bad-request.error');
const forbidden_error_1 = require('../../../errors/response-errors/forbidden.error');
let TaskBrokerAuthController = class TaskBrokerAuthController {
	constructor(authService) {
		this.authService = authService;
		this.authMiddleware = this.authMiddleware.bind(this);
	}
	async createGrantToken(req) {
		const result = await task_broker_auth_schema_1.taskBrokerAuthRequestBodySchema.safeParseAsync(
			req.body,
		);
		if (!result.success) {
			throw new bad_request_error_1.BadRequestError(result.error.errors[0].code);
		}
		const { token: authToken } = result.data;
		if (!this.authService.isValidAuthToken(authToken)) {
			throw new forbidden_error_1.ForbiddenError();
		}
		const grantToken = await this.authService.createGrantToken();
		return {
			token: grantToken,
		};
	}
	async authMiddleware(req, res, next) {
		const authHeader = req.headers.authorization;
		if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
			res.status(401).json({ code: 401, message: 'Unauthorized' });
			return;
		}
		const grantToken = authHeader.slice('Bearer '.length);
		const isConsumed = await this.authService.tryConsumeGrantToken(grantToken);
		if (!isConsumed) {
			res.status(403).json({ code: 403, message: 'Forbidden' });
			return;
		}
		next();
	}
};
exports.TaskBrokerAuthController = TaskBrokerAuthController;
exports.TaskBrokerAuthController = TaskBrokerAuthController = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [task_broker_auth_service_1.TaskBrokerAuthService]),
	],
	TaskBrokerAuthController,
);
//# sourceMappingURL=task-broker-auth.controller.js.map
