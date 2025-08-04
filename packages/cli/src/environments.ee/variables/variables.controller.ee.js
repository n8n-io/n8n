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
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.VariablesController = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const variable_count_limit_reached_error_1 = require('@/errors/variable-count-limit-reached.error');
const variable_validation_error_1 = require('@/errors/variable-validation.error');
const variables_service_ee_1 = require('./variables.service.ee');
let VariablesController = class VariablesController {
	constructor(variablesService) {
		this.variablesService = variablesService;
	}
	async getVariables(_req, _res, query) {
		return await this.variablesService.getAllCached(query.state);
	}
	async createVariable(req) {
		const variable = req.body;
		delete variable.id;
		try {
			return await this.variablesService.create(variable);
		} catch (error) {
			if (error instanceof variable_count_limit_reached_error_1.VariableCountLimitReachedError) {
				throw new bad_request_error_1.BadRequestError(error.message);
			} else if (error instanceof variable_validation_error_1.VariableValidationError) {
				throw new bad_request_error_1.BadRequestError(error.message);
			}
			throw error;
		}
	}
	async getVariable(req) {
		const id = req.params.id;
		const variable = await this.variablesService.getCached(id);
		if (variable === null) {
			throw new not_found_error_1.NotFoundError(`Variable with id ${req.params.id} not found`);
		}
		return variable;
	}
	async updateVariable(req) {
		const id = req.params.id;
		const variable = req.body;
		delete variable.id;
		try {
			return await this.variablesService.update(id, variable);
		} catch (error) {
			if (error instanceof variable_count_limit_reached_error_1.VariableCountLimitReachedError) {
				throw new bad_request_error_1.BadRequestError(error.message);
			} else if (error instanceof variable_validation_error_1.VariableValidationError) {
				throw new bad_request_error_1.BadRequestError(error.message);
			}
			throw error;
		}
	}
	async deleteVariable(req) {
		const id = req.params.id;
		await this.variablesService.delete(id);
		return true;
	}
};
exports.VariablesController = VariablesController;
__decorate(
	[
		(0, decorators_1.Get)('/'),
		(0, decorators_1.GlobalScope)('variable:list'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.VariableListRequestDto]),
		__metadata('design:returntype', Promise),
	],
	VariablesController.prototype,
	'getVariables',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/'),
		(0, decorators_1.Licensed)('feat:variables'),
		(0, decorators_1.GlobalScope)('variable:create'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	VariablesController.prototype,
	'createVariable',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id'),
		(0, decorators_1.GlobalScope)('variable:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	VariablesController.prototype,
	'getVariable',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:id'),
		(0, decorators_1.Licensed)('feat:variables'),
		(0, decorators_1.GlobalScope)('variable:update'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	VariablesController.prototype,
	'updateVariable',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:id'),
		(0, decorators_1.GlobalScope)('variable:delete'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	VariablesController.prototype,
	'deleteVariable',
	null,
);
exports.VariablesController = VariablesController = __decorate(
	[
		(0, decorators_1.RestController)('/variables'),
		__metadata('design:paramtypes', [variables_service_ee_1.VariablesService]),
	],
	VariablesController,
);
//# sourceMappingURL=variables.controller.ee.js.map
