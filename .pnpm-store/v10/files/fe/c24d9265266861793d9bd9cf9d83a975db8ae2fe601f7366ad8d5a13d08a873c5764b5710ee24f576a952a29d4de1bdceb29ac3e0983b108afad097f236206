#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = exports.main = void 0;
const path_1 = require("path");
const util_1 = require("util");
const Module = require("module");
let arg;
const util_2 = require("./util");
const repl_1 = require("./repl");
const index_1 = require("./index");
const node_internal_modules_cjs_helpers_1 = require("../dist-raw/node-internal-modules-cjs-helpers");
const spawn_child_1 = require("./child/spawn-child");
const configuration_1 = require("./configuration");
/**
 * Main `bin` functionality.
 *
 * This file is split into a chain of functions (phases), each one adding to a shared state object.
 * This is done so that the next function can either be invoked in-process or, if necessary, invoked in a child process.
 *
 * The functions are intentionally given uncreative names and left in the same order as the original code, to make a
 * smaller git diff.
 */
function main(argv = process.argv.slice(2), entrypointArgs = {}) {
    const args = parseArgv(argv, entrypointArgs);
    const state = {
        shouldUseChildProcess: false,
        isInChildProcess: false,
        isCli: true,
        tsNodeScript: __filename,
        parseArgvResult: args,
    };
    return bootstrap(state);
}
exports.main = main;
/** @internal */
function bootstrap(state) {
    if (!state.phase2Result) {
        state.phase2Result = phase2(state);
        if (state.shouldUseChildProcess && !state.isInChildProcess) {
            // Note: When transitioning into the child-process after `phase2`,
            // the updated working directory needs to be preserved.
            return (0, spawn_child_1.callInChild)(state);
        }
    }
    if (!state.phase3Result) {
        state.phase3Result = phase3(state);
        if (state.shouldUseChildProcess && !state.isInChildProcess) {
            // Note: When transitioning into the child-process after `phase2`,
            // the updated working directory needs to be preserved.
            return (0, spawn_child_1.callInChild)(state);
        }
    }
    return phase4(state);
}
exports.bootstrap = bootstrap;
function parseArgv(argv, entrypointArgs) {
    arg !== null && arg !== void 0 ? arg : (arg = require('arg'));
    // HACK: technically, this function is not marked @internal so it's possible
    // that libraries in the wild are doing `require('ts-node/dist/bin').main({'--transpile-only': true})`
    // We can mark this function @internal in next major release.
    // For now, rewrite args to avoid a breaking change.
    entrypointArgs = { ...entrypointArgs };
    for (const key of Object.keys(entrypointArgs)) {
        entrypointArgs[key.replace(/([a-z])-([a-z])/g, (_$0, $1, $2) => `${$1}${$2.toUpperCase()}`)] = entrypointArgs[key];
    }
    const args = {
        ...entrypointArgs,
        ...arg({
            // Node.js-like options.
            '--eval': String,
            '--interactive': Boolean,
            '--print': Boolean,
            '--require': [String],
            // CLI options.
            '--help': Boolean,
            '--cwdMode': Boolean,
            '--scriptMode': Boolean,
            '--version': arg.COUNT,
            '--showConfig': Boolean,
            '--esm': Boolean,
            // Project options.
            '--cwd': String,
            '--files': Boolean,
            '--compiler': String,
            '--compilerOptions': util_2.parse,
            '--project': String,
            '--ignoreDiagnostics': [String],
            '--ignore': [String],
            '--transpileOnly': Boolean,
            '--transpiler': String,
            '--swc': Boolean,
            '--typeCheck': Boolean,
            '--compilerHost': Boolean,
            '--pretty': Boolean,
            '--skipProject': Boolean,
            '--skipIgnore': Boolean,
            '--preferTsExts': Boolean,
            '--logError': Boolean,
            '--emit': Boolean,
            '--scope': Boolean,
            '--scopeDir': String,
            '--noExperimentalReplAwait': Boolean,
            '--experimentalSpecifierResolution': String,
            // Aliases.
            '-e': '--eval',
            '-i': '--interactive',
            '-p': '--print',
            '-r': '--require',
            '-h': '--help',
            '-s': '--script-mode',
            '-v': '--version',
            '-T': '--transpileOnly',
            '-H': '--compilerHost',
            '-I': '--ignore',
            '-P': '--project',
            '-C': '--compiler',
            '-D': '--ignoreDiagnostics',
            '-O': '--compilerOptions',
            '--dir': '--cwd',
            // Support both tsc-style camelCase and node-style hypen-case for *all* flags
            '--cwd-mode': '--cwdMode',
            '--script-mode': '--scriptMode',
            '--show-config': '--showConfig',
            '--compiler-options': '--compilerOptions',
            '--ignore-diagnostics': '--ignoreDiagnostics',
            '--transpile-only': '--transpileOnly',
            '--type-check': '--typeCheck',
            '--compiler-host': '--compilerHost',
            '--skip-project': '--skipProject',
            '--skip-ignore': '--skipIgnore',
            '--prefer-ts-exts': '--preferTsExts',
            '--log-error': '--logError',
            '--scope-dir': '--scopeDir',
            '--no-experimental-repl-await': '--noExperimentalReplAwait',
            '--experimental-specifier-resolution': '--experimentalSpecifierResolution',
        }, {
            argv,
            stopAtPositional: true,
        }),
    };
    // Only setting defaults for CLI-specific flags
    // Anything passed to `register()` can be `undefined`; `create()` will apply
    // defaults.
    const { '--cwd': cwdArg, '--help': help = false, '--scriptMode': scriptMode, '--cwdMode': cwdMode, '--version': version = 0, '--showConfig': showConfig, '--require': argsRequire = [], '--eval': code = undefined, '--print': print = false, '--interactive': interactive = false, '--files': files, '--compiler': compiler, '--compilerOptions': compilerOptions, '--project': project, '--ignoreDiagnostics': ignoreDiagnostics, '--ignore': ignore, '--transpileOnly': transpileOnly, '--typeCheck': typeCheck, '--transpiler': transpiler, '--swc': swc, '--compilerHost': compilerHost, '--pretty': pretty, '--skipProject': skipProject, '--skipIgnore': skipIgnore, '--preferTsExts': preferTsExts, '--logError': logError, '--emit': emit, '--scope': scope = undefined, '--scopeDir': scopeDir = undefined, '--noExperimentalReplAwait': noExperimentalReplAwait, '--experimentalSpecifierResolution': experimentalSpecifierResolution, '--esm': esm, _: restArgs, } = args;
    return {
        // Note: argv and restArgs may be overwritten by child process
        argv: process.argv,
        restArgs,
        cwdArg,
        help,
        scriptMode,
        cwdMode,
        version,
        showConfig,
        argsRequire,
        code,
        print,
        interactive,
        files,
        compiler,
        compilerOptions,
        project,
        ignoreDiagnostics,
        ignore,
        transpileOnly,
        typeCheck,
        transpiler,
        swc,
        compilerHost,
        pretty,
        skipProject,
        skipIgnore,
        preferTsExts,
        logError,
        emit,
        scope,
        scopeDir,
        noExperimentalReplAwait,
        experimentalSpecifierResolution,
        esm,
    };
}
function phase2(payload) {
    const { help, version, cwdArg, esm } = payload.parseArgvResult;
    if (help) {
        console.log(`
Usage: ts-node [options] [ -e script | script.ts ] [arguments]

Options:

  -e, --eval [code]               Evaluate code
  -p, --print                     Print result of \`--eval\`
  -r, --require [path]            Require a node module before execution
  -i, --interactive               Opens the REPL even if stdin does not appear to be a terminal

  --esm                           Bootstrap with the ESM loader, enabling full ESM support
  --swc                           Use the faster swc transpiler

  -h, --help                      Print CLI usage
  -v, --version                   Print module version information.  -vvv to print additional information
  --showConfig                    Print resolved configuration and exit

  -T, --transpileOnly             Use TypeScript's faster \`transpileModule\` or a third-party transpiler
  -H, --compilerHost              Use TypeScript's compiler host API
  -I, --ignore [pattern]          Override the path patterns to skip compilation
  -P, --project [path]            Path to TypeScript JSON project file
  -C, --compiler [name]           Specify a custom TypeScript compiler
  --transpiler [name]             Specify a third-party, non-typechecking transpiler
  -D, --ignoreDiagnostics [code]  Ignore TypeScript warnings by diagnostic code
  -O, --compilerOptions [opts]    JSON object to merge with compiler options

  --cwd                           Behave as if invoked within this working directory.
  --files                         Load \`files\`, \`include\` and \`exclude\` from \`tsconfig.json\` on startup
  --pretty                        Use pretty diagnostic formatter (usually enabled by default)
  --cwdMode                       Use current directory instead of <script.ts> for config resolution
  --skipProject                   Skip reading \`tsconfig.json\`
  --skipIgnore                    Skip \`--ignore\` checks
  --emit                          Emit output files into \`.ts-node\` directory
  --scope                         Scope compiler to files within \`scopeDir\`.  Anything outside this directory is ignored.
  --scopeDir                      Directory for \`--scope\`
  --preferTsExts                  Prefer importing TypeScript files over JavaScript files
  --logError                      Logs TypeScript errors to stderr instead of throwing exceptions
  --noExperimentalReplAwait       Disable top-level await in REPL.  Equivalent to node's --no-experimental-repl-await
  --experimentalSpecifierResolution [node|explicit]
                                  Equivalent to node's --experimental-specifier-resolution
`);
        process.exit(0);
    }
    // Output project information.
    if (version === 1) {
        console.log(`v${index_1.VERSION}`);
        process.exit(0);
    }
    const cwd = cwdArg ? (0, path_1.resolve)(cwdArg) : process.cwd();
    // If ESM is explicitly enabled through the flag, stage3 should be run in a child process
    // with the ESM loaders configured.
    if (esm)
        payload.shouldUseChildProcess = true;
    return {
        cwd,
    };
}
function phase3(payload) {
    const { emit, files, pretty, transpileOnly, transpiler, noExperimentalReplAwait, typeCheck, swc, compilerHost, ignore, preferTsExts, logError, scriptMode, cwdMode, project, skipProject, skipIgnore, compiler, ignoreDiagnostics, compilerOptions, argsRequire, scope, scopeDir, esm, experimentalSpecifierResolution, } = payload.parseArgvResult;
    const { cwd } = payload.phase2Result;
    // NOTE: When we transition to a child process for ESM, the entry-point script determined
    // here might not be the one used later in `phase4`. This can happen when we execute the
    // original entry-point but then the process forks itself using e.g. `child_process.fork`.
    // We will always use the original TS project in forked processes anyway, so it is
    // expected and acceptable to retrieve the entry-point information here in `phase2`.
    // See: https://github.com/TypeStrong/ts-node/issues/1812.
    const { entryPointPath } = getEntryPointInfo(payload);
    const preloadedConfig = (0, configuration_1.findAndReadConfig)({
        cwd,
        emit,
        files,
        pretty,
        transpileOnly: (transpileOnly !== null && transpileOnly !== void 0 ? transpileOnly : transpiler != null) ? true : undefined,
        experimentalReplAwait: noExperimentalReplAwait ? false : undefined,
        typeCheck,
        transpiler,
        swc,
        compilerHost,
        ignore,
        logError,
        projectSearchDir: getProjectSearchDir(cwd, scriptMode, cwdMode, entryPointPath),
        project,
        skipProject,
        skipIgnore,
        compiler,
        ignoreDiagnostics,
        compilerOptions,
        require: argsRequire,
        scope,
        scopeDir,
        preferTsExts,
        esm,
        experimentalSpecifierResolution: experimentalSpecifierResolution,
    });
    // If ESM is enabled through the parsed tsconfig, stage4 should be run in a child
    // process with the ESM loaders configured.
    if (preloadedConfig.options.esm)
        payload.shouldUseChildProcess = true;
    return { preloadedConfig };
}
/**
 * Determines the entry-point information from the argv and phase2 result. This
 * method will be invoked in two places:
 *
 *   1. In phase 3 to be able to find a project from the potential entry-point script.
 *   2. In phase 4 to determine the actual entry-point script.
 *
 * Note that we need to explicitly re-resolve the entry-point information in the final
 * stage because the previous stage information could be modified when the bootstrap
 * invocation transitioned into a child process for ESM.
 *
 * Stages before (phase 4) can and will be cached by the child process through the Brotli
 * configuration and entry-point information is only reliable in the final phase. More
 * details can be found in here: https://github.com/TypeStrong/ts-node/issues/1812.
 */
function getEntryPointInfo(state) {
    const { code, interactive, restArgs } = state.parseArgvResult;
    const { cwd } = state.phase2Result;
    const { isCli } = state;
    // Figure out which we are executing: piped stdin, --eval, REPL, and/or entrypoint
    // This is complicated because node's behavior is complicated
    // `node -e code -i ./script.js` ignores -e
    const executeEval = code != null && !(interactive && restArgs.length);
    const executeEntrypoint = !executeEval && restArgs.length > 0;
    const executeRepl = !executeEntrypoint &&
        (interactive || (process.stdin.isTTY && !executeEval));
    const executeStdin = !executeEval && !executeRepl && !executeEntrypoint;
    /**
     * Unresolved. May point to a symlink, not realpath. May be missing file extension
     * NOTE: resolution relative to cwd option (not `process.cwd()`) is legacy backwards-compat; should be changed in next major: https://github.com/TypeStrong/ts-node/issues/1834
     */
    const entryPointPath = executeEntrypoint
        ? isCli
            ? (0, path_1.resolve)(cwd, restArgs[0])
            : (0, path_1.resolve)(restArgs[0])
        : undefined;
    return {
        executeEval,
        executeEntrypoint,
        executeRepl,
        executeStdin,
        entryPointPath,
    };
}
function phase4(payload) {
    var _a, _b, _c, _d, _e, _f, _g;
    const { isInChildProcess, tsNodeScript } = payload;
    const { version, showConfig, restArgs, code, print, argv } = payload.parseArgvResult;
    const { cwd } = payload.phase2Result;
    const { preloadedConfig } = payload.phase3Result;
    const { entryPointPath, executeEntrypoint, executeEval, executeRepl, executeStdin, } = getEntryPointInfo(payload);
    let evalStuff;
    let replStuff;
    let stdinStuff;
    let evalAwarePartialHost = undefined;
    if (executeEval) {
        const state = new repl_1.EvalState((0, path_1.join)(cwd, repl_1.EVAL_FILENAME));
        evalStuff = {
            state,
            repl: (0, repl_1.createRepl)({
                state,
                composeWithEvalAwarePartialHost: evalAwarePartialHost,
                ignoreDiagnosticsThatAreAnnoyingInInteractiveRepl: false,
            }),
        };
        ({ evalAwarePartialHost } = evalStuff.repl);
        // Create a local module instance based on `cwd`.
        const module = (evalStuff.module = new Module(repl_1.EVAL_NAME));
        module.filename = evalStuff.state.path;
        module.paths = Module._nodeModulePaths(cwd);
    }
    if (executeStdin) {
        const state = new repl_1.EvalState((0, path_1.join)(cwd, repl_1.STDIN_FILENAME));
        stdinStuff = {
            state,
            repl: (0, repl_1.createRepl)({
                state,
                composeWithEvalAwarePartialHost: evalAwarePartialHost,
                ignoreDiagnosticsThatAreAnnoyingInInteractiveRepl: false,
            }),
        };
        ({ evalAwarePartialHost } = stdinStuff.repl);
        // Create a local module instance based on `cwd`.
        const module = (stdinStuff.module = new Module(repl_1.STDIN_NAME));
        module.filename = stdinStuff.state.path;
        module.paths = Module._nodeModulePaths(cwd);
    }
    if (executeRepl) {
        const state = new repl_1.EvalState((0, path_1.join)(cwd, repl_1.REPL_FILENAME));
        replStuff = {
            state,
            repl: (0, repl_1.createRepl)({
                state,
                composeWithEvalAwarePartialHost: evalAwarePartialHost,
            }),
        };
        ({ evalAwarePartialHost } = replStuff.repl);
    }
    // Register the TypeScript compiler instance.
    const service = (0, index_1.createFromPreloadedConfig)({
        // Since this struct may have been marshalled across thread or process boundaries, we must restore
        // un-marshall-able values.
        ...preloadedConfig,
        options: {
            ...preloadedConfig.options,
            readFile: (_a = evalAwarePartialHost === null || evalAwarePartialHost === void 0 ? void 0 : evalAwarePartialHost.readFile) !== null && _a !== void 0 ? _a : undefined,
            fileExists: (_b = evalAwarePartialHost === null || evalAwarePartialHost === void 0 ? void 0 : evalAwarePartialHost.fileExists) !== null && _b !== void 0 ? _b : undefined,
            tsTrace: index_1.DEFAULTS.tsTrace,
        },
    });
    (0, index_1.register)(service);
    if (isInChildProcess)
        require('./child/child-loader').lateBindHooks((0, index_1.createEsmHooks)(service));
    // Bind REPL service to ts-node compiler service (chicken-and-egg problem)
    replStuff === null || replStuff === void 0 ? void 0 : replStuff.repl.setService(service);
    evalStuff === null || evalStuff === void 0 ? void 0 : evalStuff.repl.setService(service);
    stdinStuff === null || stdinStuff === void 0 ? void 0 : stdinStuff.repl.setService(service);
    // Output project information.
    if (version === 2) {
        console.log(`ts-node v${index_1.VERSION}`);
        console.log(`node ${process.version}`);
        console.log(`compiler v${service.ts.version}`);
        process.exit(0);
    }
    if (version >= 3) {
        console.log(`ts-node v${index_1.VERSION} ${(0, path_1.dirname)(__dirname)}`);
        console.log(`node ${process.version}`);
        console.log(`compiler v${service.ts.version} ${(_c = service.compilerPath) !== null && _c !== void 0 ? _c : ''}`);
        process.exit(0);
    }
    if (showConfig) {
        const ts = service.ts;
        if (typeof ts.convertToTSConfig !== 'function') {
            console.error('Error: --showConfig requires a typescript versions >=3.2 that support --showConfig');
            process.exit(1);
        }
        let moduleTypes = undefined;
        if (service.options.moduleTypes) {
            // Assumption: this codepath requires CLI invocation, so moduleTypes must have come from a tsconfig, not API.
            const showRelativeTo = (0, path_1.dirname)(service.configFilePath);
            moduleTypes = {};
            for (const [key, value] of Object.entries(service.options.moduleTypes)) {
                moduleTypes[(0, path_1.relative)(showRelativeTo, (0, path_1.resolve)((_d = service.options.optionBasePaths) === null || _d === void 0 ? void 0 : _d.moduleTypes, key))] = value;
            }
        }
        const json = {
            ['ts-node']: {
                ...service.options,
                require: ((_e = service.options.require) === null || _e === void 0 ? void 0 : _e.length)
                    ? service.options.require
                    : undefined,
                moduleTypes,
                optionBasePaths: undefined,
                compilerOptions: undefined,
                project: (_f = service.configFilePath) !== null && _f !== void 0 ? _f : service.options.project,
            },
            ...ts.convertToTSConfig(service.config, (_g = service.configFilePath) !== null && _g !== void 0 ? _g : (0, path_1.join)(cwd, 'ts-node-implicit-tsconfig.json'), service.ts.sys),
        };
        console.log(
        // Assumes that all configuration options which can possibly be specified via the CLI are JSON-compatible.
        // If, in the future, we must log functions, for example readFile and fileExists, then we can implement a JSON
        // replacer function.
        JSON.stringify(json, null, 2));
        process.exit(0);
    }
    // Prepend `ts-node` arguments to CLI for child processes.
    process.execArgv.push(tsNodeScript, ...argv.slice(2, argv.length - restArgs.length));
    // TODO this comes from BootstrapState
    process.argv = [process.argv[1]]
        .concat(executeEntrypoint ? [entryPointPath] : [])
        .concat(restArgs.slice(executeEntrypoint ? 1 : 0));
    // Execute the main contents (either eval, script or piped).
    if (executeEntrypoint) {
        if (payload.isInChildProcess &&
            (0, util_2.versionGteLt)(process.versions.node, '18.6.0')) {
            // HACK workaround node regression
            require('../dist-raw/runmain-hack.js').run(entryPointPath);
        }
        else {
            Module.runMain();
        }
    }
    else {
        // Note: eval and repl may both run, but never with stdin.
        // If stdin runs, eval and repl will not.
        if (executeEval) {
            (0, node_internal_modules_cjs_helpers_1.addBuiltinLibsToObject)(global);
            evalAndExitOnTsError(evalStuff.repl, evalStuff.module, code, print, 'eval');
        }
        if (executeRepl) {
            replStuff.repl.start();
        }
        if (executeStdin) {
            let buffer = code || '';
            process.stdin.on('data', (chunk) => (buffer += chunk));
            process.stdin.on('end', () => {
                evalAndExitOnTsError(stdinStuff.repl, stdinStuff.module, buffer, 
                // `echo 123 | node -p` still prints 123
                print, 'stdin');
            });
        }
    }
}
/**
 * Get project search path from args.
 */
function getProjectSearchDir(cwd, scriptMode, cwdMode, scriptPath) {
    // Validate `--script-mode` / `--cwd-mode` / `--cwd` usage is correct.
    if (scriptMode && cwdMode) {
        throw new TypeError('--cwd-mode cannot be combined with --script-mode');
    }
    if (scriptMode && !scriptPath) {
        throw new TypeError('--script-mode must be used with a script name, e.g. `ts-node --script-mode <script.ts>`');
    }
    const doScriptMode = scriptMode === true ? true : cwdMode === true ? false : !!scriptPath;
    if (doScriptMode) {
        // Use node's own resolution behavior to ensure we follow symlinks.
        // scriptPath may omit file extension or point to a directory with or without package.json.
        // This happens before we are registered, so we tell node's resolver to consider ts, tsx, and jsx files.
        // In extremely rare cases, is is technically possible to resolve the wrong directory,
        // because we do not yet know preferTsExts, jsx, nor allowJs.
        // See also, justification why this will not happen in real-world situations:
        // https://github.com/TypeStrong/ts-node/pull/1009#issuecomment-613017081
        const exts = ['.js', '.jsx', '.ts', '.tsx'];
        const extsTemporarilyInstalled = [];
        for (const ext of exts) {
            if (!(0, util_2.hasOwnProperty)(require.extensions, ext)) {
                extsTemporarilyInstalled.push(ext);
                require.extensions[ext] = function () { };
            }
        }
        try {
            return (0, path_1.dirname)(requireResolveNonCached(scriptPath));
        }
        finally {
            for (const ext of extsTemporarilyInstalled) {
                delete require.extensions[ext];
            }
        }
    }
    return cwd;
}
const guaranteedNonexistentDirectoryPrefix = (0, path_1.resolve)(__dirname, 'doesnotexist');
let guaranteedNonexistentDirectorySuffix = 0;
/**
 * require.resolve an absolute path, tricking node into *not* caching the results.
 * Necessary so that we do not pollute require.resolve cache prior to installing require.extensions
 *
 * Is a terrible hack, because node does not expose the necessary cache invalidation APIs
 * https://stackoverflow.com/questions/59865584/how-to-invalidate-cached-require-resolve-results
 */
function requireResolveNonCached(absoluteModuleSpecifier) {
    // node <= 12.1.x fallback: The trick below triggers a node bug on old versions.
    // On these old versions, pollute the require cache instead. This is a deliberate
    // ts-node limitation that will *rarely* manifest, and will not matter once node 12
    // is end-of-life'd on 2022-04-30
    const isSupportedNodeVersion = (0, util_2.versionGteLt)(process.versions.node, '12.2.0');
    if (!isSupportedNodeVersion)
        return require.resolve(absoluteModuleSpecifier);
    const { dir, base } = (0, path_1.parse)(absoluteModuleSpecifier);
    const relativeModuleSpecifier = `./${base}`;
    const req = (0, util_2.createRequire)((0, path_1.join)(dir, 'imaginaryUncacheableRequireResolveScript'));
    return req.resolve(relativeModuleSpecifier, {
        paths: [
            `${guaranteedNonexistentDirectoryPrefix}${guaranteedNonexistentDirectorySuffix++}`,
            ...(req.resolve.paths(relativeModuleSpecifier) || []),
        ],
    });
}
/**
 * Evaluate an [eval] or [stdin] script
 */
function evalAndExitOnTsError(replService, module, code, isPrinted, filenameAndDirname) {
    let result;
    (0, repl_1.setupContext)(global, module, filenameAndDirname);
    try {
        result = replService.evalCode(code);
    }
    catch (error) {
        if (error instanceof index_1.TSError) {
            console.error(error);
            process.exit(1);
        }
        throw error;
    }
    if (isPrinted) {
        console.log(typeof result === 'string'
            ? result
            : (0, util_1.inspect)(result, { colors: process.stdout.isTTY }));
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=bin.js.map