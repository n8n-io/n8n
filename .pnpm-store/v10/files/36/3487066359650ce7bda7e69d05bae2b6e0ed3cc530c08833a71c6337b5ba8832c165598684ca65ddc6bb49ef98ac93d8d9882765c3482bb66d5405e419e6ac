"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TS_CONFIGS = void 0;
exports.tsPath = tsPath;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const cache_1 = __importDefault(require("../cache"));
const warn_1 = require("../errors/warn");
const settings_1 = require("../settings");
const fs_1 = require("../util/fs");
const read_tsconfig_1 = require("../util/read-tsconfig");
const util_1 = require("../util/util");
const util_2 = require("./util");
const debug = (0, util_2.makeDebug)('ts-path');
exports.TS_CONFIGS = {};
const REGISTERED = new Set();
function determineRuntime() {
    /**
     * Examples:
     * #!/usr/bin/env bun
     * bun bin/run.js
     * bun bin/dev.js
     */
    if (process.execPath.split(node_path_1.sep).includes('bun'))
        return 'bun';
    /**
     * Examples:
     * #!/usr/bin/env node
     * #!/usr/bin/env node --loader ts-node/esm --experimental-specifier-resolution=node --no-warnings
     * node bin/run.js
     * node bin/dev.js
     */
    if (process.execArgv.length === 0)
        return 'node';
    /**
     * Examples:
     * #!/usr/bin/env ts-node
     * #!/usr/bin/env node_modules/.bin/ts-node
     * ts-node bin/run.js
     * ts-node bin/dev.js
     */
    if (process.execArgv[0] === '--require' && process.execArgv[1].split(node_path_1.sep).includes('ts-node'))
        return 'ts-node';
    if (process.execArgv[0].split(node_path_1.sep).includes('ts-node'))
        return 'ts-node';
    /**
     * Examples:
     * #!/usr/bin/env tsx
     * #!/usr/bin/env node_modules/.bin/tsx
     * tsx bin/run.js
     * tsx bin/dev.js
     */
    if (process.execArgv[0] === '--require' && process.execArgv[1].split(node_path_1.sep).includes('tsx'))
        return 'tsx';
    return 'node';
}
const RUN_TIME = determineRuntime();
function isErrno(error) {
    return 'code' in error && error.code === 'ENOENT';
}
async function loadTSConfig(root) {
    try {
        if (exports.TS_CONFIGS[root])
            return exports.TS_CONFIGS[root];
        const tsconfig = await (0, read_tsconfig_1.readTSConfig)(root);
        if (!tsconfig)
            return;
        debug('tsconfig: %O', tsconfig);
        exports.TS_CONFIGS[root] = tsconfig;
        return exports.TS_CONFIGS[root];
    }
    catch (error) {
        if (isErrno(error))
            return;
        debug(`Could not parse tsconfig.json. Skipping typescript path lookup for ${root}.`);
        (0, warn_1.memoizedWarn)(`Could not parse tsconfig.json for ${root}. Falling back to compiled source.`);
    }
}
async function registerTsx(root, moduleType) {
    if (REGISTERED.has(root))
        return;
    try {
        const apiPath = moduleType === 'module' ? 'tsx/esm/api' : 'tsx/cjs/api';
        const tsxPath = require.resolve(apiPath, { paths: [root] });
        if (!tsxPath)
            return;
        debug('registering tsx at', root);
        debug('tsx path:', tsxPath);
        const { href } = (0, node_url_1.pathToFileURL)(tsxPath);
        debug('tsx href:', href);
        const { register } = await import(href);
        debug('Successfully imported tsx');
        register();
        REGISTERED.add(root);
    }
    catch (error) {
        debug(`Could not find tsx. Skipping tsx registration for ${root}.`);
        debug(error);
    }
}
async function registerTSNode(root, tsconfig) {
    if (REGISTERED.has(root))
        return;
    debug('registering ts-node at', root);
    const tsNodePath = require.resolve('ts-node', { paths: [root, __dirname] });
    debug('ts-node path:', tsNodePath);
    let tsNode;
    try {
        tsNode = require(tsNodePath);
        debug('Successfully required ts-node');
    }
    catch (error) {
        debug(`Could not find ts-node at ${tsNodePath}. Skipping ts-node registration for ${root}.`);
        debug(error);
        (0, warn_1.memoizedWarn)(`Could not find ts-node at ${tsNodePath}. Please ensure that ts-node is a devDependency. Falling back to compiled source.`);
        return;
    }
    const typeRoots = [(0, node_path_1.join)(root, 'node_modules', '@types')];
    const rootDirs = [];
    if (tsconfig.compilerOptions.rootDirs) {
        for (const r of tsconfig.compilerOptions.rootDirs) {
            rootDirs.push((0, node_path_1.join)(root, r));
        }
    }
    else if (tsconfig.compilerOptions.rootDir) {
        rootDirs.push((0, node_path_1.join)(root, tsconfig.compilerOptions.rootDir));
    }
    else if (tsconfig.compilerOptions.baseUrl) {
        rootDirs.push((0, node_path_1.join)(root, tsconfig.compilerOptions.baseUrl));
    }
    else {
        rootDirs.push((0, node_path_1.join)(root, 'src'));
    }
    // Because we need to provide a modified `rootDirs` to ts-node, we need to
    // remove `baseUrl` and `rootDir` from `compilerOptions` so that they
    // don't conflict.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { baseUrl, rootDir, ...rest } = tsconfig.compilerOptions;
    const conf = {
        compilerOptions: {
            ...rest,
            rootDirs,
            typeRoots,
        },
        ...tsconfig['ts-node'],
        cwd: root,
        esm: tsconfig['ts-node']?.esm ?? true,
        experimentalSpecifierResolution: tsconfig['ts-node']?.experimentalSpecifierResolution ?? 'explicit',
        scope: true,
        scopeDir: root,
        skipProject: true,
        transpileOnly: true,
    };
    debug('ts-node options: %O', conf);
    tsNode.register(conf);
    REGISTERED.add(root);
}
/**
 * Skip ts-node registration for ESM plugins in production.
 * The node/ts-node ecosystem is not mature enough to support auto-transpiling ESM modules at this time.
 * See the following:
 * - https://github.com/TypeStrong/ts-node/issues/1791#issuecomment-1149754228
 * - https://github.com/nodejs/node/issues/49432
 * - https://github.com/nodejs/node/pull/49407
 * - https://github.com/nodejs/node/issues/34049
 *
 * We still register tsx/ts-node for ESM plugins when NODE_ENV is "test" or "development" and root plugin is also ESM
 * since that allows plugins to be auto-transpiled when developing locally using `bin/dev.js`.
 */
function cannotTranspileEsm(rootPlugin, plugin, isProduction) {
    return ((isProduction || rootPlugin?.moduleType === 'commonjs') &&
        plugin?.moduleType === 'module' &&
        !plugin?.pjson.devDependencies?.tsx);
}
/**
 * If the dev script is run with ts-node for an ESM plugin, skip ts-node registration
 * and fall back on compiled source since ts-node executable cannot transpile ESM in Node 20+
 *
 * See the following:
 * https://nodejs.org/en/blog/announcements/v20-release-announce#custom-esm-loader-hooks-nearing-stable
 * https://github.com/oclif/core/issues/817
 * https://github.com/TypeStrong/ts-node/issues/1997
 */
function cannotUseTsNode(root, plugin, isProduction) {
    if (plugin?.moduleType !== 'module' || isProduction)
        return false;
    const nodeMajor = Number.parseInt(process.version.replace('v', '').split('.')[0], 10);
    return RUN_TIME === 'ts-node' && nodeMajor >= 20;
}
/**
 * Determine the path to the source file from the compiled ./lib files
 */
async function determinePath(root, orig, plugin) {
    const tsconfig = await loadTSConfig(root);
    if (!tsconfig)
        return orig;
    debug(`Determining path for ${orig}`);
    if (RUN_TIME === 'bun') {
        debug(`Skipping ts-node registration for ${root} because the runtime is: ${RUN_TIME}`);
    }
    else {
        // attempt to register tsx first. If it fails to register, we will fall back to ts-node
        await registerTsx(root, plugin?.moduleType);
        // if tsx registration succeeded, then this will exit early since the path will be in REGISTERED already
        await registerTSNode(root, tsconfig);
    }
    const { baseUrl, outDir, rootDir, rootDirs } = tsconfig.compilerOptions;
    const rootDirPath = rootDir ?? (rootDirs ?? [])[0] ?? baseUrl;
    if (!rootDirPath) {
        debug(`no rootDir, rootDirs, or baseUrl specified in tsconfig.json. Returning default path ${orig}`);
        return orig;
    }
    if (!outDir) {
        debug(`no outDir specified in tsconfig.json. Returning default path ${orig}`);
        return orig;
    }
    // rewrite path from ./lib/foo to ./src/foo
    const lib = (0, node_path_1.join)(root, outDir); // ./lib
    const src = (0, node_path_1.join)(root, rootDirPath); // ./src
    const relative = (0, node_path_1.relative)(lib, orig); // ./commands
    // For hooks, it might point to a js file, not a module. Something like "./hooks/myhook.js" which doesn't need the js.
    const out = (0, node_path_1.join)(src, relative).replace(/\.js$/, ''); // ./src/commands
    // this can be a directory of commands or point to a hook file
    // if it's a directory, we check if the path exists. If so, return the path to the directory.
    // For hooks, it might point to a module, not a file. Something like "./hooks/myhook"
    // That file doesn't exist, and the real file is "./hooks/myhook.ts"
    // In that case we attempt to resolve to the filename. If it fails it will revert back to the lib path
    debug(`lib dir: ${lib}`);
    debug(`src dir: ${src}`);
    debug(`src directory to find: ${out}`);
    if ((0, fs_1.existsSync)(out)) {
        debug(`Found source directory for ${orig} at ${out}`);
        return out;
    }
    const sourceFiles = await Promise.all([
        (0, promises_1.access)(`${out}.ts`)
            .then(() => `${out}.ts`)
            .catch(() => false),
        (0, promises_1.access)(`${out}.tsx`)
            .then(() => `${out}.tsx`)
            .catch(() => false),
    ]);
    if (sourceFiles.some(Boolean)) {
        debug(`Found source file for ${orig} at ${out}`);
        return out;
    }
    debug(`No source file found. Returning default path ${orig}`);
    if (!(0, util_1.isProd)())
        (0, warn_1.memoizedWarn)(`Could not find source for ${orig} based on tsconfig. Defaulting to compiled source.`);
    return orig;
}
async function tsPath(root, orig, plugin) {
    const rootPlugin = plugin?.options.isRoot ? plugin : cache_1.default.getInstance().get('rootPlugin');
    if (!orig)
        return orig;
    orig = orig.startsWith(root) ? orig : (0, node_path_1.join)(root, orig);
    // NOTE: The order of these checks matter!
    const enableAutoTranspile = settings_1.settings.enableAutoTranspile ?? settings_1.settings.tsnodeEnabled;
    if (enableAutoTranspile === false) {
        debug(`Skipping typescript path lookup for ${root} because enableAutoTranspile is explicitly set to false`);
        return orig;
    }
    const isProduction = (0, util_1.isProd)();
    // Do not skip ts-node registration if the plugin is linked
    if (enableAutoTranspile === undefined && isProduction && plugin?.type !== 'link') {
        debug(`Skipping typescript path lookup for ${root} because NODE_ENV is NOT "test" or "development"`);
        return orig;
    }
    if (cannotTranspileEsm(rootPlugin, plugin, isProduction)) {
        debug(`Skipping typescript path lookup for ${root} because it's an ESM module (NODE_ENV: ${process.env.NODE_ENV}, root plugin module type: ${rootPlugin?.moduleType})`);
        const warningIsDisabled = process.env.OCLIF_DISABLE_LINKED_ESM_WARNING && (0, util_1.isTruthy)(process.env.OCLIF_DISABLE_LINKED_ESM_WARNING);
        // Only warn if the plugin is linked AND the warning is not disabled
        if (plugin?.type === 'link' && !warningIsDisabled)
            (0, warn_1.memoizedWarn)(`${plugin?.name} is a linked ESM module and cannot be auto-transpiled. Existing compiled source will be used instead.`);
        return orig;
    }
    if (cannotUseTsNode(root, plugin, isProduction)) {
        debug(`Skipping typescript path lookup for ${root} because ts-node is run in node version ${process.version}"`);
        (0, warn_1.memoizedWarn)(`ts-node executable cannot transpile ESM in Node 20. Existing compiled source will be used instead. See https://github.com/oclif/core/issues/817.`);
        return orig;
    }
    try {
        return await determinePath(root, orig, plugin);
    }
    catch (error) {
        debug(error);
        return orig;
    }
}
