"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeWriteOnlyProperties = removeWriteOnlyProperties;
function removeWriteOnlyProperties(schema) {
    const schemaCopy = JSON.parse(JSON.stringify(schema));
    function filterWriteOnlyProps(schema) {
        if (schema.type === 'object') {
            if (schema.properties) {
                for (const key in schema.properties) {
                    if (schema.properties[key].writeOnly) {
                        delete schema.properties[key];
                        if (schema.required) {
                            schema.required = schema.required.filter((prop) => prop !== key);
                        }
                    }
                    else {
                        filterWriteOnlyProps(schema.properties[key]);
                    }
                }
            }
            if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
                filterWriteOnlyProps(schema.additionalProperties);
            }
        }
        else if (schema.type === 'array' && schema.items) {
            filterWriteOnlyProps(schema.items);
        }
        if (schema.oneOf) {
            schema.oneOf = schema.oneOf.map((subSchema) => filterWriteOnlyProps(subSchema));
        }
        if (schema.allOf) {
            schema.allOf = schema.allOf.map((subSchema) => filterWriteOnlyProps(subSchema));
        }
        if (schema.anyOf) {
            schema.anyOf = schema.anyOf.map((subSchema) => filterWriteOnlyProps(subSchema));
        }
        return schema;
    }
    return filterWriteOnlyProps(schemaCopy);
}
//# sourceMappingURL=remove-write-only-properties.js.map