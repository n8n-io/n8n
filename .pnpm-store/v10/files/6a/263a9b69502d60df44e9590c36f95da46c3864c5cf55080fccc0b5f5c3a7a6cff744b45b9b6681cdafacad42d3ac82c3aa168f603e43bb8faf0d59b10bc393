"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathsKebabCase = void 0;
const PathsKebabCase = () => {
    return {
        PathItem(_path, { report, key }) {
            const segments = key
                .substr(1)
                .split('/')
                .filter((s) => s !== ''); // filter out empty segments
            if (!segments.every((segment) => /^{.+}$/.test(segment) || /^[a-z0-9-.]+$/.test(segment))) {
                report({
                    message: `\`${key}\` does not use kebab-case.`,
                    location: { reportOnKey: true },
                });
            }
        },
    };
};
exports.PathsKebabCase = PathsKebabCase;
