"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOne = void 0;
const errors_1 = require("../../errors");
const deleteOne = (apiProvider, namespace) => {
    const validator = (options) => {
        if (!options) {
            throw new errors_1.PineconeArgumentError('You must pass a non-empty string for `options` in order to delete a record.');
        }
    };
    return async (options) => {
        validator(options);
        const api = await apiProvider.provide();
        await api.deleteVectors({ deleteRequest: { ids: [options], namespace } });
        return;
    };
};
exports.deleteOne = deleteOne;
//# sourceMappingURL=deleteOne.js.map