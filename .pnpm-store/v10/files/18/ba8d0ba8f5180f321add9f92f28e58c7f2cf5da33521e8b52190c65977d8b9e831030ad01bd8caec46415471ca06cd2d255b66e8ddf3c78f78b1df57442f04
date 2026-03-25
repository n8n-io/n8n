"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCollection = void 0;
const errors_1 = require("../errors");
const deleteCollection = (api) => {
    return async (collectionName) => {
        if (!collectionName) {
            throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `collectionName`');
        }
        await api.deleteCollection({ collectionName });
        return;
    };
};
exports.deleteCollection = deleteCollection;
//# sourceMappingURL=deleteCollection.js.map