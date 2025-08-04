'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.UserSelect = void 0;
const base_select_dto_1 = require('./base.select.dto');
class UserSelect extends base_select_dto_1.BaseSelect {
	static get selectableFields() {
		return new Set(['id', 'email', 'firstName', 'lastName']);
	}
	static fromString(rawFilter) {
		return this.toSelect(rawFilter, UserSelect);
	}
}
exports.UserSelect = UserSelect;
//# sourceMappingURL=user.select.dto.js.map
