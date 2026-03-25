import { createRequire } from 'node:module';
import path from 'node:path';
import { cjsRequire } from '../require.js';
import { pkgDir } from './pkg-dir.js';
import { IMPORT_RESOLVE_ERROR_NAME } from './resolve.js';
export function resolveWithLegacyResolver(resolver, config, modulePath, sourceFile) {
    if (resolver.interfaceVersion === 2) {
        return resolver.resolve(modulePath, sourceFile, config);
    }
    try {
        const resolved = resolver.resolveImport(modulePath, sourceFile, config);
        if (resolved === undefined) {
            return {
                found: false,
            };
        }
        return {
            found: true,
            path: resolved,
        };
    }
    catch {
        return {
            found: false,
        };
    }
}
export function normalizeConfigResolvers(resolvers, sourceFile) {
    const resolverArray = Array.isArray(resolvers) ? resolvers : [resolvers];
    const map = new Map();
    for (const nameOrRecordOrObject of resolverArray) {
        if (typeof nameOrRecordOrObject === 'string') {
            const name = nameOrRecordOrObject;
            map.set(name, {
                name,
                enable: true,
                options: undefined,
                resolver: requireResolver(name, sourceFile),
            });
        }
        else if (typeof nameOrRecordOrObject === 'object') {
            if (nameOrRecordOrObject.name && nameOrRecordOrObject.resolver) {
                const object = nameOrRecordOrObject;
                const { name, enable = true, options, resolver } = object;
                map.set(name, { name, enable, options, resolver });
            }
            else {
                const record = nameOrRecordOrObject;
                for (const [name, enableOrOptions] of Object.entries(record)) {
                    const resolver = requireResolver(name, sourceFile);
                    if (typeof enableOrOptions === 'boolean') {
                        map.set(name, {
                            name,
                            enable: enableOrOptions,
                            options: undefined,
                            resolver,
                        });
                    }
                    else {
                        map.set(name, {
                            name,
                            enable: true,
                            options: enableOrOptions,
                            resolver,
                        });
                    }
                }
            }
        }
        else {
            const err = new Error('invalid resolver config');
            err.name = IMPORT_RESOLVE_ERROR_NAME;
            throw err;
        }
    }
    return [...map.values()];
}
export const LEGACY_NODE_RESOLVERS = new Set([
    'node',
    'eslint-import-resolver-node',
]);
try {
    LEGACY_NODE_RESOLVERS.add(cjsRequire.resolve('eslint-import-resolver-node'));
}
catch {
}
function requireResolver(name, sourceFile) {
    const resolver = tryRequire(`eslint-import-resolver-${name}`, sourceFile) ||
        tryRequire(name, sourceFile) ||
        tryRequire(path.resolve(getBaseDir(sourceFile), name));
    if (!resolver) {
        if (LEGACY_NODE_RESOLVERS.has(name)) {
            return undefined;
        }
        const err = new Error(`unable to load resolver "${name}".`);
        err.name = IMPORT_RESOLVE_ERROR_NAME;
        throw err;
    }
    if (!isLegacyResolverValid(resolver)) {
        const err = new Error(`${name} with invalid interface loaded as resolver`);
        err.name = IMPORT_RESOLVE_ERROR_NAME;
        throw err;
    }
    return resolver;
}
function isLegacyResolverValid(resolver) {
    if ('interfaceVersion' in resolver && resolver.interfaceVersion === 2) {
        return ('resolve' in resolver &&
            !!resolver.resolve &&
            typeof resolver.resolve === 'function');
    }
    return ('resolveImport' in resolver &&
        !!resolver.resolveImport &&
        typeof resolver.resolveImport === 'function');
}
function tryRequire(target, sourceFile) {
    let resolved;
    try {
        if (sourceFile == null) {
            resolved = cjsRequire.resolve(target);
        }
        else {
            try {
                resolved = createRequire(path.resolve(sourceFile)).resolve(target);
            }
            catch {
                resolved = cjsRequire.resolve(target);
            }
        }
    }
    catch {
        return undefined;
    }
    return cjsRequire(resolved);
}
function getBaseDir(sourceFile) {
    return pkgDir(sourceFile) || process.cwd();
}
//# sourceMappingURL=legacy-resolver-settings.js.map