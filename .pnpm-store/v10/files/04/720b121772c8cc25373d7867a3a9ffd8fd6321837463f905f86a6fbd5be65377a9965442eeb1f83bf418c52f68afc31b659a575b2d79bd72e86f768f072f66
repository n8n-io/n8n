"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathParamsDefined = void 0;
const pathRegex = /\{([a-zA-Z0-9_.-]+)\}+/g;
const PathParamsDefined = () => {
    let pathTemplateParams;
    let definedPathParams;
    let currentPath;
    let definedOperationParams;
    return {
        PathItem: {
            enter(_, { key }) {
                definedPathParams = new Set();
                currentPath = key;
                pathTemplateParams = new Set(Array.from(key.toString().matchAll(pathRegex)).map((m) => m[1]));
            },
            Parameter(parameter, { report, location }) {
                if (parameter.in === 'path' && parameter.name) {
                    definedPathParams.add(parameter.name);
                    if (!pathTemplateParams.has(parameter.name)) {
                        report({
                            message: `Path parameter \`${parameter.name}\` is not used in the path \`${currentPath}\`.`,
                            location: location.child(['name']),
                        });
                    }
                }
            },
            Operation: {
                enter() {
                    definedOperationParams = new Set();
                },
                leave(_op, { report, location }) {
                    for (const templateParam of Array.from(pathTemplateParams.keys())) {
                        if (!definedOperationParams.has(templateParam) &&
                            !definedPathParams.has(templateParam)) {
                            report({
                                message: `The operation does not define the path parameter \`{${templateParam}}\` expected by path \`${currentPath}\`.`,
                                location: location.child(['parameters']).key(), // report on operation
                            });
                        }
                    }
                },
                Parameter(parameter, { report, location }) {
                    if (parameter.in === 'path' && parameter.name) {
                        definedOperationParams.add(parameter.name);
                        if (!pathTemplateParams.has(parameter.name)) {
                            report({
                                message: `Path parameter \`${parameter.name}\` is not used in the path \`${currentPath}\`.`,
                                location: location.child(['name']),
                            });
                        }
                    }
                },
            },
        },
    };
};
exports.PathParamsDefined = PathParamsDefined;
