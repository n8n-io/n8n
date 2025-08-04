'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.BaseSelect = void 0;
const db_1 = require('@n8n/db');
const n8n_workflow_1 = require('n8n-workflow');
class BaseSelect {
	static toSelect(rawFilter, Select) {
		const dto = (0, n8n_workflow_1.jsonParse)(rawFilter, {
			errorMessage: 'Failed to parse filter JSON',
		});
		if (!(0, db_1.isStringArray)(dto))
			throw new n8n_workflow_1.UnexpectedError('Parsed select is not a string array');
		return dto.reduce((acc, field) => {
			if (!Select.selectableFields.has(field)) return acc;
			return (acc[field] = true), acc;
		}, {});
	}
}
exports.BaseSelect = BaseSelect;
//# sourceMappingURL=base.select.dto.js.map
