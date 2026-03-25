"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathExcludesPatterns = void 0;
const PathExcludesPatterns = ({ patterns }) => {
    return {
        PathItem(_path, { report, key, location }) {
            if (!patterns)
                throw new Error(`Parameter "patterns" is not provided for "path-excludes-patterns" rule`);
            const pathKey = key.toString();
            if (pathKey.startsWith('/')) {
                const matches = patterns.filter((pattern) => pathKey.match(pattern));
                for (const match of matches) {
                    report({
                        message: `path \`${pathKey}\` should not match regex pattern: \`${match}\``,
                        location: location.key(),
                    });
                }
            }
        },
    };
};
exports.PathExcludesPatterns = PathExcludesPatterns;
