"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteIndex = void 0;
const errors_1 = require("../errors");
const deleteIndex = (api) => {
    return async (indexName) => {
        if (!indexName) {
            throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `indexName` in order to delete an index');
        }
        await api.deleteIndex({ indexName });
        return;
    };
};
exports.deleteIndex = deleteIndex;
//# sourceMappingURL=deleteIndex.js.map