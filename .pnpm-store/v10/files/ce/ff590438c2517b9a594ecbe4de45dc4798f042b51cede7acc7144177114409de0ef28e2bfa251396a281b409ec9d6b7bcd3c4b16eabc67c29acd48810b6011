import path from 'node:path';
import { minimatch } from 'minimatch';
import { isBuiltIn, isExternalModule, isScoped, createRule, moduleVisitor, resolve, parsePath, stringifyPath, } from '../utils/index.js';
const modifierValues = ['always', 'ignorePackages', 'never'];
const modifierSchema = {
    type: 'string',
    enum: [...modifierValues],
};
const modifierByFileExtensionSchema = {
    type: 'object',
    patternProperties: { '.*': modifierSchema },
};
const properties = {
    type: 'object',
    properties: {
        pattern: modifierByFileExtensionSchema,
        ignorePackages: {
            type: 'boolean',
        },
        checkTypeImports: {
            type: 'boolean',
        },
        pathGroupOverrides: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    pattern: { type: 'string' },
                    patternOptions: { type: 'object' },
                    action: {
                        type: 'string',
                        enum: ['enforce', 'ignore'],
                    },
                },
                additionalProperties: false,
                required: ['pattern', 'action'],
            },
        },
        fix: {
            type: 'boolean',
        },
    },
};
function buildProperties(context) {
    const result = {
        defaultConfig: 'never',
        pattern: {},
        ignorePackages: false,
        checkTypeImports: false,
        pathGroupOverrides: [],
        fix: false,
    };
    for (const obj of context.options) {
        if (typeof obj === 'string') {
            result.defaultConfig = obj;
            continue;
        }
        if (typeof obj !== 'object' || !obj) {
            continue;
        }
        if (obj.fix != null) {
            result.fix = Boolean(obj.fix);
        }
        if ((!('pattern' in obj) || obj.pattern == null) &&
            obj.ignorePackages == null &&
            obj.checkTypeImports == null) {
            Object.assign(result.pattern, obj);
            continue;
        }
        if ('pattern' in obj && obj.pattern != null) {
            Object.assign(result.pattern, obj.pattern);
        }
        if (typeof obj.ignorePackages === 'boolean') {
            result.ignorePackages = obj.ignorePackages;
        }
        if (typeof obj.checkTypeImports === 'boolean') {
            result.checkTypeImports = obj.checkTypeImports;
        }
        if (Array.isArray(obj.pathGroupOverrides)) {
            result.pathGroupOverrides = obj.pathGroupOverrides;
        }
    }
    if (result.defaultConfig === 'ignorePackages') {
        result.defaultConfig = 'always';
        result.ignorePackages = true;
    }
    return result;
}
function isExternalRootModule(file) {
    if (file === '.' || file === '..') {
        return false;
    }
    const slashCount = file.split('/').length - 1;
    return slashCount === 0 || (isScoped(file) && slashCount <= 1);
}
function computeOverrideAction(pathGroupOverrides, path) {
    for (const { pattern, patternOptions, action } of pathGroupOverrides) {
        if (minimatch(path, pattern, patternOptions || { nocomment: true })) {
            return action;
        }
    }
}
function replaceImportPath(source, importPath) {
    return source.replace(/^(['"])(.+)\1$/, (_, quote) => `${quote}${importPath}${quote}`);
}
export default createRule({
    name: 'extensions',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Ensure consistent use of file extension within the import path.',
        },
        fixable: 'code',
        hasSuggestions: true,
        schema: {
            anyOf: [
                {
                    type: 'array',
                    items: [modifierSchema],
                    additionalItems: false,
                },
                {
                    type: 'array',
                    items: [modifierSchema, properties],
                    additionalItems: false,
                },
                {
                    type: 'array',
                    items: [properties],
                    additionalItems: false,
                },
                {
                    type: 'array',
                    items: [modifierSchema, modifierByFileExtensionSchema],
                    additionalItems: false,
                },
                {
                    type: 'array',
                    items: [modifierByFileExtensionSchema],
                    additionalItems: false,
                },
            ],
        },
        messages: {
            missing: 'Missing file extension for "{{importPath}}"',
            missingKnown: 'Missing file extension "{{extension}}" for "{{importPath}}"',
            unexpected: 'Unexpected use of file extension "{{extension}}" for "{{importPath}}"',
            addMissing: 'Add "{{extension}}" file extension from "{{importPath}}" into "{{fixedImportPath}}"',
            removeUnexpected: 'Remove unexpected "{{extension}}" file extension from "{{importPath}}" into "{{fixedImportPath}}"',
        },
    },
    defaultOptions: [],
    create(context) {
        const props = buildProperties(context);
        function getModifier(extension) {
            return props.pattern[extension] || props.defaultConfig;
        }
        function isUseOfExtensionRequired(extension, isPackage) {
            return (getModifier(extension) === 'always' &&
                (!props.ignorePackages || !isPackage));
        }
        function isUseOfExtensionForbidden(extension) {
            return getModifier(extension) === 'never';
        }
        function isResolvableWithoutExtension(file) {
            const extension = path.extname(file);
            const fileWithoutExtension = file.slice(0, -extension.length);
            const resolvedFileWithoutExtension = resolve(fileWithoutExtension, context);
            return resolvedFileWithoutExtension === resolve(file, context);
        }
        return moduleVisitor((source, node) => {
            if (!source || !source.value) {
                return;
            }
            const importPathWithQueryString = source.value;
            const overrideAction = computeOverrideAction(props.pathGroupOverrides || [], importPathWithQueryString);
            if (overrideAction === 'ignore') {
                return;
            }
            if (!overrideAction &&
                isBuiltIn(importPathWithQueryString, context.settings)) {
                return;
            }
            const { pathname: importPath, query, hash, } = parsePath(importPathWithQueryString);
            if (!overrideAction && isExternalRootModule(importPath)) {
                return;
            }
            const resolvedPath = resolve(importPath, context);
            const extension = path.extname(resolvedPath || importPath).slice(1);
            const isPackage = isExternalModule(importPath, resolve(importPath, context), context) || isScoped(importPath);
            if (!extension || !importPath.endsWith(`.${extension}`)) {
                if (!props.checkTypeImports &&
                    (('importKind' in node && node.importKind === 'type') ||
                        ('exportKind' in node && node.exportKind === 'type'))) {
                    return;
                }
                const extensionRequired = isUseOfExtensionRequired(extension, !overrideAction && isPackage);
                const extensionForbidden = isUseOfExtensionForbidden(extension);
                if (extensionRequired && !extensionForbidden) {
                    const fixedImportPath = stringifyPath({
                        pathname: `${/([\\/]|[\\/]?\.?\.)$/.test(importPath)
                            ? `${importPath.endsWith('/')
                                ? importPath.slice(0, -1)
                                : importPath}/index.${extension}`
                            : `${importPath}.${extension}`}`,
                        query,
                        hash,
                    });
                    const fixOrSuggest = {
                        fix(fixer) {
                            return fixer.replaceText(source, replaceImportPath(source.raw, fixedImportPath));
                        },
                    };
                    context.report({
                        node: source,
                        messageId: extension ? 'missingKnown' : 'missing',
                        data: {
                            extension,
                            importPath: importPathWithQueryString,
                        },
                        ...(extension &&
                            (props.fix
                                ? fixOrSuggest
                                : {
                                    suggest: [
                                        {
                                            ...fixOrSuggest,
                                            messageId: 'addMissing',
                                            data: {
                                                extension,
                                                importPath: importPathWithQueryString,
                                                fixedImportPath,
                                            },
                                        },
                                    ],
                                })),
                    });
                }
            }
            else if (extension &&
                isUseOfExtensionForbidden(extension) &&
                isResolvableWithoutExtension(importPath)) {
                const fixedPathname = importPath.slice(0, -(extension.length + 1));
                const isIndex = fixedPathname.endsWith('/index');
                const fixedImportPath = stringifyPath({
                    pathname: isIndex ? fixedPathname.slice(0, -6) : fixedPathname,
                    query,
                    hash,
                });
                const fixOrSuggest = {
                    fix(fixer) {
                        return fixer.replaceText(source, replaceImportPath(source.raw, fixedImportPath));
                    },
                };
                const commonSuggestion = {
                    ...fixOrSuggest,
                    messageId: 'removeUnexpected',
                    data: {
                        extension,
                        importPath: importPathWithQueryString,
                        fixedImportPath,
                    },
                };
                context.report({
                    node: source,
                    messageId: 'unexpected',
                    data: {
                        extension,
                        importPath: importPathWithQueryString,
                    },
                    ...(props.fix
                        ? fixOrSuggest
                        : {
                            suggest: [
                                commonSuggestion,
                                isIndex && {
                                    ...commonSuggestion,
                                    fix(fixer) {
                                        return fixer.replaceText(source, replaceImportPath(source.raw, stringifyPath({
                                            pathname: fixedPathname,
                                            query,
                                            hash,
                                        })));
                                    },
                                    data: {
                                        ...commonSuggestion.data,
                                        fixedImportPath: stringifyPath({
                                            pathname: fixedPathname,
                                            query,
                                            hash,
                                        }),
                                    },
                                },
                            ].filter(Boolean),
                        }),
                });
            }
        }, { commonjs: true });
    },
});
//# sourceMappingURL=extensions.js.map