"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathNotIncludeQuery = void 0;
const PathNotIncludeQuery = () => {
    return {
        Paths: {
            PathItem(_operation, { report, key }) {
                if (key.toString().includes('?')) {
                    report({
                        message: `Don't put query string items in the path, they belong in parameters with \`in: query\`.`,
                        location: { reportOnKey: true },
                    });
                }
            },
        },
    };
};
exports.PathNotIncludeQuery = PathNotIncludeQuery;
