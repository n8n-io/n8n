"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtensions = void 0;
const util_1 = require("./util");
const nodeEquivalents = new Map([
    ['.ts', '.js'],
    ['.tsx', '.js'],
    ['.jsx', '.js'],
    ['.mts', '.mjs'],
    ['.cts', '.cjs'],
]);
const tsResolverEquivalents = new Map([
    ['.ts', ['.js']],
    ['.tsx', ['.js', '.jsx']],
    ['.mts', ['.mjs']],
    ['.cts', ['.cjs']],
]);
// All extensions understood by vanilla node
const vanillaNodeExtensions = [
    '.js',
    '.json',
    '.node',
    '.mjs',
    '.cjs',
];
// Extensions added by vanilla node's require() if you omit them:
// js, json, node
// Extensions added by vanilla node if you omit them with --experimental-specifier-resolution=node
// js, json, node, mjs
// Extensions added by ESM codepath's legacy package.json "main" resolver
// js, json, node (not mjs!)
const nodeDoesNotUnderstand = [
    '.ts',
    '.tsx',
    '.jsx',
    '.cts',
    '.mts',
];
/**
 * [MUST_UPDATE_FOR_NEW_FILE_EXTENSIONS]
 * @internal
 */
function getExtensions(config, options, tsVersion) {
    // TS 4.5 is first version to understand .cts, .mts, .cjs, and .mjs extensions
    const tsSupportsMtsCtsExts = (0, util_1.versionGteLt)(tsVersion, '4.5.0');
    const requiresHigherTypescriptVersion = [];
    if (!tsSupportsMtsCtsExts)
        requiresHigherTypescriptVersion.push('.cts', '.cjs', '.mts', '.mjs');
    const allPossibleExtensionsSortedByPreference = Array.from(new Set([
        ...(options.preferTsExts ? nodeDoesNotUnderstand : []),
        ...vanillaNodeExtensions,
        ...nodeDoesNotUnderstand,
    ]));
    const compiledJsUnsorted = ['.ts'];
    const compiledJsxUnsorted = [];
    if (config.options.jsx)
        compiledJsxUnsorted.push('.tsx');
    if (tsSupportsMtsCtsExts)
        compiledJsUnsorted.push('.mts', '.cts');
    if (config.options.allowJs) {
        compiledJsUnsorted.push('.js');
        if (config.options.jsx)
            compiledJsxUnsorted.push('.jsx');
        if (tsSupportsMtsCtsExts)
            compiledJsUnsorted.push('.mjs', '.cjs');
    }
    const compiledUnsorted = [...compiledJsUnsorted, ...compiledJsxUnsorted];
    const compiled = allPossibleExtensionsSortedByPreference.filter((ext) => compiledUnsorted.includes(ext));
    const compiledNodeDoesNotUnderstand = nodeDoesNotUnderstand.filter((ext) => compiled.includes(ext));
    /**
     * TS's resolver can resolve foo.js to foo.ts, by replacing .js extension with several source extensions.
     * IMPORTANT: Must preserve ordering according to preferTsExts!
     *            Must include the .js/.mjs/.cjs extension in the array!
     *            This affects resolution behavior!
     * [MUST_UPDATE_FOR_NEW_FILE_EXTENSIONS]
     */
    const r = allPossibleExtensionsSortedByPreference.filter((ext) => [...compiledUnsorted, '.js', '.mjs', '.cjs', '.mts', '.cts'].includes(ext));
    const replacementsForJs = r.filter((ext) => ['.js', '.jsx', '.ts', '.tsx'].includes(ext));
    const replacementsForJsx = r.filter((ext) => ['.jsx', '.tsx'].includes(ext));
    const replacementsForMjs = r.filter((ext) => ['.mjs', '.mts'].includes(ext));
    const replacementsForCjs = r.filter((ext) => ['.cjs', '.cts'].includes(ext));
    const replacementsForJsOrMjs = r.filter((ext) => ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.mts'].includes(ext));
    // Node allows omitting .js or .mjs extension in certain situations (CJS, ESM w/experimental flag)
    // So anything that compiles to .js or .mjs can also be omitted.
    const experimentalSpecifierResolutionAddsIfOmitted = Array.from(new Set([...replacementsForJsOrMjs, '.json', '.node']));
    // Same as above, except node curiuosly doesn't do .mjs here
    const legacyMainResolveAddsIfOmitted = Array.from(new Set([...replacementsForJs, '.json', '.node']));
    return {
        /** All file extensions we transform, ordered by resolution preference according to preferTsExts */
        compiled,
        /** Resolved extensions that vanilla node will not understand; we should handle them */
        nodeDoesNotUnderstand,
        /** Like the above, but only the ones we're compiling */
        compiledNodeDoesNotUnderstand,
        /**
         * Mapping from extensions understood by tsc to the equivalent for node,
         * as far as getFormat is concerned.
         */
        nodeEquivalents,
        /**
         * Mapping from extensions rejected by TSC in import specifiers, to the
         * possible alternatives that TS's resolver will accept.
         *
         * When we allow users to opt-in to .ts extensions in import specifiers, TS's
         * resolver requires us to replace the .ts extensions with .js alternatives.
         * Otherwise, resolution fails.
         *
         * Note TS's resolver is only used by, and only required for, typechecking.
         * This is separate from node's resolver, which we hook separately and which
         * does not require this mapping.
         */
        tsResolverEquivalents,
        /**
         * Extensions that we can support if the user upgrades their typescript version.
         * Used when raising hints.
         */
        requiresHigherTypescriptVersion,
        /**
         * --experimental-specifier-resolution=node will add these extensions.
         */
        experimentalSpecifierResolutionAddsIfOmitted,
        /**
         * ESM loader will add these extensions to package.json "main" field
         */
        legacyMainResolveAddsIfOmitted,
        replacementsForMjs,
        replacementsForCjs,
        replacementsForJsx,
        replacementsForJs,
    };
}
exports.getExtensions = getExtensions;
//# sourceMappingURL=file-extensions.js.map