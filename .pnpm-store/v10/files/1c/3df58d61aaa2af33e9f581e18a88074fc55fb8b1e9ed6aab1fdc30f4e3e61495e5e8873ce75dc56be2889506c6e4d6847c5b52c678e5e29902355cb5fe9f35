"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeAssistant = void 0;
const errors_1 = require("../../errors");
const describeAssistant = (api) => {
    return async (assistantName) => {
        if (!assistantName) {
            throw new errors_1.PineconeArgumentError('You must pass the name of an assistant to update.');
        }
        return await api.getAssistant({
            assistantName: assistantName,
        });
    };
};
exports.describeAssistant = describeAssistant;
//# sourceMappingURL=describeAssistant.js.map