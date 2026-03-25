import path from 'node:path';
import { createRule, moduleVisitor, resolve, getFileExtensions, } from '../utils/index.js';
function toRelativePath(relativePath) {
    const stripped = relativePath.replaceAll(/\/$/g, '');
    return /^((\.\.)|(\.))($|\/)/.test(stripped) ? stripped : `./${stripped}`;
}
function normalize(filepath) {
    return toRelativePath(path.posix.normalize(filepath));
}
function countRelativeParents(pathSegments) {
    return pathSegments.filter(x => x === '..').length;
}
export default createRule({
    name: 'no-useless-path-segments',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Static analysis',
            description: 'Forbid unnecessary path segments in import and require statements.',
        },
        fixable: 'code',
        schema: [
            {
                type: 'object',
                properties: {
                    commonjs: { type: 'boolean' },
                    noUselessIndex: { type: 'boolean' },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            useless: 'Useless path segments for "{{importPath}}", should be "{{proposedPath}}"',
        },
    },
    defaultOptions: [],
    create(context) {
        const currentDir = path.dirname(context.physicalFilename);
        const options = context.options[0] || {};
        return moduleVisitor(source => {
            const { value: importPath } = source;
            function reportWithProposedPath(proposedPath) {
                context.report({
                    node: source,
                    messageId: 'useless',
                    data: {
                        importPath,
                        proposedPath,
                    },
                    fix: fixer => proposedPath
                        ? fixer.replaceText(source, JSON.stringify(proposedPath))
                        : null,
                });
            }
            if (!importPath.startsWith('.')) {
                return;
            }
            const resolvedPath = resolve(importPath, context);
            const normedPath = normalize(importPath);
            const resolvedNormedPath = resolve(normedPath, context);
            if (normedPath !== importPath && resolvedPath === resolvedNormedPath) {
                return reportWithProposedPath(normedPath);
            }
            const fileExtensions = getFileExtensions(context.settings);
            const regexUnnecessaryIndex = new RegExp(`.*\\/index(\\${[...fileExtensions].join('|\\')})?$`);
            if (options.noUselessIndex && regexUnnecessaryIndex.test(importPath)) {
                const parentDirectory = path.dirname(importPath);
                if (parentDirectory !== '.' && parentDirectory !== '..') {
                    for (const fileExtension of fileExtensions) {
                        if (resolve(`${parentDirectory}${fileExtension}`, context)) {
                            return reportWithProposedPath(`${parentDirectory}/`);
                        }
                    }
                }
                return reportWithProposedPath(parentDirectory);
            }
            if (importPath.startsWith('./')) {
                return;
            }
            if (resolvedPath === undefined) {
                return;
            }
            const expected = path.relative(currentDir, resolvedPath);
            const expectedSplit = expected.split(path.sep);
            const importPathSplit = importPath.replace(/^\.\//, '').split('/');
            const countImportPathRelativeParents = countRelativeParents(importPathSplit);
            const countExpectedRelativeParents = countRelativeParents(expectedSplit);
            const diff = countImportPathRelativeParents - countExpectedRelativeParents;
            if (diff <= 0) {
                return;
            }
            return reportWithProposedPath(toRelativePath([
                ...importPathSplit.slice(0, countExpectedRelativeParents),
                ...importPathSplit.slice(countImportPathRelativeParents + diff),
            ].join('/')));
        }, options);
    },
});
//# sourceMappingURL=no-useless-path-segments.js.map