"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathSegmentPlural = void 0;
const pluralize = require("pluralize");
const utils_1 = require("../../utils");
const PathSegmentPlural = (opts) => {
    const { ignoreLastPathSegment, exceptions } = opts;
    return {
        PathItem: {
            leave(_path, { report, key, location }) {
                const pathKey = key.toString();
                if (pathKey.startsWith('/')) {
                    const pathSegments = pathKey.split('/');
                    pathSegments.shift();
                    if (ignoreLastPathSegment && pathSegments.length > 1) {
                        pathSegments.pop();
                    }
                    for (const pathSegment of pathSegments) {
                        if (exceptions && exceptions.includes(pathSegment))
                            continue;
                        if (!(0, utils_1.isPathParameter)(pathSegment) && pluralize.isSingular(pathSegment)) {
                            report({
                                message: `path segment \`${pathSegment}\` should be plural.`,
                                location: location.key(),
                            });
                        }
                    }
                }
            },
        },
    };
};
exports.PathSegmentPlural = PathSegmentPlural;
