"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveUnusedComponents = void 0;
const utils_1 = require("../../utils");
const RemoveUnusedComponents = () => {
    const components = new Map();
    function registerComponent(location, componentType, name) {
        components.set(location.absolutePointer, {
            usedIn: components.get(location.absolutePointer)?.usedIn ?? [],
            componentType,
            name,
        });
    }
    function removeUnusedComponents(root, removedPaths) {
        const removedLengthStart = removedPaths.length;
        for (const [path, { usedIn, name, componentType }] of components) {
            const used = usedIn.some((location) => !removedPaths.some((removed) => 
            // Check if the current location's absolute pointer starts with the 'removed' path
            // and either its length matches exactly with 'removed' or the character after the 'removed' path is a '/'
            location.absolutePointer.startsWith(removed) &&
                (location.absolutePointer.length === removed.length ||
                    location.absolutePointer[removed.length] === '/')));
            if (!used && componentType) {
                removedPaths.push(path);
                delete root[componentType][name];
                components.delete(path);
                if ((0, utils_1.isEmptyObject)(root[componentType])) {
                    delete root[componentType];
                }
            }
        }
        return removedPaths.length > removedLengthStart
            ? removeUnusedComponents(root, removedPaths)
            : removedPaths.length;
    }
    return {
        ref: {
            leave(ref, { location, type, resolve, key }) {
                if (['Schema', 'Parameter', 'Response', 'SecurityScheme'].includes(type.name)) {
                    const resolvedRef = resolve(ref);
                    if (!resolvedRef.location)
                        return;
                    const [fileLocation, localPointer] = resolvedRef.location.absolutePointer.split('#', 2);
                    const componentLevelLocalPointer = localPointer.split('/').slice(0, 3).join('/');
                    const pointer = `${fileLocation}#${componentLevelLocalPointer}`;
                    const registered = components.get(pointer);
                    if (registered) {
                        registered.usedIn.push(location);
                    }
                    else {
                        components.set(pointer, {
                            usedIn: [location],
                            name: key.toString(),
                        });
                    }
                }
            },
        },
        Root: {
            leave(root, ctx) {
                const data = ctx.getVisitorData();
                data.removedCount = removeUnusedComponents(root, []);
            },
        },
        NamedSchemas: {
            Schema(schema, { location, key }) {
                if (!schema.allOf) {
                    registerComponent(location, 'definitions', key.toString());
                }
            },
        },
        NamedParameters: {
            Parameter(_parameter, { location, key }) {
                registerComponent(location, 'parameters', key.toString());
            },
        },
        NamedResponses: {
            Response(_response, { location, key }) {
                registerComponent(location, 'responses', key.toString());
            },
        },
        NamedSecuritySchemes: {
            SecurityScheme(_securityScheme, { location, key }) {
                registerComponent(location, 'securityDefinitions', key.toString());
            },
        },
    };
};
exports.RemoveUnusedComponents = RemoveUnusedComponents;
