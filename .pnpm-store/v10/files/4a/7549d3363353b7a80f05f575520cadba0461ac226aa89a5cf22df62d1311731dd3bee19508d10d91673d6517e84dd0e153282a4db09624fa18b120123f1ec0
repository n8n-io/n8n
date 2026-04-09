"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawColumnToInternalColumn = exports.objIfExists = void 0;
const table_constants_1 = require("../utils/table-constants");
const objIfExists = (key, val) => {
    if (!val) {
        return {};
    }
    return {
        [key]: val,
    };
};
exports.objIfExists = objIfExists;
const rawColumnToInternalColumn = (column, defaultColumnStyles) => {
    var _a;
    return (Object.assign(Object.assign(Object.assign(Object.assign({ name: column.name, title: (_a = column.title) !== null && _a !== void 0 ? _a : column.name }, (0, exports.objIfExists)('color', (column.color || (defaultColumnStyles === null || defaultColumnStyles === void 0 ? void 0 : defaultColumnStyles.color)))), (0, exports.objIfExists)('maxLen', (column.maxLen || (defaultColumnStyles === null || defaultColumnStyles === void 0 ? void 0 : defaultColumnStyles.maxLen)))), (0, exports.objIfExists)('minLen', (column.minLen || (defaultColumnStyles === null || defaultColumnStyles === void 0 ? void 0 : defaultColumnStyles.minLen)))), { alignment: (column.alignment ||
            (defaultColumnStyles === null || defaultColumnStyles === void 0 ? void 0 : defaultColumnStyles.alignment) ||
            table_constants_1.DEFAULT_ROW_ALIGNMENT), transform: column.transform }));
};
exports.rawColumnToInternalColumn = rawColumnToInternalColumn;
