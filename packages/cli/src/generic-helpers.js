'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DEFAULT_EXECUTIONS_GET_ALL_LIMIT = void 0;
exports.validateEntity = validateEntity;
const class_validator_1 = require('class-validator');
const bad_request_error_1 = require('./errors/response-errors/bad-request.error');
async function validateEntity(entity) {
	const errors = await (0, class_validator_1.validate)(entity);
	const errorMessages = errors
		.reduce((acc, cur) => {
			if (!cur.constraints) return acc;
			acc.push(...Object.values(cur.constraints));
			return acc;
		}, [])
		.join(' | ');
	if (errorMessages) {
		throw new bad_request_error_1.BadRequestError(errorMessages);
	}
}
exports.DEFAULT_EXECUTIONS_GET_ALL_LIMIT = 20;
//# sourceMappingURL=generic-helpers.js.map
