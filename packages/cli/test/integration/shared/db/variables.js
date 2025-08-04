'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createVariable = createVariable;
exports.getVariableByIdOrFail = getVariableByIdOrFail;
exports.getVariableByKey = getVariableByKey;
exports.getVariableById = getVariableById;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const variables_service_ee_1 = require('@/environments.ee/variables/variables.service.ee');
async function createVariable(
	key = (0, n8n_workflow_1.randomString)(5),
	value = (0, n8n_workflow_1.randomString)(5),
) {
	const result = await di_1.Container.get(db_1.VariablesRepository).save({
		id: (0, db_1.generateNanoId)(),
		key,
		value,
	});
	await di_1.Container.get(variables_service_ee_1.VariablesService).updateCache();
	return result;
}
async function getVariableByIdOrFail(id) {
	return await di_1.Container.get(db_1.VariablesRepository).findOneOrFail({ where: { id } });
}
async function getVariableByKey(key) {
	return await di_1.Container.get(db_1.VariablesRepository).findOne({
		where: {
			key,
		},
	});
}
async function getVariableById(id) {
	return await di_1.Container.get(db_1.VariablesRepository).findOne({
		where: {
			id,
		},
	});
}
//# sourceMappingURL=variables.js.map
