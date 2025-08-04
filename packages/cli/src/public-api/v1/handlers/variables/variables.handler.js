'use strict';
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const variables_controller_ee_1 = require('@/environments.ee/variables/variables.controller.ee');
const global_middleware_1 = require('../../shared/middlewares/global.middleware');
const pagination_service_1 = require('../../shared/services/pagination.service');
module.exports = {
	createVariable: [
		(0, global_middleware_1.isLicensed)('feat:variables'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'variable:create' }),
		async (req, res) => {
			await di_1.Container.get(variables_controller_ee_1.VariablesController).createVariable(req);
			res.status(201).send();
		},
	],
	updateVariable: [
		(0, global_middleware_1.isLicensed)('feat:variables'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'variable:update' }),
		async (req, res) => {
			await di_1.Container.get(variables_controller_ee_1.VariablesController).updateVariable(req);
			res.status(204).send();
		},
	],
	deleteVariable: [
		(0, global_middleware_1.isLicensed)('feat:variables'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'variable:delete' }),
		async (req, res) => {
			await di_1.Container.get(variables_controller_ee_1.VariablesController).deleteVariable(req);
			res.status(204).send();
		},
	],
	getVariables: [
		(0, global_middleware_1.isLicensed)('feat:variables'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'variable:list' }),
		global_middleware_1.validCursor,
		async (req, res) => {
			const { offset = 0, limit = 100 } = req.query;
			const [variables, count] = await di_1.Container.get(db_1.VariablesRepository).findAndCount({
				skip: offset,
				take: limit,
			});
			return res.json({
				data: variables,
				nextCursor: (0, pagination_service_1.encodeNextCursor)({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
};
//# sourceMappingURL=variables.handler.js.map
