"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoInvalidSchemaExamples = void 0;
const utils_1 = require("../utils");
const NoInvalidSchemaExamples = (opts) => {
    const allowAdditionalProperties = (0, utils_1.getAdditionalPropertiesOption)(opts) ?? false;
    return {
        Schema: {
            leave(schema, ctx) {
                if (schema.examples) {
                    for (const example of schema.examples) {
                        (0, utils_1.validateExample)(example, schema, ctx.location.child(['examples', schema.examples.indexOf(example)]), ctx, allowAdditionalProperties);
                    }
                }
                if (schema.example !== undefined) {
                    (0, utils_1.validateExample)(schema.example, schema, ctx.location.child('example'), ctx, true);
                }
            },
        },
    };
};
exports.NoInvalidSchemaExamples = NoInvalidSchemaExamples;
