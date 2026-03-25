"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEsmHooks = exports.registerAndCreateEsmHooks = exports.filterHooksByAPIVersion = void 0;
const index_1 = require("./index");
const url_1 = require("url");
const path_1 = require("path");
const assert = require("assert");
const util_1 = require("./util");
const module_1 = require("module");
// The hooks API changed in node version X so we need to check for backwards compatibility.
const newHooksAPI = (0, util_1.versionGteLt)(process.versions.node, '16.12.0');
/** @internal */
function filterHooksByAPIVersion(hooks) {
    const { getFormat, load, resolve, transformSource } = hooks;
    // Explicit return type to avoid TS's non-ideal inferred type
    const hooksAPI = newHooksAPI
        ? { resolve, load, getFormat: undefined, transformSource: undefined }
        : { resolve, getFormat, transformSource, load: undefined };
    return hooksAPI;
}
exports.filterHooksByAPIVersion = filterHooksByAPIVersion;
/** @internal */
function registerAndCreateEsmHooks(opts) {
    // Automatically performs registration just like `-r ts-node/register`
    const tsNodeInstance = (0, index_1.register)(opts);
    return createEsmHooks(tsNodeInstance);
}
exports.registerAndCreateEsmHooks = registerAndCreateEsmHooks;
function createEsmHooks(tsNodeService) {
    tsNodeService.enableExperimentalEsmLoaderInterop();
    // Custom implementation that considers additional file extensions and automatically adds file extensions
    const nodeResolveImplementation = tsNodeService.getNodeEsmResolver();
    const nodeGetFormatImplementation = tsNodeService.getNodeEsmGetFormat();
    const extensions = tsNodeService.extensions;
    const hooksAPI = filterHooksByAPIVersion({
        resolve,
        load,
        getFormat,
        transformSource,
    });
    function isFileUrlOrNodeStyleSpecifier(parsed) {
        // We only understand file:// URLs, but in node, the specifier can be a node-style `./foo` or `foo`
        const { protocol } = parsed;
        return protocol === null || protocol === 'file:';
    }
    /**
     * Named "probably" as a reminder that this is a guess.
     * node does not explicitly tell us if we're resolving the entrypoint or not.
     */
    function isProbablyEntrypoint(specifier, parentURL) {
        return parentURL === undefined && specifier.startsWith('file://');
    }
    // Side-channel between `resolve()` and `load()` hooks
    const rememberIsProbablyEntrypoint = new Set();
    const rememberResolvedViaCommonjsFallback = new Set();
    async function resolve(specifier, context, defaultResolve) {
        const defer = async () => {
            const r = await defaultResolve(specifier, context, defaultResolve);
            return r;
        };
        // See: https://github.com/nodejs/node/discussions/41711
        // nodejs will likely implement a similar fallback.  Till then, we can do our users a favor and fallback today.
        async function entrypointFallback(cb) {
            try {
                const resolution = await cb();
                if ((resolution === null || resolution === void 0 ? void 0 : resolution.url) &&
                    isProbablyEntrypoint(specifier, context.parentURL))
                    rememberIsProbablyEntrypoint.add(resolution.url);
                return resolution;
            }
            catch (esmResolverError) {
                if (!isProbablyEntrypoint(specifier, context.parentURL))
                    throw esmResolverError;
                try {
                    let cjsSpecifier = specifier;
                    // Attempt to convert from ESM file:// to CommonJS path
                    try {
                        if (specifier.startsWith('file://'))
                            cjsSpecifier = (0, url_1.fileURLToPath)(specifier);
                    }
                    catch { }
                    const resolution = (0, url_1.pathToFileURL)((0, module_1.createRequire)(process.cwd()).resolve(cjsSpecifier)).toString();
                    rememberIsProbablyEntrypoint.add(resolution);
                    rememberResolvedViaCommonjsFallback.add(resolution);
                    return { url: resolution, format: 'commonjs' };
                }
                catch (commonjsResolverError) {
                    throw esmResolverError;
                }
            }
        }
        return addShortCircuitFlag(async () => {
            const parsed = (0, url_1.parse)(specifier);
            const { pathname, protocol, hostname } = parsed;
            if (!isFileUrlOrNodeStyleSpecifier(parsed)) {
                return entrypointFallback(defer);
            }
            if (protocol !== null && protocol !== 'file:') {
                return entrypointFallback(defer);
            }
            // Malformed file:// URL?  We should always see `null` or `''`
            if (hostname) {
                // TODO file://./foo sets `hostname` to `'.'`.  Perhaps we should special-case this.
                return entrypointFallback(defer);
            }
            // pathname is the path to be resolved
            return entrypointFallback(() => nodeResolveImplementation.defaultResolve(specifier, context, defaultResolve));
        });
    }
    // `load` from new loader hook API (See description at the top of this file)
    async function load(url, context, defaultLoad) {
        return addShortCircuitFlag(async () => {
            var _a;
            // If we get a format hint from resolve() on the context then use it
            // otherwise call the old getFormat() hook using node's old built-in defaultGetFormat() that ships with ts-node
            const format = (_a = context.format) !== null && _a !== void 0 ? _a : (await getFormat(url, context, nodeGetFormatImplementation.defaultGetFormat)).format;
            let source = undefined;
            if (format !== 'builtin' && format !== 'commonjs') {
                // Call the new defaultLoad() to get the source
                const { source: rawSource } = await defaultLoad(url, {
                    ...context,
                    format,
                }, defaultLoad);
                if (rawSource === undefined || rawSource === null) {
                    throw new Error(`Failed to load raw source: Format was '${format}' and url was '${url}''.`);
                }
                // Emulate node's built-in old defaultTransformSource() so we can re-use the old transformSource() hook
                const defaultTransformSource = async (source, _context, _defaultTransformSource) => ({ source });
                // Call the old hook
                const { source: transformedSource } = await transformSource(rawSource, { url, format }, defaultTransformSource);
                source = transformedSource;
            }
            return { format, source };
        });
    }
    async function getFormat(url, context, defaultGetFormat) {
        const defer = (overrideUrl = url) => defaultGetFormat(overrideUrl, context, defaultGetFormat);
        // See: https://github.com/nodejs/node/discussions/41711
        // nodejs will likely implement a similar fallback.  Till then, we can do our users a favor and fallback today.
        async function entrypointFallback(cb) {
            try {
                return await cb();
            }
            catch (getFormatError) {
                if (!rememberIsProbablyEntrypoint.has(url))
                    throw getFormatError;
                return { format: 'commonjs' };
            }
        }
        const parsed = (0, url_1.parse)(url);
        if (!isFileUrlOrNodeStyleSpecifier(parsed)) {
            return entrypointFallback(defer);
        }
        const { pathname } = parsed;
        assert(pathname !== null, 'ESM getFormat() hook: URL should never have null pathname');
        const nativePath = (0, url_1.fileURLToPath)(url);
        let nodeSays;
        // If file has extension not understood by node, then ask node how it would treat the emitted extension.
        // E.g. .mts compiles to .mjs, so ask node how to classify an .mjs file.
        const ext = (0, path_1.extname)(nativePath);
        const tsNodeIgnored = tsNodeService.ignored(nativePath);
        const nodeEquivalentExt = extensions.nodeEquivalents.get(ext);
        if (nodeEquivalentExt && !tsNodeIgnored) {
            nodeSays = await entrypointFallback(() => defer((0, url_1.format)((0, url_1.pathToFileURL)(nativePath + nodeEquivalentExt))));
        }
        else {
            try {
                nodeSays = await entrypointFallback(defer);
            }
            catch (e) {
                if (e instanceof Error &&
                    tsNodeIgnored &&
                    extensions.nodeDoesNotUnderstand.includes(ext)) {
                    e.message +=
                        `\n\n` +
                            `Hint:\n` +
                            `ts-node is configured to ignore this file.\n` +
                            `If you want ts-node to handle this file, consider enabling the "skipIgnore" option or adjusting your "ignore" patterns.\n` +
                            `https://typestrong.org/ts-node/docs/scope\n`;
                }
                throw e;
            }
        }
        // For files compiled by ts-node that node believes are either CJS or ESM, check if we should override that classification
        if (!tsNodeService.ignored(nativePath) &&
            (nodeSays.format === 'commonjs' || nodeSays.format === 'module')) {
            const { moduleType } = tsNodeService.moduleTypeClassifier.classifyModuleByModuleTypeOverrides((0, util_1.normalizeSlashes)(nativePath));
            if (moduleType === 'cjs') {
                return { format: 'commonjs' };
            }
            else if (moduleType === 'esm') {
                return { format: 'module' };
            }
        }
        return nodeSays;
    }
    async function transformSource(source, context, defaultTransformSource) {
        if (source === null || source === undefined) {
            throw new Error('No source');
        }
        const defer = () => defaultTransformSource(source, context, defaultTransformSource);
        const sourceAsString = typeof source === 'string' ? source : source.toString('utf8');
        const { url } = context;
        const parsed = (0, url_1.parse)(url);
        if (!isFileUrlOrNodeStyleSpecifier(parsed)) {
            return defer();
        }
        const nativePath = (0, url_1.fileURLToPath)(url);
        if (tsNodeService.ignored(nativePath)) {
            return defer();
        }
        const emittedJs = tsNodeService.compile(sourceAsString, nativePath);
        return { source: emittedJs };
    }
    return hooksAPI;
}
exports.createEsmHooks = createEsmHooks;
async function addShortCircuitFlag(fn) {
    const ret = await fn();
    // Not sure if this is necessary; being lazy.  Can revisit in the future.
    if (ret == null)
        return ret;
    return {
        ...ret,
        shortCircuit: true,
    };
}
//# sourceMappingURL=esm.js.map