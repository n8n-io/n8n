"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoRequiredSchemaPropertiesUndefined = void 0;
const ref_utils_1 = require("../../ref-utils");
const NoRequiredSchemaPropertiesUndefined = () => {
    return {
        Schema: {
            enter(schema, { location, report, resolve }) {
                if (!schema.required)
                    return;
                const visitedSchemas = new Set();
                const elevateProperties = (schema) => {
                    // Check if the schema has been visited before processing it
                    if (visitedSchemas.has(schema)) {
                        return {};
                    }
                    visitedSchemas.add(schema);
                    if ((0, ref_utils_1.isRef)(schema)) {
                        return elevateProperties(resolve(schema).node);
                    }
                    return Object.assign({}, schema.properties, ...(schema.allOf?.map(elevateProperties) ?? []), ...(schema.anyOf?.map(elevateProperties) ?? []));
                };
                const allProperties = elevateProperties(schema);
                for (const [i, requiredProperty] of schema.required.entries()) {
                    if (!allProperties || allProperties[requiredProperty] === undefined) {
                        report({
                            message: `Required property '${requiredProperty}' is undefined.`,
                            location: location.child(['required', i]),
                        });
                    }
                }
            },
        },
    };
};
exports.NoRequiredSchemaPropertiesUndefined = NoRequiredSchemaPropertiesUndefined;
