"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScalarPropertyMissingExample = void 0;
const oas_types_1 = require("../../oas-types");
const SCALAR_TYPES = ['string', 'integer', 'number', 'boolean', 'null'];
const ScalarPropertyMissingExample = () => {
    return {
        SchemaProperties(properties, { report, location, oasVersion, resolve }) {
            for (const propName of Object.keys(properties)) {
                const propSchema = resolve(properties[propName]).node;
                if (!propSchema || !isScalarSchema(propSchema)) {
                    continue;
                }
                if (propSchema.example === undefined &&
                    propSchema.examples === undefined) {
                    report({
                        message: `Scalar property should have "example"${oasVersion === oas_types_1.SpecVersion.OAS3_1 ? ' or "examples"' : ''} defined.`,
                        location: location.child(propName).key(),
                    });
                }
            }
        },
    };
};
exports.ScalarPropertyMissingExample = ScalarPropertyMissingExample;
function isScalarSchema(schema) {
    if (!schema.type) {
        return false;
    }
    if (schema.allOf || schema.anyOf || schema.oneOf) {
        // Skip allOf/oneOf/anyOf as it's complicated to validate it right now.
        // We need core support for checking contrstrains through those keywords.
        return false;
    }
    if (schema.format === 'binary') {
        return false;
    }
    if (Array.isArray(schema.type)) {
        return schema.type.every((t) => SCALAR_TYPES.includes(t));
    }
    return SCALAR_TYPES.includes(schema.type);
}
