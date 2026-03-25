"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchByTitle = exports.filterByTitle = exports.FILTER_PARAM = exports.QUERY_PARAM_NAME = void 0;
exports.QUERY_PARAM_NAME = {
    FILTER: "filter",
};
exports.FILTER_PARAM = {
    TITLE: "title",
};
const eqByTitle = (title) => `${exports.FILTER_PARAM.TITLE} eq "${title}"`;
const coByTitle = (title) => `${exports.FILTER_PARAM.TITLE} co "${title}"`;
const buildKeyValuePair = (queryParamName) => (queryParamValue) => `${queryParamName}=${queryParamValue}`;
const buildFilterQuery = buildKeyValuePair(exports.QUERY_PARAM_NAME.FILTER);
const filterByTitle = (title) => buildFilterQuery(eqByTitle(title));
exports.filterByTitle = filterByTitle;
const searchByTitle = (title) => buildFilterQuery(coByTitle(title));
exports.searchByTitle = searchByTitle;
//# sourceMappingURL=query-builder.js.map