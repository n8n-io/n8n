import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setRuleContext } from 'eslint-import-context';
import { stableHash } from 'stable-hash-x';
import { createNodeResolver } from '../node-resolver.js';
import { cjsRequire } from '../require.js';
import { arraify } from './arraify.js';
import { makeContextCacheKey } from './export-map.js';
import { isExternalLookingName } from './import-type.js';
import { LEGACY_NODE_RESOLVERS, normalizeConfigResolvers, resolveWithLegacyResolver, } from './legacy-resolver-settings.js';
import { ModuleCache } from './module-cache.js';
const importMetaUrl = import.meta.url;
const _filename = importMetaUrl
    ? fileURLToPath(importMetaUrl)
    : __filename;
const _dirname = path.dirname(_filename);
export const CASE_SENSITIVE_FS = !fs.existsSync(path.resolve(_dirname, path.basename(_filename).replace(/^resolve\./, 'reSOLVE.')));
export const IMPORT_RESOLVE_ERROR_NAME = 'EslintPluginImportResolveError';
export const fileExistsCache = new ModuleCache();
export function fileExistsWithCaseSync(filepath, cacheSettings, strict, leaf = true) {
    if (CASE_SENSITIVE_FS) {
        return true;
    }
    if (filepath === null) {
        return true;
    }
    if (filepath.toLowerCase() === process.cwd().toLowerCase() && !strict) {
        return true;
    }
    const parsedPath = path.parse(filepath);
    const dir = parsedPath.dir;
    let result = fileExistsCache.get(filepath, cacheSettings);
    if (result != null) {
        return result;
    }
    if (dir === '' || parsedPath.root === filepath) {
        result = true;
    }
    else {
        const filenames = fs.readdirSync(dir);
        result = filenames.includes(parsedPath.base)
            ? fileExistsWithCaseSync(dir, cacheSettings, strict, false)
            : !leaf &&
                !filenames.some(p => p.toLowerCase() === parsedPath.base.toLowerCase());
    }
    fileExistsCache.set(filepath, result);
    return result;
}
let prevSettings = null;
let memoizedHash;
function isNamedResolver(resolver) {
    return !!(typeof resolver === 'object' &&
        resolver &&
        'name' in resolver &&
        typeof resolver.name === 'string' &&
        resolver.name);
}
function isValidNewResolver(resolver) {
    if (typeof resolver !== 'object' || resolver == null) {
        return false;
    }
    if (!('resolve' in resolver) || !('interfaceVersion' in resolver)) {
        return false;
    }
    if (typeof resolver.interfaceVersion !== 'number' ||
        resolver.interfaceVersion !== 3) {
        return false;
    }
    if (typeof resolver.resolve !== 'function') {
        return false;
    }
    return true;
}
function legacyNodeResolve(resolverOptions, context, modulePath, sourceFile) {
    const { extensions, includeCoreModules, moduleDirectory, paths, preserveSymlinks, package: packageJson, packageFilter, pathFilter, packageIterator, ...rest } = resolverOptions;
    const normalizedExtensions = arraify(extensions);
    const modules = arraify(moduleDirectory);
    const symlinks = preserveSymlinks === false;
    const resolver = createNodeResolver({
        extensions: normalizedExtensions,
        builtinModules: includeCoreModules !== false,
        modules,
        symlinks,
        ...rest,
    });
    const resolved = setRuleContext(context, () => resolver.resolve(modulePath, sourceFile));
    if (resolved.found) {
        return resolved;
    }
    const normalizedPaths = arraify(paths);
    if (normalizedPaths?.length) {
        const paths = modules?.length
            ? normalizedPaths.filter(p => !modules.includes(p))
            : normalizedPaths;
        if (paths.length > 0) {
            const resolver = createNodeResolver({
                extensions: normalizedExtensions,
                builtinModules: includeCoreModules !== false,
                modules: paths,
                symlinks,
                ...rest,
            });
            const resolved = setRuleContext(context, () => resolver.resolve(modulePath, sourceFile));
            if (resolved.found) {
                return resolved;
            }
        }
    }
    if ([packageJson, packageFilter, pathFilter, packageIterator].some(it => it != null)) {
        let legacyNodeResolver;
        try {
            legacyNodeResolver = cjsRequire('eslint-import-resolver-node');
        }
        catch {
            throw new Error([
                "You're using legacy resolver options which are not supported by the new resolver.",
                'Please either:',
                '1. Install `eslint-import-resolver-node` as a fallback, or',
                '2. Remove legacy options: `package`, `packageFilter`, `pathFilter`, `packageIterator`',
            ].join('\n'));
        }
        const resolved = resolveWithLegacyResolver(legacyNodeResolver, resolverOptions, modulePath, sourceFile);
        if (resolved.found) {
            return resolved;
        }
    }
}
function fullResolve(modulePath, sourceFile, settings, context) {
    const coreSet = new Set(settings['import-x/core-modules']);
    if (coreSet.has(modulePath)) {
        return {
            found: true,
            path: null,
        };
    }
    const childContextHashKey = makeContextCacheKey(context);
    const sourceDir = path.dirname(sourceFile);
    if (prevSettings !== settings) {
        memoizedHash = stableHash(settings);
        prevSettings = settings;
    }
    const cacheKey = sourceDir +
        '\0' +
        childContextHashKey +
        '\0' +
        memoizedHash +
        '\0' +
        modulePath;
    const cacheSettings = ModuleCache.getSettings(settings);
    const cachedPath = fileExistsCache.get(cacheKey, cacheSettings);
    if (cachedPath !== undefined) {
        return { found: true, path: cachedPath };
    }
    if (settings['import-x/resolver-next']) {
        let configResolvers = settings['import-x/resolver-next'];
        if (!Array.isArray(configResolvers)) {
            configResolvers = [configResolvers];
        }
        for (let i = 0, len = configResolvers.length; i < len; i++) {
            const resolver = configResolvers[i];
            const resolverName = isNamedResolver(resolver)
                ? resolver.name
                : `settings['import-x/resolver-next'][${i}]`;
            if (!isValidNewResolver(resolver)) {
                const err = new TypeError(`${resolverName} is not a valid import resolver for eslint-plugin-import-x!`);
                err.name = IMPORT_RESOLVE_ERROR_NAME;
                throw err;
            }
            const resolved = setRuleContext(context, () => resolver.resolve(modulePath, sourceFile));
            if (!resolved.found) {
                continue;
            }
            fileExistsCache.set(cacheKey, resolved.path);
            return resolved;
        }
    }
    else {
        const configResolvers = settings['import-x/resolver-legacy'] ||
            settings['import-x/resolver'] || {
            node: settings['import-x/resolve'],
        };
        const sourceFiles = context.physicalFilename === sourceFile ||
            !isExternalLookingName(modulePath)
            ? [sourceFile]
            : [sourceFile, context.physicalFilename];
        for (const sourceFile of sourceFiles) {
            for (const { enable, name, options, resolver, } of normalizeConfigResolvers(configResolvers, sourceFile)) {
                if (!enable) {
                    continue;
                }
                if (LEGACY_NODE_RESOLVERS.has(name)) {
                    const resolverOptions = (options || {});
                    const resolved = legacyNodeResolve(resolverOptions, context, modulePath, sourceFile);
                    if (resolved?.found) {
                        fileExistsCache.set(cacheKey, resolved.path);
                        return resolved;
                    }
                    if (!resolver) {
                        continue;
                    }
                }
                const resolved = setRuleContext(context, () => resolveWithLegacyResolver(resolver, options, modulePath, sourceFile));
                if (!resolved?.found) {
                    continue;
                }
                fileExistsCache.set(cacheKey, resolved.path);
                return resolved;
            }
        }
    }
    return { found: false };
}
export function relative(modulePath, sourceFile, settings, context) {
    return fullResolve(modulePath, sourceFile, settings, context).path;
}
const erroredContexts = new Set();
export function resolve(modulePath, context) {
    try {
        return relative(modulePath, context.physicalFilename, context.settings, context);
    }
    catch (error_) {
        const error = error_;
        if (!erroredContexts.has(context)) {
            let errMessage = error.message;
            if (error.name !== IMPORT_RESOLVE_ERROR_NAME && error.stack) {
                errMessage = error.stack.replace(/^Error: /, '');
            }
            context.report({
                message: `Resolve error: ${errMessage}`,
                loc: {
                    line: 1,
                    column: 0,
                },
            });
            erroredContexts.add(context);
        }
    }
}
export function importXResolverCompat(resolver, resolverOptions = {}) {
    if (isValidNewResolver(resolver)) {
        return resolver;
    }
    return {
        interfaceVersion: 3,
        resolve(modulePath, sourceFile) {
            return resolveWithLegacyResolver(resolver, resolverOptions, modulePath, sourceFile);
        },
    };
}
//# sourceMappingURL=resolve.js.map