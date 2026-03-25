"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupContext = exports.createEvalAwarePartialHost = exports.EvalState = exports.createRepl = exports.REPL_NAME = exports.REPL_FILENAME = exports.STDIN_NAME = exports.STDIN_FILENAME = exports.EVAL_NAME = exports.EVAL_FILENAME = void 0;
const os_1 = require("os");
const path_1 = require("path");
const repl_1 = require("repl");
const vm_1 = require("vm");
const index_1 = require("./index");
const fs_1 = require("fs");
const console_1 = require("console");
const assert = require("assert");
const module_1 = require("module");
// Lazy-loaded.
let _processTopLevelAwait;
function getProcessTopLevelAwait() {
    if (_processTopLevelAwait === undefined) {
        ({
            processTopLevelAwait: _processTopLevelAwait,
        } = require('../dist-raw/node-internal-repl-await'));
    }
    return _processTopLevelAwait;
}
let diff;
function getDiffLines() {
    if (diff === undefined) {
        diff = require('diff');
    }
    return diff.diffLines;
}
/** @internal */
exports.EVAL_FILENAME = `[eval].ts`;
/** @internal */
exports.EVAL_NAME = `[eval]`;
/** @internal */
exports.STDIN_FILENAME = `[stdin].ts`;
/** @internal */
exports.STDIN_NAME = `[stdin]`;
/** @internal */
exports.REPL_FILENAME = '<repl>.ts';
/** @internal */
exports.REPL_NAME = '<repl>';
/**
 * Create a ts-node REPL instance.
 *
 * Pay close attention to the example below.  Today, the API requires a few lines
 * of boilerplate to correctly bind the `ReplService` to the ts-node `Service` and
 * vice-versa.
 *
 * Usage example:
 *
 *     const repl = tsNode.createRepl();
 *     const service = tsNode.create({...repl.evalAwarePartialHost});
 *     repl.setService(service);
 *     repl.start();
 *
 * @category REPL
 */
function createRepl(options = {}) {
    var _a, _b, _c, _d, _e;
    const { ignoreDiagnosticsThatAreAnnoyingInInteractiveRepl = true } = options;
    let service = options.service;
    let nodeReplServer;
    // If `useGlobal` is not true, then REPL creates a context when started.
    // This stores a reference to it or to `global`, whichever is used, after REPL has started.
    let context;
    const state = (_a = options.state) !== null && _a !== void 0 ? _a : new EvalState((0, path_1.join)(process.cwd(), exports.REPL_FILENAME));
    const evalAwarePartialHost = createEvalAwarePartialHost(state, options.composeWithEvalAwarePartialHost);
    const stdin = (_b = options.stdin) !== null && _b !== void 0 ? _b : process.stdin;
    const stdout = (_c = options.stdout) !== null && _c !== void 0 ? _c : process.stdout;
    const stderr = (_d = options.stderr) !== null && _d !== void 0 ? _d : process.stderr;
    const _console = stdout === process.stdout && stderr === process.stderr
        ? console
        : new console_1.Console(stdout, stderr);
    const replService = {
        state: (_e = options.state) !== null && _e !== void 0 ? _e : new EvalState((0, path_1.join)(process.cwd(), exports.EVAL_FILENAME)),
        setService,
        evalCode,
        evalCodeInternal,
        nodeEval,
        evalAwarePartialHost,
        start,
        startInternal,
        stdin,
        stdout,
        stderr,
        console: _console,
    };
    return replService;
    function setService(_service) {
        service = _service;
        if (ignoreDiagnosticsThatAreAnnoyingInInteractiveRepl) {
            service.addDiagnosticFilter({
                appliesToAllFiles: false,
                filenamesAbsolute: [state.path],
                diagnosticsIgnored: [
                    2393,
                    6133,
                    7027,
                    ...(service.shouldReplAwait ? topLevelAwaitDiagnosticCodes : []),
                ],
            });
        }
    }
    function evalCode(code) {
        const result = appendCompileAndEvalInput({
            service: service,
            state,
            input: code,
            context,
            overrideIsCompletion: false,
        });
        assert(result.containsTopLevelAwait === false);
        return result.value;
    }
    function evalCodeInternal(options) {
        const { code, enableTopLevelAwait, context } = options;
        return appendCompileAndEvalInput({
            service: service,
            state,
            input: code,
            enableTopLevelAwait,
            context,
        });
    }
    function nodeEval(code, context, _filename, callback) {
        // TODO: Figure out how to handle completion here.
        if (code === '.scope') {
            callback(null);
            return;
        }
        try {
            const evalResult = evalCodeInternal({
                code,
                enableTopLevelAwait: true,
                context,
            });
            if (evalResult.containsTopLevelAwait) {
                (async () => {
                    try {
                        callback(null, await evalResult.valuePromise);
                    }
                    catch (promiseError) {
                        handleError(promiseError);
                    }
                })();
            }
            else {
                callback(null, evalResult.value);
            }
        }
        catch (error) {
            handleError(error);
        }
        // Log TSErrors, check if they're recoverable, log helpful hints for certain
        // well-known errors, and invoke `callback()`
        // TODO should evalCode API get the same error-handling benefits?
        function handleError(error) {
            var _a, _b;
            // Don't show TLA hint if the user explicitly disabled repl top level await
            const canLogTopLevelAwaitHint = service.options.experimentalReplAwait !== false &&
                !service.shouldReplAwait;
            if (error instanceof index_1.TSError) {
                // Support recoverable compilations using >= node 6.
                if (repl_1.Recoverable && isRecoverable(error)) {
                    callback(new repl_1.Recoverable(error));
                    return;
                }
                else {
                    _console.error(error);
                    if (canLogTopLevelAwaitHint &&
                        error.diagnosticCodes.some((dC) => topLevelAwaitDiagnosticCodes.includes(dC))) {
                        _console.error(getTopLevelAwaitHint());
                    }
                    callback(null);
                }
            }
            else {
                let _error = error;
                if (canLogTopLevelAwaitHint &&
                    _error instanceof SyntaxError &&
                    ((_a = _error.message) === null || _a === void 0 ? void 0 : _a.includes('await is only valid'))) {
                    try {
                        // Only way I know to make our hint appear after the error
                        _error.message += `\n\n${getTopLevelAwaitHint()}`;
                        _error.stack = (_b = _error.stack) === null || _b === void 0 ? void 0 : _b.replace(/(SyntaxError:.*)/, (_, $1) => `${$1}\n\n${getTopLevelAwaitHint()}`);
                    }
                    catch { }
                }
                callback(_error);
            }
        }
        function getTopLevelAwaitHint() {
            return `Hint: REPL top-level await requires TypeScript version 3.8 or higher and target ES2018 or higher. You are using TypeScript ${service.ts.version} and target ${service.ts.ScriptTarget[service.config.options.target]}.`;
        }
    }
    // Note: `code` argument is deprecated
    function start(code) {
        startInternal({ code });
    }
    // Note: `code` argument is deprecated
    function startInternal(options) {
        const { code, forceToBeModule = true, ...optionsOverride } = options !== null && options !== void 0 ? options : {};
        // TODO assert that `service` is set; remove all `service!` non-null assertions
        // Eval incoming code before the REPL starts.
        // Note: deprecated
        if (code) {
            try {
                evalCode(`${code}\n`);
            }
            catch (err) {
                _console.error(err);
                // Note: should not be killing the process here, but this codepath is deprecated anyway
                process.exit(1);
            }
        }
        // In case the typescript compiler hasn't compiled anything yet,
        // make it run though compilation at least one time before
        // the REPL starts for a snappier user experience on startup.
        service === null || service === void 0 ? void 0 : service.compile('', state.path);
        const repl = (0, repl_1.start)({
            prompt: '> ',
            input: replService.stdin,
            output: replService.stdout,
            // Mimicking node's REPL implementation: https://github.com/nodejs/node/blob/168b22ba073ee1cbf8d0bcb4ded7ff3099335d04/lib/internal/repl.js#L28-L30
            terminal: stdout.isTTY &&
                !parseInt(index_1.env.NODE_NO_READLINE, 10),
            eval: nodeEval,
            useGlobal: true,
            ...optionsOverride,
        });
        nodeReplServer = repl;
        context = repl.context;
        // Bookmark the point where we should reset the REPL state.
        const resetEval = appendToEvalState(state, '');
        function reset() {
            resetEval();
            // Hard fix for TypeScript forcing `Object.defineProperty(exports, ...)`.
            runInContext('exports = module.exports', state.path, context);
            if (forceToBeModule) {
                state.input += 'export {};void 0;\n';
            }
            // Declare node builtins.
            // Skip the same builtins as `addBuiltinLibsToObject`:
            //   those starting with _
            //   those containing /
            //   those that already exist as globals
            // Intentionally suppress type errors in case @types/node does not declare any of them, and because
            // `declare import` is technically invalid syntax.
            // Avoid this when in transpileOnly, because third-party transpilers may not handle `declare import`.
            if (!(service === null || service === void 0 ? void 0 : service.transpileOnly)) {
                state.input += `// @ts-ignore\n${module_1.builtinModules
                    .filter((name) => !name.startsWith('_') &&
                    !name.includes('/') &&
                    !['console', 'module', 'process'].includes(name))
                    .map((name) => `declare import ${name} = require('${name}')`)
                    .join(';')}\n`;
            }
        }
        reset();
        repl.on('reset', reset);
        repl.defineCommand('type', {
            help: 'Check the type of a TypeScript identifier',
            action: function (identifier) {
                if (!identifier) {
                    repl.displayPrompt();
                    return;
                }
                const undo = appendToEvalState(state, identifier);
                const { name, comment } = service.getTypeInfo(state.input, state.path, state.input.length);
                undo();
                if (name)
                    repl.outputStream.write(`${name}\n`);
                if (comment)
                    repl.outputStream.write(`${comment}\n`);
                repl.displayPrompt();
            },
        });
        // Set up REPL history when available natively via node.js >= 11.
        if (repl.setupHistory) {
            const historyPath = index_1.env.TS_NODE_HISTORY || (0, path_1.join)((0, os_1.homedir)(), '.ts_node_repl_history');
            repl.setupHistory(historyPath, (err) => {
                if (!err)
                    return;
                _console.error(err);
                process.exit(1);
            });
        }
        return repl;
    }
}
exports.createRepl = createRepl;
/**
 * Eval state management. Stores virtual `[eval].ts` file
 */
class EvalState {
    constructor(path) {
        this.path = path;
        /** @internal */
        this.input = '';
        /** @internal */
        this.output = '';
        /** @internal */
        this.version = 0;
        /** @internal */
        this.lines = 0;
    }
}
exports.EvalState = EvalState;
function createEvalAwarePartialHost(state, composeWith) {
    function readFile(path) {
        if (path === state.path)
            return state.input;
        if (composeWith === null || composeWith === void 0 ? void 0 : composeWith.readFile)
            return composeWith.readFile(path);
        try {
            return (0, fs_1.readFileSync)(path, 'utf8');
        }
        catch (err) {
            /* Ignore. */
        }
    }
    function fileExists(path) {
        if (path === state.path)
            return true;
        if (composeWith === null || composeWith === void 0 ? void 0 : composeWith.fileExists)
            return composeWith.fileExists(path);
        try {
            const stats = (0, fs_1.statSync)(path);
            return stats.isFile() || stats.isFIFO();
        }
        catch (err) {
            return false;
        }
    }
    return { readFile, fileExists };
}
exports.createEvalAwarePartialHost = createEvalAwarePartialHost;
const sourcemapCommentRe = /\/\/# ?sourceMappingURL=\S+[\s\r\n]*$/;
/**
 * Evaluate the code snippet.
 *
 * Append it to virtual .ts file, compile, handle compiler errors, compute a diff of the JS, and eval any code that
 * appears as "added" in the diff.
 */
function appendCompileAndEvalInput(options) {
    const { service, state, wrappedErr, enableTopLevelAwait = false, context, overrideIsCompletion, } = options;
    let { input } = options;
    // It's confusing for `{ a: 1 }` to be interpreted as a block statement
    // rather than an object literal. So, we first try to wrap it in
    // parentheses, so that it will be interpreted as an expression.
    // Based on https://github.com/nodejs/node/blob/c2e6822153bad023ab7ebd30a6117dcc049e475c/lib/repl.js#L413-L422
    let wrappedCmd = false;
    if (!wrappedErr && /^\s*{/.test(input) && !/;\s*$/.test(input)) {
        input = `(${input.trim()})\n`;
        wrappedCmd = true;
    }
    const lines = state.lines;
    const isCompletion = overrideIsCompletion !== null && overrideIsCompletion !== void 0 ? overrideIsCompletion : !/\n$/.test(input);
    const undo = appendToEvalState(state, input);
    let output;
    // Based on https://github.com/nodejs/node/blob/92573721c7cff104ccb82b6ed3e8aa69c4b27510/lib/repl.js#L457-L461
    function adjustUseStrict(code) {
        // "void 0" keeps the repl from returning "use strict" as the result
        // value for statements and declarations that don't return a value.
        return code.replace(/^"use strict";/, '"use strict"; void 0;');
    }
    try {
        output = service.compile(state.input, state.path, -lines);
    }
    catch (err) {
        undo();
        if (wrappedCmd) {
            if (err instanceof index_1.TSError && err.diagnosticCodes[0] === 2339) {
                // Ensure consistent and more sane behavior between { a: 1 }['b'] and ({ a: 1 }['b'])
                throw err;
            }
            // Unwrap and try again
            return appendCompileAndEvalInput({
                ...options,
                wrappedErr: err,
            });
        }
        if (wrappedErr)
            throw wrappedErr;
        throw err;
    }
    output = adjustUseStrict(output);
    // Note: REPL does not respect sourcemaps!
    // To properly do that, we'd need to prefix the code we eval -- which comes
    // from `diffLines` -- with newlines so that it's at the proper line numbers.
    // Then we'd need to ensure each bit of eval-ed code, if there are multiples,
    // has the sourcemap appended to it.
    // We might also need to integrate with our sourcemap hooks' cache; I'm not sure.
    const outputWithoutSourcemapComment = output.replace(sourcemapCommentRe, '');
    const oldOutputWithoutSourcemapComment = state.output.replace(sourcemapCommentRe, '');
    // Use `diff` to check for new JavaScript to execute.
    const changes = getDiffLines()(oldOutputWithoutSourcemapComment, outputWithoutSourcemapComment);
    if (isCompletion) {
        undo();
    }
    else {
        state.output = output;
        // Insert a semicolon to make sure that the code doesn't interact with the next line,
        // for example to prevent `2\n+ 2` from producing 4.
        // This is safe since the output will not change since we can only get here with successful inputs,
        // and adding a semicolon to the end of a successful input won't ever change the output.
        state.input = state.input.replace(/([^\n\s])([\n\s]*)$/, (all, lastChar, whitespace) => {
            if (lastChar !== ';')
                return `${lastChar};${whitespace}`;
            return all;
        });
    }
    let commands = [];
    let containsTopLevelAwait = false;
    // Build a list of "commands": bits of JS code in the diff that must be executed.
    for (const change of changes) {
        if (change.added) {
            if (enableTopLevelAwait &&
                service.shouldReplAwait &&
                change.value.indexOf('await') > -1) {
                const processTopLevelAwait = getProcessTopLevelAwait();
                // Newline prevents comments to mess with wrapper
                const wrappedResult = processTopLevelAwait(change.value + '\n');
                if (wrappedResult !== null) {
                    containsTopLevelAwait = true;
                    commands.push({
                        mustAwait: true,
                        execCommand: () => runInContext(wrappedResult, state.path, context),
                    });
                    continue;
                }
            }
            commands.push({
                execCommand: () => runInContext(change.value, state.path, context),
            });
        }
    }
    // Execute all commands asynchronously if necessary, returning the result or a
    // promise of the result.
    if (containsTopLevelAwait) {
        return {
            containsTopLevelAwait,
            valuePromise: (async () => {
                let value;
                for (const command of commands) {
                    const r = command.execCommand();
                    value = command.mustAwait ? await r : r;
                }
                return value;
            })(),
        };
    }
    else {
        return {
            containsTopLevelAwait: false,
            value: commands.reduce((_, c) => c.execCommand(), undefined),
        };
    }
}
/**
 * Low-level execution of JS code in context
 */
function runInContext(code, filename, context) {
    const script = new vm_1.Script(code, { filename });
    if (context === undefined || context === global) {
        return script.runInThisContext();
    }
    else {
        return script.runInContext(context);
    }
}
/**
 * Append to the eval instance and return an undo function.
 */
function appendToEvalState(state, input) {
    const undoInput = state.input;
    const undoVersion = state.version;
    const undoOutput = state.output;
    const undoLines = state.lines;
    state.input += input;
    state.lines += lineCount(input);
    state.version++;
    return function () {
        state.input = undoInput;
        state.output = undoOutput;
        state.version = undoVersion;
        state.lines = undoLines;
    };
}
/**
 * Count the number of lines.
 */
function lineCount(value) {
    let count = 0;
    for (const char of value) {
        if (char === '\n') {
            count++;
        }
    }
    return count;
}
/**
 * TS diagnostic codes which are recoverable, meaning that the user likely entered an incomplete line of code
 * and should be prompted for the next.  For example, starting a multi-line for() loop and not finishing it.
 * null value means code is always recoverable.  `Set` means code is only recoverable when occurring alongside at least one
 * of the other codes.
 */
const RECOVERY_CODES = new Map([
    [1003, null],
    [1005, null],
    [1109, null],
    [1126, null],
    [
        1136,
        new Set([1005]), // happens when typing out an object literal or block scope across multiple lines: '{ foo: 123,'
    ],
    [1160, null],
    [1161, null],
    [2355, null],
    [2391, null],
    [
        7010,
        new Set([1005]), // happens when fn signature spread across multiple lines: 'function a(\nb: any\n) {'
    ],
]);
/**
 * Diagnostic codes raised when using top-level await.
 * These are suppressed when top-level await is enabled.
 * When it is *not* enabled, these trigger a helpful hint about enabling top-level await.
 */
const topLevelAwaitDiagnosticCodes = [
    1375,
    1378,
    1431,
    1432, // Top-level 'for await' loops are only allowed when the 'module' option is set to 'esnext' or 'system', and the 'target' option is set to 'es2017' or higher.
];
/**
 * Check if a function can recover gracefully.
 */
function isRecoverable(error) {
    return error.diagnosticCodes.every((code) => {
        const deps = RECOVERY_CODES.get(code);
        return (deps === null ||
            (deps && error.diagnosticCodes.some((code) => deps.has(code))));
    });
}
/**
 * @internal
 * Set properties on `context` before eval-ing [stdin] or [eval] input.
 */
function setupContext(context, module, filenameAndDirname) {
    if (filenameAndDirname) {
        context.__dirname = '.';
        context.__filename = `[${filenameAndDirname}]`;
    }
    context.module = module;
    context.exports = module.exports;
    context.require = module.require.bind(module);
}
exports.setupContext = setupContext;
//# sourceMappingURL=repl.js.map