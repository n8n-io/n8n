"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneQuery = exports.cloneRequest = void 0;
const cloneRequest = ({ headers, query, ...rest }) => ({
    ...rest,
    headers: { ...headers },
    query: query ? (0, exports.cloneQuery)(query) : undefined,
});
exports.cloneRequest = cloneRequest;
const cloneQuery = (query) => Object.keys(query).reduce((carry, paramName) => {
    const param = query[paramName];
    return {
        ...carry,
        [paramName]: Array.isArray(param) ? [...param] : param,
    };
}, {});
exports.cloneQuery = cloneQuery;
