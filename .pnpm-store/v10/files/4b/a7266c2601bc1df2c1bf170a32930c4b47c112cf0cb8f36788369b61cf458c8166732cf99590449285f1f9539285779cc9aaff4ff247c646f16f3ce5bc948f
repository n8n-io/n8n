"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoSchemaTypeMismatch = void 0;
const NoSchemaTypeMismatch = () => {
    return {
        Schema(schema, { report, location }) {
            if (schema.type === 'object' && schema.items) {
                report({
                    message: "Schema type mismatch: 'object' type should not contain 'items' field.",
                    location: location.child('items'),
                });
            }
            if (schema.type === 'array' && schema.properties) {
                report({
                    message: "Schema type mismatch: 'array' type should not contain 'properties' field.",
                    location: location.child('properties'),
                });
            }
        },
    };
};
exports.NoSchemaTypeMismatch = NoSchemaTypeMismatch;
