"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecExtension = void 0;
exports.listOf = listOf;
exports.mapOf = mapOf;
exports.normalizeTypes = normalizeTypes;
exports.isNamedType = isNamedType;
function listOf(typeName) {
    return {
        name: `${typeName}List`,
        properties: {},
        items: typeName,
    };
}
function mapOf(typeName) {
    return {
        name: `${typeName}Map`,
        properties: {},
        additionalProperties: () => typeName,
    };
}
exports.SpecExtension = {
    name: 'SpecExtension',
    properties: {},
    // skip validation of additional properties for unknown extensions
    additionalProperties: { resolvable: true },
};
function normalizeTypes(types, options = {}) {
    const normalizedTypes = {};
    for (const typeName of Object.keys(types)) {
        normalizedTypes[typeName] = {
            ...types[typeName],
            name: typeName,
        };
    }
    for (const type of Object.values(normalizedTypes)) {
        normalizeType(type);
    }
    // all type trees have a SpecExtension type by default
    normalizedTypes['SpecExtension'] = exports.SpecExtension;
    return normalizedTypes;
    function normalizeType(type) {
        if (type.additionalProperties) {
            type.additionalProperties = resolveType(type.additionalProperties);
        }
        if (type.items) {
            type.items = resolveType(type.items);
        }
        if (type.properties) {
            const mappedProps = {};
            for (const [propName, prop] of Object.entries(type.properties)) {
                mappedProps[propName] = resolveType(prop);
                if (options.doNotResolveExamples && prop && prop.isExample) {
                    mappedProps[propName] = {
                        ...prop,
                        resolvable: false,
                    };
                }
            }
            type.properties = mappedProps;
        }
    }
    // typings are painful here...
    function resolveType(type) {
        if (typeof type === 'string') {
            if (!normalizedTypes[type]) {
                throw new Error(`Unknown type name found: ${type}`);
            }
            return normalizedTypes[type];
        }
        else if (typeof type === 'function') {
            return (value, key) => {
                return resolveType(type(value, key));
            };
        }
        else if (type && type.name) {
            type = { ...type };
            normalizeType(type);
            return type;
        }
        else if (type && type.directResolveAs) {
            return {
                ...type,
                directResolveAs: resolveType(type.directResolveAs),
            };
        }
        else {
            return type;
        }
    }
}
function isNamedType(t) {
    return typeof t?.name === 'string';
}
