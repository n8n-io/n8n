"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeCollection = void 0;
const errors_1 = require("../errors");
const describeCollection = (api) => {
    return async (name) => {
        if (!name || name.length === 0) {
            throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `name` in order to describe a collection');
        }
        return await api.describeCollection({ collectionName: name });
    };
};
exports.describeCollection = describeCollection;
//# sourceMappingURL=describeCollection.js.map