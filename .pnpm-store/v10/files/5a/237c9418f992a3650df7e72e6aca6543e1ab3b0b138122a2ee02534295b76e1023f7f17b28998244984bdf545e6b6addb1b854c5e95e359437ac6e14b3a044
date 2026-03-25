"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoHttpVerbsInPaths = void 0;
const utils_1 = require("../../utils");
const httpMethods = ['get', 'head', 'post', 'put', 'patch', 'delete', 'options', 'trace'];
const NoHttpVerbsInPaths = ({ splitIntoWords }) => {
    return {
        PathItem(_path, { key, report, location }) {
            const pathKey = key.toString();
            if (!pathKey.startsWith('/'))
                return;
            const pathSegments = pathKey.split('/');
            for (const pathSegment of pathSegments) {
                if (!pathSegment || (0, utils_1.isPathParameter)(pathSegment))
                    continue;
                const isHttpMethodIncluded = (method) => {
                    return splitIntoWords
                        ? (0, utils_1.splitCamelCaseIntoWords)(pathSegment).has(method)
                        : pathSegment.toLocaleLowerCase().includes(method);
                };
                for (const method of httpMethods) {
                    if (isHttpMethodIncluded(method)) {
                        report({
                            message: `path \`${pathKey}\` should not contain http verb ${method}`,
                            location: location.key(),
                        });
                    }
                }
            }
        },
    };
};
exports.NoHttpVerbsInPaths = NoHttpVerbsInPaths;
