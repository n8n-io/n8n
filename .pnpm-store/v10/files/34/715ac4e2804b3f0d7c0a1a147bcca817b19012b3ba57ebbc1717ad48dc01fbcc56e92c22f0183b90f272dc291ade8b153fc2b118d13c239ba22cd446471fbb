"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoInvalidParameterExamples = void 0;
const utils_1 = require("../utils");
const NoInvalidParameterExamples = (opts) => {
    const allowAdditionalProperties = (0, utils_1.getAdditionalPropertiesOption)(opts) ?? false;
    return {
        Parameter: {
            leave(parameter, ctx) {
                if (parameter.example !== undefined) {
                    (0, utils_1.validateExample)(parameter.example, parameter.schema, ctx.location.child('example'), ctx, allowAdditionalProperties);
                }
                if (parameter.examples) {
                    for (const [key, example] of Object.entries(parameter.examples)) {
                        if ('value' in example) {
                            (0, utils_1.validateExample)(example.value, parameter.schema, ctx.location.child(['examples', key]), ctx, true);
                        }
                    }
                }
            },
        },
    };
};
exports.NoInvalidParameterExamples = NoInvalidParameterExamples;
