"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPaginated = void 0;
const validateObjectProperties_1 = require("../../utils/validateObjectProperties");
const ListOptionsProperties = [
    'prefix',
    'limit',
    'paginationToken',
];
const listPaginated = (apiProvider, namespace) => {
    const validator = (options) => {
        if (options) {
            (0, validateObjectProperties_1.ValidateObjectProperties)(options, ListOptionsProperties);
        }
        // Don't need to check for empty string prefix or paginationToken, since empty strings evaluate to false
        if (options.limit && options.limit < 0) {
            throw new Error('`limit` property must be greater than 0');
        }
    };
    return async (options) => {
        if (options) {
            validator(options);
        }
        const listRequest = {
            ...options,
            namespace,
        };
        const api = await apiProvider.provide();
        return await api.listVectors(listRequest);
    };
};
exports.listPaginated = listPaginated;
//# sourceMappingURL=list.js.map