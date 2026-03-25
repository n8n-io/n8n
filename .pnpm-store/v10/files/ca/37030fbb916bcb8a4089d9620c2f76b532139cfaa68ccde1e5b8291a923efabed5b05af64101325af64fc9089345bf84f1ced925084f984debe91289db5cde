"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertKeysToCamelCase = void 0;
// converts keys of a json payload from snake_case to camelCase
const convertKeysToCamelCase = (object) => {
    if (Array.isArray(object)) {
        return object.map((item) => (0, exports.convertKeysToCamelCase)(item));
    }
    else if (object !== null && typeof object === 'object') {
        return Object.entries(object).reduce((acc, [key, value]) => {
            const camelKey = toCamelCase(key);
            acc[camelKey] = (0, exports.convertKeysToCamelCase)(value);
            return acc;
        }, {});
    }
    return object; // return primitives as is
};
exports.convertKeysToCamelCase = convertKeysToCamelCase;
// converts snake-case keys to camelCase
const toCamelCase = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
//# sourceMappingURL=convertKeys.js.map