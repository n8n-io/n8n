"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCollection = exports.CreateCollectionRequestProperties = void 0;
const errors_1 = require("../errors");
const validateObjectProperties_1 = require("../utils/validateObjectProperties");
exports.CreateCollectionRequestProperties = ['source', 'name'];
const createCollection = (api) => {
    const validator = (options) => {
        if (options) {
            (0, validateObjectProperties_1.ValidateObjectProperties)(options, exports.CreateCollectionRequestProperties);
        }
        if (!options || typeof options !== 'object') {
            throw new errors_1.PineconeArgumentError('You must pass a non-empty object with `name` and `source` fields in order to create a collection.');
        }
        if (!options.name && !options.source) {
            throw new errors_1.PineconeArgumentError('The argument to createCollection must have required properties: `name`, `source`.');
        }
        if (!options.name) {
            throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `name` in order to create a collection.');
        }
        if (!options.source) {
            throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `source` in order to create a collection.');
        }
    };
    return async (options) => {
        validator(options);
        return await api.createCollection({ createCollectionRequest: options });
    };
};
exports.createCollection = createCollection;
//# sourceMappingURL=createCollection.js.map