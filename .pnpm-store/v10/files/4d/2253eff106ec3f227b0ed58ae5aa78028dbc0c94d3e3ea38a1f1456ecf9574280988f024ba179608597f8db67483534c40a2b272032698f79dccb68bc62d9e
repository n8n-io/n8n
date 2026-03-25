"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeIndex = void 0;
const errors_1 = require("../errors");
const describeIndex = (api) => {
    const removeDeprecatedFields = (result) => {
        if (result.database) {
            for (const key of Object.keys(result.database)) {
                if (result.database[key] === undefined) {
                    delete result.database[key];
                }
            }
        }
    };
    return async (indexName) => {
        if (!indexName) {
            throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `name` in order to describe an index');
        }
        const result = await api.describeIndex({ indexName });
        removeDeprecatedFields(result);
        return result;
    };
};
exports.describeIndex = describeIndex;
//# sourceMappingURL=describeIndex.js.map