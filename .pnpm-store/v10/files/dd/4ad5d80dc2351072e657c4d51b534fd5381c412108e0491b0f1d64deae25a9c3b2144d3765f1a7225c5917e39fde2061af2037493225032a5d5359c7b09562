import { pop } from "../internal/utils.mjs";
// Supported string formats
const SUPPORTED_STRING_FORMATS = new Set([
    'date-time',
    'time',
    'date',
    'duration',
    'email',
    'hostname',
    'uri',
    'ipv4',
    'ipv6',
    'uuid',
]);
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
export function transformJSONSchema(jsonSchema) {
    const workingCopy = deepClone(jsonSchema);
    return _transformJSONSchema(workingCopy);
}
function _transformJSONSchema(jsonSchema) {
    const strictSchema = {};
    const ref = pop(jsonSchema, '$ref');
    if (ref !== undefined) {
        strictSchema['$ref'] = ref;
        return strictSchema;
    }
    const defs = pop(jsonSchema, '$defs');
    if (defs !== undefined) {
        const strictDefs = {};
        strictSchema['$defs'] = strictDefs;
        for (const [name, defSchema] of Object.entries(defs)) {
            strictDefs[name] = _transformJSONSchema(defSchema);
        }
    }
    const type = pop(jsonSchema, 'type');
    const anyOf = pop(jsonSchema, 'anyOf');
    const oneOf = pop(jsonSchema, 'oneOf');
    const allOf = pop(jsonSchema, 'allOf');
    if (Array.isArray(anyOf)) {
        strictSchema['anyOf'] = anyOf.map((variant) => _transformJSONSchema(variant));
    }
    else if (Array.isArray(oneOf)) {
        strictSchema['anyOf'] = oneOf.map((variant) => _transformJSONSchema(variant));
    }
    else if (Array.isArray(allOf)) {
        strictSchema['allOf'] = allOf.map((entry) => _transformJSONSchema(entry));
    }
    else {
        if (type === undefined) {
            throw new Error('JSON schema must have a type defined if anyOf/oneOf/allOf are not used');
        }
        strictSchema['type'] = type;
    }
    const description = pop(jsonSchema, 'description');
    if (description !== undefined) {
        strictSchema['description'] = description;
    }
    const title = pop(jsonSchema, 'title');
    if (title !== undefined) {
        strictSchema['title'] = title;
    }
    if (type === 'object') {
        const properties = pop(jsonSchema, 'properties') || {};
        strictSchema['properties'] = Object.fromEntries(Object.entries(properties).map(([key, propSchema]) => [
            key,
            _transformJSONSchema(propSchema),
        ]));
        pop(jsonSchema, 'additionalProperties');
        strictSchema['additionalProperties'] = false;
        const required = pop(jsonSchema, 'required');
        if (required !== undefined) {
            strictSchema['required'] = required;
        }
    }
    else if (type === 'string') {
        const format = pop(jsonSchema, 'format');
        if (format !== undefined && SUPPORTED_STRING_FORMATS.has(format)) {
            strictSchema['format'] = format;
        }
        else if (format !== undefined) {
            jsonSchema['format'] = format;
        }
    }
    else if (type === 'array') {
        const items = pop(jsonSchema, 'items');
        if (items !== undefined) {
            strictSchema['items'] = _transformJSONSchema(items);
        }
        const minItems = pop(jsonSchema, 'minItems');
        if (minItems !== undefined && (minItems === 0 || minItems === 1)) {
            strictSchema['minItems'] = minItems;
        }
        else if (minItems !== undefined) {
            jsonSchema['minItems'] = minItems;
        }
    }
    if (Object.keys(jsonSchema).length > 0) {
        const existingDescription = strictSchema['description'];
        strictSchema['description'] =
            (existingDescription ? existingDescription + '\n\n' : '') +
                '{' +
                Object.entries(jsonSchema)
                    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                    .join(', ') +
                '}';
    }
    return strictSchema;
}
//# sourceMappingURL=transform-json-schema.mjs.map