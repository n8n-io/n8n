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
            const used = usedIn.some((location) => !removedPaths.some((removed) => location.absolutePointer.startsWith(removed) &&
                (location.absolutePointer.length === removed.length ||
                    location.absolutePointer[removed.length] === '/')));
            if (!used && componentType && root.components) {
                removedPaths.push(path);
                const componentChild = root.components[componentType];
                delete componentChild[name];
                components.delete(path);
                if ((0, utils_1.isEmptyObject)(componentChild)) {
                    delete root.components[componentType];
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
                if (['Schema', 'Header', 'Parameter', 'Response', 'Example', 'RequestBody'].includes(type.name)) {
                    const resolvedRef = resolve(ref);
                    if (!resolvedRef.location)
                        return;
                    const [fileLocation, localPointer] = resolvedRef.location.absolutePointer.split('#', 2);
                    const componentLevelLocalPointer = localPointer.split('/').slice(0, 4).join('/');
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
                if ((0, utils_1.isEmptyObject)(root.components)) {
                    delete root.components;
                }
            },
        },
        NamedSchemas: {
            Schema(schema, { location, key }) {
                if (!schema.allOf) {
                    registerComponent(location, 'schemas', key.toString());
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
        NamedExamples: {
            Example(_example, { location, key }) {
                registerComponent(location, 'examples', key.toString());
            },
        },
        NamedRequestBodies: {
            RequestBody(_requestBody, { location, key }) {
                registerComponent(location, 'requestBodies', key.toString());
            },
        },
        NamedHeaders: {
            Header(_header, { location, key }) {
                registerComponent(location, 'headers', key.toString());
            },
        },
    };
};
exports.RemoveUnusedComponents = RemoveUnusedComponents;
