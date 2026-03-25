import path from 'node:path';
import { TSESTree } from '@typescript-eslint/types';
import eslintUnsupportedApi from 'eslint/use-at-your-own-risk';
import { ExportMap, recursivePatternCapture, createRule, resolve, getFileExtensions, readPkgUp, visit, getValue, } from '../utils/index.js';
const { FileEnumerator, shouldUseFlatConfig } = eslintUnsupportedApi;
function listFilesUsingFileEnumerator(src, extensions) {
    const { ESLINT_USE_FLAT_CONFIG } = process.env;
    let isUsingFlatConfig;
    try {
        isUsingFlatConfig =
            shouldUseFlatConfig && ESLINT_USE_FLAT_CONFIG !== 'false';
    }
    catch {
        isUsingFlatConfig =
            !!ESLINT_USE_FLAT_CONFIG && ESLINT_USE_FLAT_CONFIG !== 'false';
    }
    const enumerator = new FileEnumerator({ extensions });
    try {
        return Array.from(enumerator.iterateFiles(src), ({ filePath, ignored }) => ({ filename: filePath, ignored }));
    }
    catch (error) {
        if (isUsingFlatConfig &&
            error.message.includes('No ESLint configuration found')) {
            throw new Error(`
Due to the exclusion of certain internal ESLint APIs when using flat config,
the import-x/no-unused-modules rule requires an .eslintrc file (even empty) to know which
files to ignore (even when using flat config).
The .eslintrc file only needs to contain "ignorePatterns", or can be empty if
you do not want to ignore any files.

See https://github.com/import-js/eslint-plugin-import/issues/3079
for additional context.
`);
        }
        throw error;
    }
}
const DEFAULT = 'default';
const { AST_NODE_TYPES } = TSESTree;
function forEachDeclarationIdentifier(declaration, cb) {
    if (declaration) {
        const isTypeDeclaration = declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
            declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
            declaration.type === AST_NODE_TYPES.TSEnumDeclaration;
        if (declaration.type === AST_NODE_TYPES.FunctionDeclaration ||
            declaration.type === AST_NODE_TYPES.ClassDeclaration ||
            isTypeDeclaration) {
            cb(declaration.id.name, isTypeDeclaration);
        }
        else if (declaration.type === AST_NODE_TYPES.VariableDeclaration) {
            for (const { id } of declaration.declarations) {
                if (id.type === AST_NODE_TYPES.ObjectPattern) {
                    recursivePatternCapture(id, pattern => {
                        if (pattern.type === AST_NODE_TYPES.Identifier) {
                            cb(pattern.name, false);
                        }
                    });
                }
                else if (id.type === AST_NODE_TYPES.ArrayPattern) {
                    for (const el of id.elements) {
                        if (el?.type === AST_NODE_TYPES.Identifier) {
                            cb(el.name, false);
                        }
                    }
                }
                else {
                    cb(id.name, false);
                }
            }
        }
    }
}
const importList = new Map();
const exportList = new Map();
const visitorKeyMap = new Map();
const ignoredFiles = new Set();
const filesOutsideSrc = new Set();
const isNodeModule = (path) => /([/\\])(node_modules)\1/.test(path);
const resolveFiles = (src, ignoreExports, context) => {
    const extensions = [...getFileExtensions(context.settings)];
    const srcFileList = listFilesUsingFileEnumerator(src, extensions);
    const ignoredFilesList = listFilesUsingFileEnumerator(ignoreExports, extensions);
    for (const { filename } of ignoredFilesList)
        ignoredFiles.add(filename);
    return new Set(srcFileList.flatMap(({ filename }) => isNodeModule(filename) ? [] : filename));
};
const prepareImportsAndExports = (srcFiles, context) => {
    const exportAll = new Map();
    for (const file of srcFiles) {
        const exports = new Map();
        const imports = new Map();
        const currentExports = ExportMap.get(file, context);
        if (currentExports) {
            const { dependencies, reexports, imports: localImportList, namespace, visitorKeys, } = currentExports;
            visitorKeyMap.set(file, visitorKeys);
            const currentExportAll = new Set();
            for (const getDependency of dependencies) {
                const dependency = getDependency();
                if (dependency === null) {
                    continue;
                }
                currentExportAll.add(dependency.path);
            }
            exportAll.set(file, currentExportAll);
            for (const [key, value] of reexports.entries()) {
                if (key === DEFAULT) {
                    exports.set(AST_NODE_TYPES.ImportDefaultSpecifier, {
                        whereUsed: new Set(),
                    });
                }
                else {
                    exports.set(key, { whereUsed: new Set() });
                }
                const reexport = value.getImport();
                if (!reexport) {
                    continue;
                }
                let localImport = imports.get(reexport.path);
                const currentValue = value.local === DEFAULT
                    ? AST_NODE_TYPES.ImportDefaultSpecifier
                    : value.local;
                localImport =
                    localImport === undefined
                        ? new Set([currentValue])
                        : new Set([...localImport, currentValue]);
                imports.set(reexport.path, localImport);
            }
            for (const [key, value] of localImportList.entries()) {
                if (isNodeModule(key)) {
                    continue;
                }
                const localImport = imports.get(key) || new Set();
                for (const { importedSpecifiers } of value.declarations) {
                    for (const specifier of importedSpecifiers) {
                        localImport.add(specifier);
                    }
                }
                imports.set(key, localImport);
            }
            importList.set(file, imports);
            if (ignoredFiles.has(file)) {
                continue;
            }
            for (const [key, _value] of namespace.entries()) {
                if (key === DEFAULT) {
                    exports.set(AST_NODE_TYPES.ImportDefaultSpecifier, {
                        whereUsed: new Set(),
                    });
                }
                else {
                    exports.set(key, { whereUsed: new Set() });
                }
            }
        }
        exports.set(AST_NODE_TYPES.ExportAllDeclaration, {
            whereUsed: new Set(),
        });
        exports.set(AST_NODE_TYPES.ImportNamespaceSpecifier, {
            whereUsed: new Set(),
        });
        exportList.set(file, exports);
    }
    for (const [key, value] of exportAll.entries()) {
        for (const val of value) {
            const currentExports = exportList.get(val);
            if (currentExports) {
                const currentExport = currentExports.get(AST_NODE_TYPES.ExportAllDeclaration);
                currentExport.whereUsed.add(key);
            }
        }
    }
};
const determineUsage = () => {
    for (const [listKey, listValue] of importList.entries()) {
        for (const [key, value] of listValue.entries()) {
            const exports = exportList.get(key);
            if (exports !== undefined) {
                for (const currentImport of value) {
                    let specifier;
                    if (currentImport === AST_NODE_TYPES.ImportNamespaceSpecifier) {
                        specifier = AST_NODE_TYPES.ImportNamespaceSpecifier;
                    }
                    else if (currentImport === AST_NODE_TYPES.ImportDefaultSpecifier) {
                        specifier = AST_NODE_TYPES.ImportDefaultSpecifier;
                    }
                    else {
                        specifier = currentImport;
                    }
                    if (specifier !== undefined) {
                        const exportStatement = exports.get(specifier);
                        if (exportStatement !== undefined) {
                            const { whereUsed } = exportStatement;
                            whereUsed.add(listKey);
                            exports.set(specifier, { whereUsed });
                        }
                    }
                }
            }
        }
    }
};
let srcFiles;
let lastPrepareKey;
const doPreparation = (src, ignoreExports, context) => {
    const prepareKey = JSON.stringify({
        src: src.sort(),
        ignoreExports: (ignoreExports || []).sort(),
        extensions: [...getFileExtensions(context.settings)].sort(),
    });
    if (prepareKey === lastPrepareKey) {
        return;
    }
    importList.clear();
    exportList.clear();
    ignoredFiles.clear();
    filesOutsideSrc.clear();
    srcFiles = resolveFiles(src, ignoreExports, context);
    prepareImportsAndExports(srcFiles, context);
    determineUsage();
    lastPrepareKey = prepareKey;
};
const newNamespaceImportExists = (specifiers) => specifiers.some(({ type }) => type === AST_NODE_TYPES.ImportNamespaceSpecifier);
const newDefaultImportExists = (specifiers) => specifiers.some(({ type }) => type === AST_NODE_TYPES.ImportDefaultSpecifier);
const fileIsInPkg = (file) => {
    const { pkg, path: pkgPath } = readPkgUp({ cwd: file });
    const basePath = path.dirname(pkgPath);
    const checkPkgFieldString = (pkgField) => {
        if (path.join(basePath, pkgField) === file) {
            return true;
        }
    };
    const checkPkgFieldObject = (pkgField) => {
        const pkgFieldFiles = Object.values(pkgField).flatMap(value => typeof value === 'boolean' ? [] : path.join(basePath, value));
        if (pkgFieldFiles.includes(file)) {
            return true;
        }
    };
    const checkPkgField = (pkgField) => {
        if (typeof pkgField === 'string') {
            return checkPkgFieldString(pkgField);
        }
        if (typeof pkgField === 'object') {
            return checkPkgFieldObject(pkgField);
        }
    };
    if (!pkg) {
        return false;
    }
    if (pkg.private === true) {
        return false;
    }
    if (pkg.bin && checkPkgField(pkg.bin)) {
        return true;
    }
    if (pkg.browser && checkPkgField(pkg.browser)) {
        return true;
    }
    if (pkg.main && checkPkgFieldString(pkg.main)) {
        return true;
    }
    return false;
};
export default createRule({
    name: 'no-unused-modules',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Helpful warnings',
            description: 'Forbid modules without exports, or exports without matching import in another module.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    src: {
                        description: 'files/paths to be analyzed (only for unused exports)',
                        type: 'array',
                        uniqueItems: true,
                        items: {
                            type: 'string',
                            minLength: 1,
                        },
                    },
                    ignoreExports: {
                        description: 'files/paths for which unused exports will not be reported (e.g module entry points)',
                        type: 'array',
                        uniqueItems: true,
                        items: {
                            type: 'string',
                            minLength: 1,
                        },
                    },
                    missingExports: {
                        description: 'report modules without any exports',
                        type: 'boolean',
                    },
                    unusedExports: {
                        description: 'report exports without any usage',
                        type: 'boolean',
                    },
                    ignoreUnusedTypeExports: {
                        description: 'ignore type exports without any usage',
                        type: 'boolean',
                    },
                },
                anyOf: [
                    {
                        type: 'object',
                        properties: {
                            unusedExports: {
                                type: 'boolean',
                                enum: [true],
                            },
                            src: {
                                type: 'array',
                                minItems: 1,
                            },
                        },
                        required: ['unusedExports'],
                    },
                    {
                        type: 'object',
                        properties: {
                            missingExports: {
                                type: 'boolean',
                                enum: [true],
                            },
                        },
                        required: ['missingExports'],
                    },
                ],
            },
        ],
        messages: {
            notFound: 'No exports found',
            unused: "exported declaration '{{value}}' not used within other modules",
        },
    },
    defaultOptions: [],
    create(context) {
        const { src = [process.cwd()], ignoreExports = [], missingExports, unusedExports, ignoreUnusedTypeExports, } = context.options[0] || {};
        if (unusedExports) {
            doPreparation(src, ignoreExports, context);
        }
        const filename = context.physicalFilename;
        const checkExportPresence = (node) => {
            if (!missingExports) {
                return;
            }
            if (ignoreUnusedTypeExports) {
                return;
            }
            if (ignoredFiles.has(filename)) {
                return;
            }
            const exportCount = exportList.get(filename);
            const exportAll = exportCount.get(AST_NODE_TYPES.ExportAllDeclaration);
            const namespaceImports = exportCount.get(AST_NODE_TYPES.ImportNamespaceSpecifier);
            exportCount.delete(AST_NODE_TYPES.ExportAllDeclaration);
            exportCount.delete(AST_NODE_TYPES.ImportNamespaceSpecifier);
            if (exportCount.size === 0) {
                context.report({
                    node: node.body[0] ?? node,
                    messageId: 'notFound',
                });
            }
            exportCount.set(AST_NODE_TYPES.ExportAllDeclaration, exportAll);
            exportCount.set(AST_NODE_TYPES.ImportNamespaceSpecifier, namespaceImports);
        };
        const checkUsage = (node, exportedValue, isTypeExport) => {
            if (!unusedExports) {
                return;
            }
            if (isTypeExport && ignoreUnusedTypeExports) {
                return;
            }
            if (ignoredFiles.has(filename)) {
                return;
            }
            if (fileIsInPkg(filename)) {
                return;
            }
            if (filesOutsideSrc.has(filename)) {
                return;
            }
            if (!srcFiles.has(filename)) {
                srcFiles = resolveFiles(src, ignoreExports, context);
                if (!srcFiles.has(filename)) {
                    filesOutsideSrc.add(filename);
                    return;
                }
            }
            const exports = exportList.get(filename);
            if (!exports) {
                console.error(`file \`${filename}\` has no exports. Please update to the latest, and if it still happens, report this on https://github.com/import-js/eslint-plugin-import/issues/2866!`);
                return;
            }
            const exportAll = exports.get(AST_NODE_TYPES.ExportAllDeclaration);
            if (exportAll !== undefined &&
                exportedValue !== AST_NODE_TYPES.ImportDefaultSpecifier &&
                exportAll.whereUsed.size > 0) {
                return;
            }
            const namespaceImports = exports.get(AST_NODE_TYPES.ImportNamespaceSpecifier);
            if (namespaceImports !== undefined &&
                namespaceImports.whereUsed.size > 0) {
                return;
            }
            const exportsKey = exportedValue === DEFAULT
                ? AST_NODE_TYPES.ImportDefaultSpecifier
                : exportedValue;
            const exportStatement = exports.get(exportsKey);
            const value = exportsKey === AST_NODE_TYPES.ImportDefaultSpecifier
                ? DEFAULT
                : exportsKey;
            if (exportStatement === undefined) {
                context.report({
                    node,
                    messageId: 'unused',
                    data: {
                        value,
                    },
                });
            }
            else {
                if (exportStatement.whereUsed.size === 0) {
                    context.report({
                        node,
                        messageId: 'unused',
                        data: {
                            value,
                        },
                    });
                }
            }
        };
        const updateExportUsage = (node) => {
            if (ignoredFiles.has(filename)) {
                return;
            }
            const exports = exportList.get(filename) ??
                new Map();
            const newExports = new Map();
            const newExportIdentifiers = new Set();
            for (const s of node.body) {
                if (s.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
                    newExportIdentifiers.add(AST_NODE_TYPES.ImportDefaultSpecifier);
                }
                if (s.type === AST_NODE_TYPES.ExportNamedDeclaration) {
                    if (s.specifiers.length > 0) {
                        for (const specifier of s.specifiers) {
                            if (specifier.exported) {
                                newExportIdentifiers.add(getValue(specifier.exported));
                            }
                        }
                    }
                    forEachDeclarationIdentifier(s.declaration, name => {
                        newExportIdentifiers.add(name);
                    });
                }
            }
            for (const [key, value] of exports.entries()) {
                if (newExportIdentifiers.has(key)) {
                    newExports.set(key, value);
                }
            }
            for (const key of newExportIdentifiers) {
                if (!exports.has(key)) {
                    newExports.set(key, { whereUsed: new Set() });
                }
            }
            const exportAll = exports.get(AST_NODE_TYPES.ExportAllDeclaration);
            const namespaceImports = exports.get(AST_NODE_TYPES.ImportNamespaceSpecifier) ?? { whereUsed: new Set() };
            newExports.set(AST_NODE_TYPES.ExportAllDeclaration, exportAll);
            newExports.set(AST_NODE_TYPES.ImportNamespaceSpecifier, namespaceImports);
            exportList.set(filename, newExports);
        };
        const updateImportUsage = (node) => {
            if (!unusedExports) {
                return;
            }
            const oldImportPaths = importList.get(filename) ?? new Map();
            const oldNamespaceImports = new Set();
            const newNamespaceImports = new Set();
            const oldExportAll = new Set();
            const newExportAll = new Set();
            const oldDefaultImports = new Set();
            const newDefaultImports = new Set();
            const oldImports = new Map();
            const newImports = new Map();
            for (const [key, value] of oldImportPaths.entries()) {
                if (value.has(AST_NODE_TYPES.ExportAllDeclaration)) {
                    oldExportAll.add(key);
                }
                if (value.has(AST_NODE_TYPES.ImportNamespaceSpecifier)) {
                    oldNamespaceImports.add(key);
                }
                if (value.has(AST_NODE_TYPES.ImportDefaultSpecifier)) {
                    oldDefaultImports.add(key);
                }
                for (const val of value) {
                    if (val !== AST_NODE_TYPES.ImportNamespaceSpecifier &&
                        val !== AST_NODE_TYPES.ImportDefaultSpecifier) {
                        oldImports.set(val, key);
                    }
                }
            }
            function processDynamicImport(source) {
                if (source.type !== 'Literal' || typeof source.value !== 'string') {
                    return null;
                }
                const p = resolve(source.value, context);
                if (p == null) {
                    return null;
                }
                newNamespaceImports.add(p);
            }
            visit(node, visitorKeyMap.get(filename), {
                ImportExpression(child) {
                    processDynamicImport(child.source);
                },
                CallExpression(child_) {
                    const child = child_;
                    if (child.callee.type === 'Import') {
                        processDynamicImport(child.arguments[0]);
                    }
                },
            });
            for (const astNode of node.body) {
                let resolvedPath;
                if (astNode.type === AST_NODE_TYPES.ExportNamedDeclaration &&
                    astNode.source) {
                    resolvedPath = resolve(astNode.source.raw.replaceAll(/('|")/g, ''), context);
                    for (const specifier of astNode.specifiers) {
                        const name = getValue(specifier.local);
                        if (name === DEFAULT) {
                            newDefaultImports.add(resolvedPath);
                        }
                        else {
                            newImports.set(name, resolvedPath);
                        }
                    }
                }
                if (astNode.type === AST_NODE_TYPES.ExportAllDeclaration) {
                    resolvedPath = resolve(astNode.source.raw.replaceAll(/('|")/g, ''), context);
                    newExportAll.add(resolvedPath);
                }
                if (astNode.type === AST_NODE_TYPES.ImportDeclaration) {
                    resolvedPath = resolve(astNode.source.raw.replaceAll(/('|")/g, ''), context);
                    if (!resolvedPath) {
                        continue;
                    }
                    if (isNodeModule(resolvedPath)) {
                        continue;
                    }
                    if (newNamespaceImportExists(astNode.specifiers)) {
                        newNamespaceImports.add(resolvedPath);
                    }
                    if (newDefaultImportExists(astNode.specifiers)) {
                        newDefaultImports.add(resolvedPath);
                    }
                    for (const specifier of astNode.specifiers.filter(specifier => specifier.type !== AST_NODE_TYPES.ImportDefaultSpecifier &&
                        specifier.type !== AST_NODE_TYPES.ImportNamespaceSpecifier)) {
                        if ('imported' in specifier) {
                            newImports.set(getValue(specifier.imported), resolvedPath);
                        }
                    }
                }
            }
            for (const value of newExportAll) {
                if (!oldExportAll.has(value)) {
                    const imports = oldImportPaths.get(value) ?? new Set();
                    imports.add(AST_NODE_TYPES.ExportAllDeclaration);
                    oldImportPaths.set(value, imports);
                    let exports = exportList.get(value);
                    let currentExport;
                    if (exports === undefined) {
                        exports = new Map();
                        exportList.set(value, exports);
                    }
                    else {
                        currentExport = exports.get(AST_NODE_TYPES.ExportAllDeclaration);
                    }
                    if (currentExport === undefined) {
                        const whereUsed = new Set();
                        whereUsed.add(filename);
                        exports.set(AST_NODE_TYPES.ExportAllDeclaration, {
                            whereUsed,
                        });
                    }
                    else {
                        currentExport.whereUsed.add(filename);
                    }
                }
            }
            for (const value of oldExportAll) {
                if (!newExportAll.has(value)) {
                    const imports = oldImportPaths.get(value);
                    imports.delete(AST_NODE_TYPES.ExportAllDeclaration);
                    const exports = exportList.get(value);
                    if (exports !== undefined) {
                        const currentExport = exports.get(AST_NODE_TYPES.ExportAllDeclaration);
                        if (currentExport !== undefined) {
                            currentExport.whereUsed.delete(filename);
                        }
                    }
                }
            }
            for (const value of newDefaultImports) {
                if (!oldDefaultImports.has(value)) {
                    let imports = oldImportPaths.get(value);
                    if (imports === undefined) {
                        imports = new Set();
                    }
                    imports.add(AST_NODE_TYPES.ImportDefaultSpecifier);
                    oldImportPaths.set(value, imports);
                    let exports = exportList.get(value);
                    let currentExport;
                    if (exports === undefined) {
                        exports = new Map();
                        exportList.set(value, exports);
                    }
                    else {
                        currentExport = exports.get(AST_NODE_TYPES.ImportDefaultSpecifier);
                    }
                    if (currentExport === undefined) {
                        const whereUsed = new Set();
                        whereUsed.add(filename);
                        exports.set(AST_NODE_TYPES.ImportDefaultSpecifier, {
                            whereUsed,
                        });
                    }
                    else {
                        currentExport.whereUsed.add(filename);
                    }
                }
            }
            for (const value of oldDefaultImports) {
                if (!newDefaultImports.has(value)) {
                    const imports = oldImportPaths.get(value);
                    imports.delete(AST_NODE_TYPES.ImportDefaultSpecifier);
                    const exports = exportList.get(value);
                    if (exports !== undefined) {
                        const currentExport = exports.get(AST_NODE_TYPES.ImportDefaultSpecifier);
                        if (currentExport !== undefined) {
                            currentExport.whereUsed.delete(filename);
                        }
                    }
                }
            }
            for (const value of newNamespaceImports) {
                if (!oldNamespaceImports.has(value)) {
                    let imports = oldImportPaths.get(value);
                    if (imports === undefined) {
                        imports = new Set();
                    }
                    imports.add(AST_NODE_TYPES.ImportNamespaceSpecifier);
                    oldImportPaths.set(value, imports);
                    let exports = exportList.get(value);
                    let currentExport;
                    if (exports === undefined) {
                        exports = new Map();
                        exportList.set(value, exports);
                    }
                    else {
                        currentExport = exports.get(AST_NODE_TYPES.ImportNamespaceSpecifier);
                    }
                    if (currentExport === undefined) {
                        const whereUsed = new Set();
                        whereUsed.add(filename);
                        exports.set(AST_NODE_TYPES.ImportNamespaceSpecifier, {
                            whereUsed,
                        });
                    }
                    else {
                        currentExport.whereUsed.add(filename);
                    }
                }
            }
            for (const value of oldNamespaceImports) {
                if (!newNamespaceImports.has(value)) {
                    const imports = oldImportPaths.get(value);
                    imports.delete(AST_NODE_TYPES.ImportNamespaceSpecifier);
                    const exports = exportList.get(value);
                    if (exports !== undefined) {
                        const currentExport = exports.get(AST_NODE_TYPES.ImportNamespaceSpecifier);
                        if (currentExport !== undefined) {
                            currentExport.whereUsed.delete(filename);
                        }
                    }
                }
            }
            for (const [key, value] of newImports.entries()) {
                if (!oldImports.has(key)) {
                    let imports = oldImportPaths.get(value);
                    if (imports === undefined) {
                        imports = new Set();
                    }
                    imports.add(key);
                    oldImportPaths.set(value, imports);
                    let exports = exportList.get(value);
                    let currentExport;
                    if (exports === undefined) {
                        exports = new Map();
                        exportList.set(value, exports);
                    }
                    else {
                        currentExport = exports.get(key);
                    }
                    if (currentExport === undefined) {
                        const whereUsed = new Set();
                        whereUsed.add(filename);
                        exports.set(key, { whereUsed });
                    }
                    else {
                        currentExport.whereUsed.add(filename);
                    }
                }
            }
            for (const [key, value] of oldImports.entries()) {
                if (!newImports.has(key)) {
                    const imports = oldImportPaths.get(value);
                    imports.delete(key);
                    const exports = exportList.get(value);
                    if (exports !== undefined) {
                        const currentExport = exports.get(key);
                        if (currentExport !== undefined) {
                            currentExport.whereUsed.delete(filename);
                        }
                    }
                }
            }
        };
        return {
            'Program:exit'(node) {
                updateExportUsage(node);
                updateImportUsage(node);
                checkExportPresence(node);
            },
            ExportDefaultDeclaration(node) {
                checkUsage(node, AST_NODE_TYPES.ImportDefaultSpecifier, false);
            },
            ExportNamedDeclaration(node) {
                for (const specifier of node.specifiers) {
                    checkUsage(specifier, getValue(specifier.exported), false);
                }
                forEachDeclarationIdentifier(node.declaration, (name, isTypeExport) => {
                    checkUsage(node, name, isTypeExport);
                });
            },
        };
    },
});
//# sourceMappingURL=no-unused-modules.js.map