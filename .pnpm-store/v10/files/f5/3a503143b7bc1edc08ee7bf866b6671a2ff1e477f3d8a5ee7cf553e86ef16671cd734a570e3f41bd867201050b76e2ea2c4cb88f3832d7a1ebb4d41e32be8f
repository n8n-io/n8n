import { isBuiltin } from 'node:module';
import path from 'node:path';
import { getContextPackagePath } from './package-path.js';
import { resolve } from './resolve.js';
function baseModule(name) {
    if (isScoped(name)) {
        const [scope, pkg] = name.split('/');
        return `${scope}/${pkg}`;
    }
    const [pkg] = name.split('/');
    return pkg;
}
function isInternalRegexMatch(name, settings) {
    const internalScope = settings?.['import-x/internal-regex'];
    return internalScope && new RegExp(internalScope).test(name);
}
export function isAbsolute(name) {
    return typeof name === 'string' && path.isAbsolute(name);
}
export function isBuiltIn(name, settings, modulePath) {
    if (modulePath || !name) {
        return false;
    }
    const base = baseModule(name);
    const extras = (settings && settings['import-x/core-modules']) || [];
    return isBuiltin(base) || extras.includes(base);
}
export function isExternalModule(name, modulePath, context) {
    return ((isModule(name) || isScoped(name)) &&
        typeTest(name, context, modulePath) === 'external');
}
export function isExternalModuleMain(name, modulePath, context) {
    if (arguments.length < 3) {
        throw new TypeError('isExternalModule: name, path, and context are all required');
    }
    return (isModuleMain(name) && typeTest(name, context, modulePath) === 'external');
}
const moduleRegExp = /^\w/;
function isModule(name) {
    return !!name && moduleRegExp.test(name);
}
const moduleMainRegExp = /^\w((?!\/).)*$/;
function isModuleMain(name) {
    return !!name && moduleMainRegExp.test(name);
}
const scopedRegExp = /^@[^/]+\/?[^/]+/;
export function isScoped(name) {
    return !!name && scopedRegExp.test(name);
}
const scopedMainRegExp = /^@[^/]+\/?[^/]+$/;
export function isScopedMain(name) {
    return !!name && scopedMainRegExp.test(name);
}
function isRelativeToParent(name) {
    return /^\.\.$|^\.\.[/\\]/.test(name);
}
const indexFiles = new Set(['.', './', './index', './index.js']);
function isIndex(name) {
    return indexFiles.has(name);
}
function isRelativeToSibling(name) {
    return /^\.[/\\]/.test(name);
}
function isExternalPath(filepath, context) {
    if (!filepath) {
        return false;
    }
    const { settings } = context;
    const packagePath = getContextPackagePath(context);
    if (path.relative(packagePath, filepath).startsWith('..')) {
        return true;
    }
    const folders = settings?.['import-x/external-module-folders'] || [
        'node_modules',
    ];
    return folders.some(folder => {
        const folderPath = path.resolve(packagePath, folder);
        const relativePath = path.relative(folderPath, filepath);
        return !relativePath.startsWith('..');
    });
}
function isInternalPath(filepath, context) {
    if (!filepath) {
        return false;
    }
    const packagePath = getContextPackagePath(context);
    return !path.relative(packagePath, filepath).startsWith('../');
}
export function isExternalLookingName(name) {
    return isModule(name) || isScoped(name);
}
function typeTest(name, context, path) {
    const { settings } = context;
    if (typeof name === 'string') {
        if (isInternalRegexMatch(name, settings)) {
            return 'internal';
        }
        if (isAbsolute(name)) {
            return 'absolute';
        }
        if (isBuiltIn(name, settings, path)) {
            return 'builtin';
        }
        if (isRelativeToParent(name)) {
            return 'parent';
        }
        if (isIndex(name)) {
            return 'index';
        }
        if (isRelativeToSibling(name)) {
            return 'sibling';
        }
    }
    if (isExternalPath(path, context)) {
        return 'external';
    }
    if (isInternalPath(path, context)) {
        return 'internal';
    }
    if (typeof name === 'string' && isExternalLookingName(name)) {
        return 'external';
    }
    return 'unknown';
}
export function importType(name, context) {
    return typeTest(name, context, typeof name === 'string' ? resolve(name, context) : null);
}
//# sourceMappingURL=import-type.js.map