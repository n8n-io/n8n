import { isBuiltin } from 'node:module';
import path from 'node:path';
import { useRuleContext } from 'eslint-import-context';
import { createFilesMatcher, parseTsconfig, } from 'get-tsconfig';
import { isBunBuiltin } from 'is-bun-module';
import { stableHash } from 'stable-hash-x';
import { ResolverFactory } from 'unrs-resolver';
import { IMPORT_RESOLVER_NAME, JS_EXT_PATTERN, TSCONFIG_NOT_FOUND_REGEXP, } from './constants.js';
import { mangleScopedPackage, removeQuerystring, sortProjectsByAffinity, } from './helpers.js';
import { log } from './logger.js';
import { normalizeOptions } from './normalize-options.js';
export * from './constants.js';
export * from './helpers.js';
export * from './normalize-options.js';
const resolverCache = new Map();
const tsconfigCache = new Map();
const matcherCache = new Map();
const unrsResolve = (source, file, resolver) => {
    const result = resolver.sync(path.dirname(file), source);
    if (result.path) {
        return {
            found: true,
            path: result.path,
        };
    }
    if (result.error) {
        log('unrs-resolver error:', result.error);
        if (TSCONFIG_NOT_FOUND_REGEXP.test(result.error)) {
            throw new Error(result.error);
        }
    }
    return {
        found: false,
    };
};
const isBun = !!process.versions.bun;
export const resolve = (source, file, options, resolver) => {
    options ||= {};
    if (isBun || options.bun ? isBunBuiltin(source) : isBuiltin(source)) {
        log('matched core:', source);
        return { found: true, path: null };
    }
    source = removeQuerystring(source);
    if (!resolver) {
        const optionsHash = stableHash(options);
        const context = useRuleContext();
        const cwd = context?.cwd || process.cwd();
        options = normalizeOptions(options, cwd);
        const cacheKey = `${optionsHash}\0${cwd}`;
        let cached = resolverCache.get(cacheKey);
        if (!cached && !options.project) {
            resolverCache.set(cacheKey, (cached = new ResolverFactory(options)));
        }
        resolver = cached;
    }
    createResolver: if (!resolver) {
        const projects = sortProjectsByAffinity(options.project, file);
        for (const tsconfigPath of projects) {
            const resolverCached = resolverCache.get(tsconfigPath);
            if (resolverCached) {
                resolver = resolverCached;
                break createResolver;
            }
            let tsconfigCached = tsconfigCache.get(tsconfigPath);
            if (!tsconfigCached) {
                tsconfigCache.set(tsconfigPath, (tsconfigCached = parseTsconfig(tsconfigPath)));
            }
            let matcherCached = matcherCache.get(tsconfigPath);
            if (!matcherCached) {
                matcherCache.set(tsconfigPath, (matcherCached = createFilesMatcher({
                    config: tsconfigCached,
                    path: tsconfigPath,
                })));
            }
            const tsconfig = matcherCached(file);
            if (!tsconfig) {
                log('tsconfig', tsconfigPath, 'does not match', file);
                continue;
            }
            log('matched tsconfig at:', tsconfigPath, 'for', file);
            options = {
                ...options,
                tsconfig: {
                    references: 'auto',
                    ...options.tsconfig,
                    configFile: tsconfigPath,
                },
            };
            resolver = new ResolverFactory(options);
            const resolved = resolve(source, file, options, resolver);
            if (resolved.found) {
                resolverCache.set(tsconfigPath, resolver);
                return resolved;
            }
        }
        log('no tsconfig matched', file, 'with', ...projects, ', trying from the the nearest one instead');
        for (const project of projects) {
            const resolved = resolve(source, file, { ...options, project }, resolver);
            if (resolved.found) {
                return resolved;
            }
        }
    }
    if (!resolver) {
        return {
            found: false,
        };
    }
    const resolved = unrsResolve(source, file, resolver);
    const foundPath = resolved.path;
    if (((foundPath && JS_EXT_PATTERN.test(foundPath)) ||
        (options.alwaysTryTypes !== false && !foundPath)) &&
        !/^@types[/\\]/.test(source) &&
        !path.isAbsolute(source) &&
        !source.startsWith('.')) {
        const definitelyTyped = unrsResolve('@types/' + mangleScopedPackage(source), file, resolver);
        if (definitelyTyped.found) {
            return definitelyTyped;
        }
    }
    if (foundPath) {
        log('matched path:', foundPath);
    }
    else {
        log("didn't find", source, 'with', options.tsconfig?.configFile || options.project);
    }
    return resolved;
};
export const createTypeScriptImportResolver = (options) => {
    let cwd = process.cwd();
    options = normalizeOptions(options, cwd);
    let resolver = options.project ? undefined : new ResolverFactory(options);
    return {
        interfaceVersion: 3,
        name: IMPORT_RESOLVER_NAME,
        resolve(source, file) {
            const context = useRuleContext();
            if (context && cwd !== context.cwd) {
                cwd = context.cwd;
                options = normalizeOptions(options, cwd);
                if (options.project) {
                    resolver = resolver
                        ? resolver.cloneWithOptions(options)
                        : new ResolverFactory(options);
                }
            }
            return resolve(source, file, options, resolver);
        },
    };
};
//# sourceMappingURL=index.js.map