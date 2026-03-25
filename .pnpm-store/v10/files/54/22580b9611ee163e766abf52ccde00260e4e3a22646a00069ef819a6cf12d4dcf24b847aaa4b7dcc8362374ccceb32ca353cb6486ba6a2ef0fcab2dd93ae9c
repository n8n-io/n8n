"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMany = void 0;
const errors_1 = require("../../errors");
const deleteMany = (apiProvider, namespace) => {
    const FilterValidator = (options) => {
        for (const key in options) {
            if (!options[key]) {
                throw new errors_1.PineconeArgumentError(`\`filter\` property cannot be empty for key ${key}`);
            }
        }
    };
    const validator = (options) => {
        if (!Array.isArray(options)) {
            return FilterValidator(options);
        }
        else {
            if (options.length === 0) {
                throw new errors_1.PineconeArgumentError('Must pass in at least 1 record ID.');
            }
        }
    };
    return async (options) => {
        validator(options);
        const requestOptions = {};
        if (Array.isArray(options)) {
            requestOptions.ids = options;
        }
        else {
            requestOptions.filter = options;
        }
        const api = await apiProvider.provide();
        await api.deleteVectors({
            deleteRequest: { ...requestOptions, namespace },
        });
    };
};
exports.deleteMany = deleteMany;
//# sourceMappingURL=deleteMany.js.map