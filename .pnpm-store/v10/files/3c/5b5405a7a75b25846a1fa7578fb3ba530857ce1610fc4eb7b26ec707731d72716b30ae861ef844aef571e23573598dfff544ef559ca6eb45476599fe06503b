"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentNameUnique = void 0;
const TYPE_NAME_SCHEMA = 'Schema';
const TYPE_NAME_PARAMETER = 'Parameter';
const TYPE_NAME_RESPONSE = 'Response';
const TYPE_NAME_REQUEST_BODY = 'RequestBody';
const TYPE_NAME_TO_OPTION_COMPONENT_NAME = {
    [TYPE_NAME_SCHEMA]: 'schemas',
    [TYPE_NAME_PARAMETER]: 'parameters',
    [TYPE_NAME_RESPONSE]: 'responses',
    [TYPE_NAME_REQUEST_BODY]: 'requestBodies',
};
const ComponentNameUnique = (options) => {
    const components = new Map();
    const typeNames = [];
    if (options.schemas !== 'off') {
        typeNames.push(TYPE_NAME_SCHEMA);
    }
    if (options.parameters !== 'off') {
        typeNames.push(TYPE_NAME_PARAMETER);
    }
    if (options.responses !== 'off') {
        typeNames.push(TYPE_NAME_RESPONSE);
    }
    if (options.requestBodies !== 'off') {
        typeNames.push(TYPE_NAME_REQUEST_BODY);
    }
    const rule = {
        ref: {
            leave(ref, { type, resolve }) {
                const typeName = type.name;
                if (typeNames.includes(typeName)) {
                    const resolvedRef = resolve(ref);
                    if (!resolvedRef.location)
                        return;
                    addComponentFromAbsoluteLocation(typeName, resolvedRef.location);
                }
            },
        },
        Root: {
            leave(root, ctx) {
                components.forEach((value, key, _) => {
                    if (value.absolutePointers.size > 1) {
                        const component = getComponentFromKey(key);
                        const optionComponentName = getOptionComponentNameForTypeName(component.typeName);
                        const componentSeverity = optionComponentName ? options[optionComponentName] : null;
                        for (const location of value.locations) {
                            const definitions = Array.from(value.absolutePointers)
                                .filter((v) => v !== location.absolutePointer.toString())
                                .map((v) => `- ${v}`)
                                .join('\n');
                            const problem = {
                                message: `Component '${optionComponentName}/${component.componentName}' is not unique. It is also defined at:\n${definitions}`,
                                location: location,
                            };
                            if (componentSeverity) {
                                problem.forceSeverity = componentSeverity;
                            }
                            ctx.report(problem);
                        }
                    }
                });
            },
        },
    };
    if (options.schemas != 'off') {
        rule.NamedSchemas = {
            Schema(_, { location }) {
                addComponentFromAbsoluteLocation(TYPE_NAME_SCHEMA, location);
            },
        };
    }
    if (options.responses != 'off') {
        rule.NamedResponses = {
            Response(_, { location }) {
                addComponentFromAbsoluteLocation(TYPE_NAME_RESPONSE, location);
            },
        };
    }
    if (options.parameters != 'off') {
        rule.NamedParameters = {
            Parameter(_, { location }) {
                addComponentFromAbsoluteLocation(TYPE_NAME_PARAMETER, location);
            },
        };
    }
    if (options.requestBodies != 'off') {
        rule.NamedRequestBodies = {
            RequestBody(_, { location }) {
                addComponentFromAbsoluteLocation(TYPE_NAME_REQUEST_BODY, location);
            },
        };
    }
    return rule;
    function getComponentNameFromAbsoluteLocation(absoluteLocation) {
        const componentName = absoluteLocation.split('/').slice(-1)[0];
        if (componentName.endsWith('.yml') ||
            componentName.endsWith('.yaml') ||
            componentName.endsWith('.json')) {
            return componentName.slice(0, componentName.lastIndexOf('.'));
        }
        return componentName;
    }
    function addFoundComponent(typeName, componentName, location) {
        const key = getKeyForComponent(typeName, componentName);
        const entry = components.get(key) ?? {
            absolutePointers: new Set(),
            locations: [],
        };
        const absoluteLocation = location.absolutePointer.toString();
        if (!entry.absolutePointers.has(absoluteLocation)) {
            entry.absolutePointers.add(absoluteLocation);
            entry.locations.push(location);
        }
        components.set(key, entry);
    }
    function addComponentFromAbsoluteLocation(typeName, location) {
        const componentName = getComponentNameFromAbsoluteLocation(location.absolutePointer.toString());
        addFoundComponent(typeName, componentName, location);
    }
};
exports.ComponentNameUnique = ComponentNameUnique;
function getOptionComponentNameForTypeName(typeName) {
    return TYPE_NAME_TO_OPTION_COMPONENT_NAME[typeName] ?? null;
}
function getKeyForComponent(typeName, componentName) {
    return `${typeName}/${componentName}`;
}
function getComponentFromKey(key) {
    const [typeName, componentName] = key.split('/');
    return { typeName, componentName };
}
