"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoInvalidSchemaExamples = void 0;
const utils_1 = require("../utils");
const NoInvalidSchemaExamples = (opts) => {
    const allowAdditionalProperties = (0, utils_1.getAdditionalPropertiesOption)(opts) ?? false;
    return {
        Schema: {
            leave(schema, ctx) {
                const examples = schema.examples;
                if (examples) {
                    for (const example of examples) {
                        (0, utils_1.validateExample)(example, schema, ctx.location.child(['examples', examples.indexOf(example)]), ctx, allowAdditionalProperties);
                    }
                }
                if (schema.example !== undefined) {
                    // Handle nullable example for OAS3
                    if (schema.nullable === true &&
                        schema.example === null &&
                        schema.type !== undefined) {
                        return;
                    }
                    (0, utils_1.validateExample)(schema.example, schema, ctx.location.child('example'), ctx, true);
                }
            },
        },
    };
};
exports.NoInvalidSchemaExamples = NoInvalidSchemaExamples;
