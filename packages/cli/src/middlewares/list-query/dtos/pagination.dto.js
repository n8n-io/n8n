'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Pagination = void 0;
const n8n_workflow_1 = require('n8n-workflow');
const utils_1 = require('@/utils');
class Pagination {
	static fromString(rawTake, rawSkip) {
		if (!(0, utils_1.isIntegerString)(rawTake)) {
			throw new n8n_workflow_1.UnexpectedError('Parameter take is not an integer string');
		}
		if (!(0, utils_1.isIntegerString)(rawSkip)) {
			throw new n8n_workflow_1.UnexpectedError('Parameter skip is not an integer string');
		}
		const [take, skip] = [rawTake, rawSkip].map((o) => parseInt(o, 10));
		const MAX_ITEMS_PER_PAGE = 50;
		return {
			take: Math.min(take, MAX_ITEMS_PER_PAGE),
			skip,
		};
	}
}
exports.Pagination = Pagination;
//# sourceMappingURL=pagination.dto.js.map
