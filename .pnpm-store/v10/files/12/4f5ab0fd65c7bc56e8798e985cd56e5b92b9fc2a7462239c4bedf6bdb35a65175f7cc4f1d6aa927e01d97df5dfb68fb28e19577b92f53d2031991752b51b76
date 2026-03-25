"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssistant = void 0;
const assistant_control_1 = require("../../pinecone-generated-ts-fetch/assistant_control");
const types_1 = require("./types");
const validateObjectProperties_1 = require("../../utils/validateObjectProperties");
const errors_1 = require("../../errors");
const createAssistant = (api) => {
    return async (options) => {
        validateCreateAssistantOptions(options);
        return await api.createAssistant({
            createAssistantRequest: {
                name: options.name,
                instructions: options?.instructions,
                metadata: options?.metadata,
                region: options?.region,
            },
        });
    };
};
exports.createAssistant = createAssistant;
const validateCreateAssistantOptions = (options) => {
    if (!options) {
        throw new errors_1.PineconeArgumentError('You must pass an object with required properties (`name`) to create an Assistant.');
    }
    (0, validateObjectProperties_1.ValidateObjectProperties)(options, types_1.CreateAssistantOptionsType);
    if (options.region) {
        let region = assistant_control_1.CreateAssistantRequestRegionEnum.Us;
        if (!Object.values(assistant_control_1.CreateAssistantRequestRegionEnum)
            .toString()
            .includes(options.region.toLowerCase())) {
            throw new errors_1.PineconeArgumentError('Invalid region specified. Must be one of "us" or "eu"');
        }
        else {
            region = options.region.toLowerCase();
        }
        options.region = region;
    }
};
//# sourceMappingURL=createAssistant.js.map