import path from 'node:path';
import { importType, createRule, moduleVisitor, makeOptionsSchema, resolve, readPkgUp, } from '../utils/index.js';
function toPosixPath(filePath) {
    return filePath.replaceAll('\\', '/');
}
function findNamedPackage(filePath) {
    const found = readPkgUp({ cwd: filePath });
    if (found.pkg && !found.pkg.name) {
        return findNamedPackage(path.resolve(found.path, '../..'));
    }
    return found;
}
const potentialViolationTypes = new Set(['parent', 'index', 'sibling']);
function checkImportForRelativePackage(context, importPath, node) {
    if (!potentialViolationTypes.has(importType(importPath, context))) {
        return;
    }
    const resolvedImport = resolve(importPath, context);
    const resolvedContext = context.physicalFilename;
    if (!resolvedImport || !resolvedContext) {
        return;
    }
    const importPkg = findNamedPackage(resolvedImport);
    const contextPkg = findNamedPackage(resolvedContext);
    if (importPkg.pkg &&
        contextPkg.pkg &&
        importPkg.pkg.name !== contextPkg.pkg.name) {
        const importBaseName = path.basename(importPath);
        const importRoot = path.dirname(importPkg.path);
        const properPath = path.relative(importRoot, resolvedImport);
        const properImport = path.join(importPkg.pkg.name, path.dirname(properPath), importBaseName === path.basename(importRoot) ? '' : importBaseName);
        context.report({
            node,
            messageId: 'noAllowed',
            data: {
                properImport,
                importPath,
            },
            fix: fixer => fixer.replaceText(node, JSON.stringify(toPosixPath(properImport))),
        });
    }
}
export default createRule({
    name: 'no-relative-packages',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Static analysis',
            description: 'Forbid importing packages through relative paths.',
        },
        fixable: 'code',
        schema: [makeOptionsSchema()],
        messages: {
            noAllowed: 'Relative import from another package is not allowed. Use `{{properImport}}` instead of `{{importPath}}`',
        },
    },
    defaultOptions: [],
    create(context) {
        return moduleVisitor(source => checkImportForRelativePackage(context, source.value, source), context.options[0]);
    },
});
//# sourceMappingURL=no-relative-packages.js.map