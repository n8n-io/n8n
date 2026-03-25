"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAssistant = void 0;
const errors_1 = require("../../errors");
const deleteAssistant = (api) => {
    return async (assistantName) => {
        if (!assistantName) {
            throw new errors_1.PineconeArgumentError('You must pass the name of an assistant to update.');
        }
        return await api.deleteAssistant({
            assistantName: assistantName,
        });
    };
};
exports.deleteAssistant = deleteAssistant;
//# sourceMappingURL=deleteAssistant.js.map