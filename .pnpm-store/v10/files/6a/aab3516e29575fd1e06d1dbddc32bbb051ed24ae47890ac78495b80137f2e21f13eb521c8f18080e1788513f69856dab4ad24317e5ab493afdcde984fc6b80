"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssistant = void 0;
const types_1 = require("./types");
const validateObjectProperties_1 = require("../../utils/validateObjectProperties");
const errors_1 = require("../../errors");
const updateAssistant = (api) => {
    return async (name, options) => {
        if (!name) {
            throw new errors_1.PineconeArgumentError('You must pass the name of an assistant to update.');
        }
        validateUpdateAssistantOptions(options);
        const updateAssistantRequest = {};
        if (options?.instructions) {
            updateAssistantRequest['instructions'] = options.instructions;
        }
        if (options?.metadata) {
            updateAssistantRequest['metadata'] = options.metadata;
        }
        return await api.updateAssistant({
            assistantName: name,
            updateAssistantRequest: updateAssistantRequest,
        });
    };
};
exports.updateAssistant = updateAssistant;
const validateUpdateAssistantOptions = (options) => {
    if (!options) {
        throw new errors_1.PineconeArgumentError('You must pass an object with at least one property to update an assistant.');
    }
    (0, validateObjectProperties_1.ValidateObjectProperties)(options, types_1.UpdateAssistantOptionsType);
};
//# sourceMappingURL=updateAssistant.js.map