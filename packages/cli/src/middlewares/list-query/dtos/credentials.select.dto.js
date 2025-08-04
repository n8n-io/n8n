'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.CredentialsSelect = void 0;
const base_select_dto_1 = require('./base.select.dto');
class CredentialsSelect extends base_select_dto_1.BaseSelect {
	static get selectableFields() {
		return new Set(['id', 'name', 'type']);
	}
	static fromString(rawFilter) {
		return this.toSelect(rawFilter, CredentialsSelect);
	}
}
exports.CredentialsSelect = CredentialsSelect;
//# sourceMappingURL=credentials.select.dto.js.map
