var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _command, _cwd, _context, _completion, _completionCommand, _defaultShowHiddenOpt, _exitError, _detectLocale, _exitProcess, _frozens, _globalMiddleware, _groups, _hasOutput, _helpOpt, _logger, _output, _options, _parentRequire, _parserConfig, _parseFn_1, _parseContext, _pkgs, _preservedGroups, _processArgs, _recommendCommands, _shim_1, _strict, _strictCommands, _strictOptions, _usage, _versionOpt, _validation;
import { command as Command, } from './command.js';
import { assertNotStrictEqual, assertSingleKey, objectKeys, } from './typings/common-types.js';
import { YError } from './yerror.js';
import { usage as Usage } from './usage.js';
import { argsert } from './argsert.js';
import { completion as Completion, } from './completion.js';
import { validation as Validation, } from './validation.js';
import { objFilter } from './utils/obj-filter.js';
import { applyExtends } from './utils/apply-extends.js';
import { applyMiddleware, GlobalMiddleware, } from './middleware.js';
import { isPromise } from './utils/is-promise.js';
import { maybeAsyncResult } from './utils/maybe-async-result.js';
import setBlocking from './utils/set-blocking.js';
export function YargsFactory(_shim) {
    return (processArgs = [], cwd = _shim.process.cwd(), parentRequire) => {
        const yargs = new YargsInstance(processArgs, cwd, parentRequire, _shim);
        Object.defineProperty(yargs, 'argv', {
            get: () => {
                return yargs.parse();
            },
            enumerable: true,
        });
        yargs.help();
        yargs.version();
        return yargs;
    };
}
const kCopyDoubleDash = Symbol('copyDoubleDash');
const kCreateLogger = Symbol('copyDoubleDash');
const kDeleteFromParserHintObject = Symbol('deleteFromParserHintObject');
const kFreeze = Symbol('freeze');
const kGetDollarZero = Symbol('getDollarZero');
const kGetParserConfiguration = Symbol('getParserConfiguration');
const kGuessLocale = Symbol('guessLocale');
const kGuessVersion = Symbol('guessVersion');
const kParsePositionalNumbers = Symbol('parsePositionalNumbers');
const kPkgUp = Symbol('pkgUp');
const kPopulateParserHintArray = Symbol('populateParserHintArray');
const kPopulateParserHintSingleValueDictionary = Symbol('populateParserHintSingleValueDictionary');
const kPopulateParserHintArrayDictionary = Symbol('populateParserHintArrayDictionary');
const kPopulateParserHintDictionary = Symbol('populateParserHintDictionary');
const kSanitizeKey = Symbol('sanitizeKey');
const kSetKey = Symbol('setKey');
const kUnfreeze = Symbol('unfreeze');
const kValidateAsync = Symbol('validateAsync');
const kGetCommandInstance = Symbol('getCommandInstance');
const kGetContext = Symbol('getContext');
const kGetHasOutput = Symbol('getHasOutput');
const kGetLoggerInstance = Symbol('getLoggerInstance');
const kGetParseContext = Symbol('getParseContext');
const kGetUsageInstance = Symbol('getUsageInstance');
const kGetValidationInstance = Symbol('getValidationInstance');
const kHasParseCallback = Symbol('hasParseCallback');
const kPostProcess = Symbol('postProcess');
const kRebase = Symbol('rebase');
const kReset = Symbol('reset');
const kRunYargsParserAndExecuteCommands = Symbol('runYargsParserAndExecuteCommands');
const kRunValidation = Symbol('runValidation');
const kSetHasOutput = Symbol('setHasOutput');
export class YargsInstance {
    constructor(processArgs = [], cwd, parentRequire, shim) {
        this.customScriptName = false;
        this.parsed = false;
        _command.set(this, void 0);
        _cwd.set(this, void 0);
        _context.set(this, { commands: [], fullCommands: [] });
        _completion.set(this, null);
        _completionCommand.set(this, null);
        _defaultShowHiddenOpt.set(this, 'show-hidden');
        _exitError.set(this, null);
        _detectLocale.set(this, true);
        _exitProcess.set(this, true);
        _frozens.set(this, []);
        _globalMiddleware.set(this, void 0);
        _groups.set(this, {});
        _hasOutput.set(this, false);
        _helpOpt.set(this, null);
        _logger.set(this, void 0);
        _output.set(this, '');
        _options.set(this, void 0);
        _parentRequire.set(this, void 0);
        _parserConfig.set(this, {});
        _parseFn_1.set(this, null);
        _parseContext.set(this, null);
        _pkgs.set(this, {});
        _preservedGroups.set(this, {});
        _processArgs.set(this, void 0);
        _recommendCommands.set(this, false);
        _shim_1.set(this, void 0);
        _strict.set(this, false);
        _strictCommands.set(this, false);
        _strictOptions.set(this, false);
        _usage.set(this, void 0);
        _versionOpt.set(this, null);
        _validation.set(this, void 0);
        __classPrivateFieldSet(this, _shim_1, shim);
        __classPrivateFieldSet(this, _processArgs, processArgs);
        __classPrivateFieldSet(this, _cwd, cwd);
        __classPrivateFieldSet(this, _parentRequire, parentRequire);
        __classPrivateFieldSet(this, _globalMiddleware, new GlobalMiddleware(this));
        this.$0 = this[kGetDollarZero]();
        this[kReset]();
        __classPrivateFieldSet(this, _command, __classPrivateFieldGet(this, _command));
        __classPrivateFieldSet(this, _usage, __classPrivateFieldGet(this, _usage));
        __classPrivateFieldSet(this, _validation, __classPrivateFieldGet(this, _validation));
        __classPrivateFieldSet(this, _options, __classPrivateFieldGet(this, _options));
        __classPrivateFieldGet(this, _options).showHiddenOpt = __classPrivateFieldGet(this, _defaultShowHiddenOpt);
        __classPrivateFieldSet(this, _logger, this[kCreateLogger]());
    }
    addHelpOpt(opt, msg) {
        const defaultHelpOpt = 'help';
        argsert('[string|boolean] [string]', [opt, msg], arguments.length);
        if (__classPrivateFieldGet(this, _helpOpt)) {
            this[kDeleteFromParserHintObject](__classPrivateFieldGet(this, _helpOpt));
            __classPrivateFieldSet(this, _helpOpt, null);
        }
        if (opt === false && msg === undefined)
            return this;
        __classPrivateFieldSet(this, _helpOpt, typeof opt === 'string' ? opt : defaultHelpOpt);
        this.boolean(__classPrivateFieldGet(this, _helpOpt));
        this.describe(__classPrivateFieldGet(this, _helpOpt), msg || __classPrivateFieldGet(this, _usage).deferY18nLookup('Show help'));
        return this;
    }
    help(opt, msg) {
        return this.addHelpOpt(opt, msg);
    }
    addShowHiddenOpt(opt, msg) {
        argsert('[string|boolean] [string]', [opt, msg], arguments.length);
        if (opt === false && msg === undefined)
            return this;
        const showHiddenOpt = typeof opt === 'string' ? opt : __classPrivateFieldGet(this, _defaultShowHiddenOpt);
        this.boolean(showHiddenOpt);
        this.describe(showHiddenOpt, msg || __classPrivateFieldGet(this, _usage).deferY18nLookup('Show hidden options'));
        __classPrivateFieldGet(this, _options).showHiddenOpt = showHiddenOpt;
        return this;
    }
    showHidden(opt, msg) {
        return this.addShowHiddenOpt(opt, msg);
    }
    alias(key, value) {
        argsert('<object|string|array> [string|array]', [key, value], arguments.length);
        this[kPopulateParserHintArrayDictionary](this.alias.bind(this), 'alias', key, value);
        return this;
    }
    array(keys) {
        argsert('<array|string>', [keys], arguments.length);
        this[kPopulateParserHintArray]('array', keys);
        return this;
    }
    boolean(keys) {
        argsert('<array|string>', [keys], arguments.length);
        this[kPopulateParserHintArray]('boolean', keys);
        return this;
    }
    check(f, global) {
        argsert('<function> [boolean]', [f, global], arguments.length);
        this.middleware((argv, _yargs) => {
            return maybeAsyncResult(() => {
                return f(argv);
            }, (result) => {
                if (!result) {
                    __classPrivateFieldGet(this, _usage).fail(__classPrivateFieldGet(this, _shim_1).y18n.__('Argument check failed: %s', f.toString()));
                }
                else if (typeof result === 'string' || result instanceof Error) {
                    __classPrivateFieldGet(this, _usage).fail(result.toString(), result);
                }
                return argv;
            }, (err) => {
                __classPrivateFieldGet(this, _usage).fail(err.message ? err.message : err.toString(), err);
                return argv;
            });
        }, false, global);
        return this;
    }
    choices(key, value) {
        argsert('<object|string|array> [string|array]', [key, value], arguments.length);
        this[kPopulateParserHintArrayDictionary](this.choices.bind(this), 'choices', key, value);
        return this;
    }
    coerce(keys, value) {
        argsert('<object|string|array> [function]', [keys, value], arguments.length);
        if (Array.isArray(keys)) {
            if (!value) {
                throw new YError('coerce callback must be provided');
            }
            for (const key of keys) {
                this.coerce(key, value);
            }
            return this;
        }
        else if (typeof keys === 'object') {
            for (const key of Object.keys(keys)) {
                this.coerce(key, keys[key]);
            }
            return this;
        }
        if (!value) {
            throw new YError('coerce callback must be provided');
        }
        __classPrivateFieldGet(this, _options).key[keys] = true;
        __classPrivateFieldGet(this, _globalMiddleware).addCoerceMiddleware((argv, yargs) => {
            let aliases;
            return maybeAsyncResult(() => {
                aliases = yargs.getAliases();
                return value(argv[keys]);
            }, (result) => {
                argv[keys] = result;
                if (aliases[keys]) {
                    for (const alias of aliases[keys]) {
                        argv[alias] = result;
                    }
                }
                return argv;
            }, (err) => {
                throw new YError(err.message);
            });
        }, keys);
        return this;
    }
    conflicts(key1, key2) {
        argsert('<string|object> [string|array]', [key1, key2], arguments.length);
        __classPrivateFieldGet(this, _validation).conflicts(key1, key2);
        return this;
    }
    config(key = 'config', msg, parseFn) {
        argsert('[object|string] [string|function] [function]', [key, msg, parseFn], arguments.length);
        if (typeof key === 'object' && !Array.isArray(key)) {
            key = applyExtends(key, __classPrivateFieldGet(this, _cwd), this[kGetParserConfiguration]()['deep-merge-config'] || false, __classPrivateFieldGet(this, _shim_1));
            __classPrivateFieldGet(this, _options).configObjects = (__classPrivateFieldGet(this, _options).configObjects || []).concat(key);
            return this;
        }
        if (typeof msg === 'function') {
            parseFn = msg;
            msg = undefined;
        }
        this.describe(key, msg || __classPrivateFieldGet(this, _usage).deferY18nLookup('Path to JSON config file'));
        (Array.isArray(key) ? key : [key]).forEach(k => {
            __classPrivateFieldGet(this, _options).config[k] = parseFn || true;
        });
        return this;
    }
    completion(cmd, desc, fn) {
        argsert('[string] [string|boolean|function] [function]', [cmd, desc, fn], arguments.length);
        if (typeof desc === 'function') {
            fn = desc;
            desc = undefined;
        }
        __classPrivateFieldSet(this, _completionCommand, cmd || __classPrivateFieldGet(this, _completionCommand) || 'completion');
        if (!desc && desc !== false) {
            desc = 'generate completion script';
        }
        this.command(__classPrivateFieldGet(this, _completionCommand), desc);
        if (fn)
            __classPrivateFieldGet(this, _completion).registerFunction(fn);
        return this;
    }
    command(cmd, description, builder, handler, middlewares, deprecated) {
        argsert('<string|array|object> [string|boolean] [function|object] [function] [array] [boolean|string]', [cmd, description, builder, handler, middlewares, deprecated], arguments.length);
        __classPrivateFieldGet(this, _command).addHandler(cmd, description, builder, handler, middlewares, deprecated);
        return this;
    }
    commands(cmd, description, builder, handler, middlewares, deprecated) {
        return this.command(cmd, description, builder, handler, middlewares, deprecated);
    }
    commandDir(dir, opts) {
        argsert('<string> [object]', [dir, opts], arguments.length);
        const req = __classPrivateFieldGet(this, _parentRequire) || __classPrivateFieldGet(this, _shim_1).require;
        __classPrivateFieldGet(this, _command).addDirectory(dir, req, __classPrivateFieldGet(this, _shim_1).getCallerFile(), opts);
        return this;
    }
    count(keys) {
        argsert('<array|string>', [keys], arguments.length);
        this[kPopulateParserHintArray]('count', keys);
        return this;
    }
    default(key, value, defaultDescription) {
        argsert('<object|string|array> [*] [string]', [key, value, defaultDescription], arguments.length);
        if (defaultDescription) {
            assertSingleKey(key, __classPrivateFieldGet(this, _shim_1));
            __classPrivateFieldGet(this, _options).defaultDescription[key] = defaultDescription;
        }
        if (typeof value === 'function') {
            assertSingleKey(key, __classPrivateFieldGet(this, _shim_1));
            if (!__classPrivateFieldGet(this, _options).defaultDescription[key])
                __classPrivateFieldGet(this, _options).defaultDescription[key] = __classPrivateFieldGet(this, _usage).functionDescription(value);
            value = value.call();
        }
        this[kPopulateParserHintSingleValueDictionary](this.default.bind(this), 'default', key, value);
        return this;
    }
    defaults(key, value, defaultDescription) {
        return this.default(key, value, defaultDescription);
    }
    demandCommand(min = 1, max, minMsg, maxMsg) {
        argsert('[number] [number|string] [string|null|undefined] [string|null|undefined]', [min, max, minMsg, maxMsg], arguments.length);
        if (typeof max !== 'number') {
            minMsg = max;
            max = Infinity;
        }
        this.global('_', false);
        __classPrivateFieldGet(this, _options).demandedCommands._ = {
            min,
            max,
            minMsg,
            maxMsg,
        };
        return this;
    }
    demand(keys, max, msg) {
        if (Array.isArray(max)) {
            max.forEach(key => {
                assertNotStrictEqual(msg, true, __classPrivateFieldGet(this, _shim_1));
                this.demandOption(key, msg);
            });
            max = Infinity;
        }
        else if (typeof max !== 'number') {
            msg = max;
            max = Infinity;
        }
        if (typeof keys === 'number') {
            assertNotStrictEqual(msg, true, __classPrivateFieldGet(this, _shim_1));
            this.demandCommand(keys, max, msg, msg);
        }
        else if (Array.isArray(keys)) {
            keys.forEach(key => {
                assertNotStrictEqual(msg, true, __classPrivateFieldGet(this, _shim_1));
                this.demandOption(key, msg);
            });
        }
        else {
            if (typeof msg === 'string') {
                this.demandOption(keys, msg);
            }
            else if (msg === true || typeof msg === 'undefined') {
                this.demandOption(keys);
            }
        }
        return this;
    }
    demandOption(keys, msg) {
        argsert('<object|string|array> [string]', [keys, msg], arguments.length);
        this[kPopulateParserHintSingleValueDictionary](this.demandOption.bind(this), 'demandedOptions', keys, msg);
        return this;
    }
    deprecateOption(option, message) {
        argsert('<string> [string|boolean]', [option, message], arguments.length);
        __classPrivateFieldGet(this, _options).deprecatedOptions[option] = message;
        return this;
    }
    describe(keys, description) {
        argsert('<object|string|array> [string]', [keys, description], arguments.length);
        this[kSetKey](keys, true);
        __classPrivateFieldGet(this, _usage).describe(keys, description);
        return this;
    }
    detectLocale(detect) {
        argsert('<boolean>', [detect], arguments.length);
        __classPrivateFieldSet(this, _detectLocale, detect);
        return this;
    }
    env(prefix) {
        argsert('[string|boolean]', [prefix], arguments.length);
        if (prefix === false)
            delete __classPrivateFieldGet(this, _options).envPrefix;
        else
            __classPrivateFieldGet(this, _options).envPrefix = prefix || '';
        return this;
    }
    epilogue(msg) {
        argsert('<string>', [msg], arguments.length);
        __classPrivateFieldGet(this, _usage).epilog(msg);
        return this;
    }
    epilog(msg) {
        return this.epilogue(msg);
    }
    example(cmd, description) {
        argsert('<string|array> [string]', [cmd, description], arguments.length);
        if (Array.isArray(cmd)) {
            cmd.forEach(exampleParams => this.example(...exampleParams));
        }
        else {
            __classPrivateFieldGet(this, _usage).example(cmd, description);
        }
        return this;
    }
    exit(code, err) {
        __classPrivateFieldSet(this, _hasOutput, true);
        __classPrivateFieldSet(this, _exitError, err);
        if (__classPrivateFieldGet(this, _exitProcess))
            __classPrivateFieldGet(this, _shim_1).process.exit(code);
    }
    exitProcess(enabled = true) {
        argsert('[boolean]', [enabled], arguments.length);
        __classPrivateFieldSet(this, _exitProcess, enabled);
        return this;
    }
    fail(f) {
        argsert('<function|boolean>', [f], arguments.length);
        if (typeof f === 'boolean' && f !== false) {
            throw new YError("Invalid first argument. Expected function or boolean 'false'");
        }
        __classPrivateFieldGet(this, _usage).failFn(f);
        return this;
    }
    getAliases() {
        return this.parsed ? this.parsed.aliases : {};
    }
    async getCompletion(args, done) {
        argsert('<array> [function]', [args, done], arguments.length);
        if (!done) {
            return new Promise((resolve, reject) => {
                __classPrivateFieldGet(this, _completion).getCompletion(args, (err, completions) => {
                    if (err)
                        reject(err);
                    else
                        resolve(completions);
                });
            });
        }
        else {
            return __classPrivateFieldGet(this, _completion).getCompletion(args, done);
        }
    }
    getDemandedOptions() {
        argsert([], 0);
        return __classPrivateFieldGet(this, _options).demandedOptions;
    }
    getDemandedCommands() {
        argsert([], 0);
        return __classPrivateFieldGet(this, _options).demandedCommands;
    }
    getDeprecatedOptions() {
        argsert([], 0);
        return __classPrivateFieldGet(this, _options).deprecatedOptions;
    }
    getDetectLocale() {
        return __classPrivateFieldGet(this, _detectLocale);
    }
    getExitProcess() {
        return __classPrivateFieldGet(this, _exitProcess);
    }
    getGroups() {
        return Object.assign({}, __classPrivateFieldGet(this, _groups), __classPrivateFieldGet(this, _preservedGroups));
    }
    getHelp() {
        __classPrivateFieldSet(this, _hasOutput, true);
        if (!__classPrivateFieldGet(this, _usage).hasCachedHelpMessage()) {
            if (!this.parsed) {
                const parse = this[kRunYargsParserAndExecuteCommands](__classPrivateFieldGet(this, _processArgs), undefined, undefined, 0, true);
                if (isPromise(parse)) {
                    return parse.then(() => {
                        return __classPrivateFieldGet(this, _usage).help();
                    });
                }
            }
            const builderResponse = __classPrivateFieldGet(this, _command).runDefaultBuilderOn(this);
            if (isPromise(builderResponse)) {
                return builderResponse.then(() => {
                    return __classPrivateFieldGet(this, _usage).help();
                });
            }
        }
        return Promise.resolve(__classPrivateFieldGet(this, _usage).help());
    }
    getOptions() {
        return __classPrivateFieldGet(this, _options);
    }
    getStrict() {
        return __classPrivateFieldGet(this, _strict);
    }
    getStrictCommands() {
        return __classPrivateFieldGet(this, _strictCommands);
    }
    getStrictOptions() {
        return __classPrivateFieldGet(this, _strictOptions);
    }
    global(globals, global) {
        argsert('<string|array> [boolean]', [globals, global], arguments.length);
        globals = [].concat(globals);
        if (global !== false) {
            __classPrivateFieldGet(this, _options).local = __classPrivateFieldGet(this, _options).local.filter(l => globals.indexOf(l) === -1);
        }
        else {
            globals.forEach(g => {
                if (__classPrivateFieldGet(this, _options).local.indexOf(g) === -1)
                    __classPrivateFieldGet(this, _options).local.push(g);
            });
        }
        return this;
    }
    group(opts, groupName) {
        argsert('<string|array> <string>', [opts, groupName], arguments.length);
        const existing = __classPrivateFieldGet(this, _preservedGroups)[groupName] || __classPrivateFieldGet(this, _groups)[groupName];
        if (__classPrivateFieldGet(this, _preservedGroups)[groupName]) {
            delete __classPrivateFieldGet(this, _preservedGroups)[groupName];
        }
        const seen = {};
        __classPrivateFieldGet(this, _groups)[groupName] = (existing || []).concat(opts).filter(key => {
            if (seen[key])
                return false;
            return (seen[key] = true);
        });
        return this;
    }
    hide(key) {
        argsert('<string>', [key], arguments.length);
        __classPrivateFieldGet(this, _options).hiddenOptions.push(key);
        return this;
    }
    implies(key, value) {
        argsert('<string|object> [number|string|array]', [key, value], arguments.length);
        __classPrivateFieldGet(this, _validation).implies(key, value);
        return this;
    }
    locale(locale) {
        argsert('[string]', [locale], arguments.length);
        if (!locale) {
            this[kGuessLocale]();
            return __classPrivateFieldGet(this, _shim_1).y18n.getLocale();
        }
        __classPrivateFieldSet(this, _detectLocale, false);
        __classPrivateFieldGet(this, _shim_1).y18n.setLocale(locale);
        return this;
    }
    middleware(callback, applyBeforeValidation, global) {
        return __classPrivateFieldGet(this, _globalMiddleware).addMiddleware(callback, !!applyBeforeValidation, global);
    }
    nargs(key, value) {
        argsert('<string|object|array> [number]', [key, value], arguments.length);
        this[kPopulateParserHintSingleValueDictionary](this.nargs.bind(this), 'narg', key, value);
        return this;
    }
    normalize(keys) {
        argsert('<array|string>', [keys], arguments.length);
        this[kPopulateParserHintArray]('normalize', keys);
        return this;
    }
    number(keys) {
        argsert('<array|string>', [keys], arguments.length);
        this[kPopulateParserHintArray]('number', keys);
        return this;
    }
    option(key, opt) {
        argsert('<string|object> [object]', [key, opt], arguments.length);
        if (typeof key === 'object') {
            Object.keys(key).forEach(k => {
                this.options(k, key[k]);
            });
        }
        else {
            if (typeof opt !== 'object') {
                opt = {};
            }
            __classPrivateFieldGet(this, _options).key[key] = true;
            if (opt.alias)
                this.alias(key, opt.alias);
            const deprecate = opt.deprecate || opt.deprecated;
            if (deprecate) {
                this.deprecateOption(key, deprecate);
            }
            const demand = opt.demand || opt.required || opt.require;
            if (demand) {
                this.demand(key, demand);
            }
            if (opt.demandOption) {
                this.demandOption(key, typeof opt.demandOption === 'string' ? opt.demandOption : undefined);
            }
            if (opt.conflicts) {
                this.conflicts(key, opt.conflicts);
            }
            if ('default' in opt) {
                this.default(key, opt.default);
            }
            if (opt.implies !== undefined) {
                this.implies(key, opt.implies);
            }
            if (opt.nargs !== undefined) {
                this.nargs(key, opt.nargs);
            }
            if (opt.config) {
                this.config(key, opt.configParser);
            }
            if (opt.normalize) {
                this.normalize(key);
            }
            if (opt.choices) {
                this.choices(key, opt.choices);
            }
            if (opt.coerce) {
                this.coerce(key, opt.coerce);
            }
            if (opt.group) {
                this.group(key, opt.group);
            }
            if (opt.boolean || opt.type === 'boolean') {
                this.boolean(key);
                if (opt.alias)
                    this.boolean(opt.alias);
            }
            if (opt.array || opt.type === 'array') {
                this.array(key);
                if (opt.alias)
                    this.array(opt.alias);
            }
            if (opt.number || opt.type === 'number') {
                this.number(key);
                if (opt.alias)
                    this.number(opt.alias);
            }
            if (opt.string || opt.type === 'string') {
                this.string(key);
                if (opt.alias)
                    this.string(opt.alias);
            }
            if (opt.count || opt.type === 'count') {
                this.count(key);
            }
            if (typeof opt.global === 'boolean') {
                this.global(key, opt.global);
            }
            if (opt.defaultDescription) {
                __classPrivateFieldGet(this, _options).defaultDescription[key] = opt.defaultDescription;
            }
            if (opt.skipValidation) {
                this.skipValidation(key);
            }
            const desc = opt.describe || opt.description || opt.desc;
            this.describe(key, desc);
            if (opt.hidden) {
                this.hide(key);
            }
            if (opt.requiresArg) {
                this.requiresArg(key);
            }
        }
        return this;
    }
    options(key, opt) {
        return this.option(key, opt);
    }
    parse(args, shortCircuit, _parseFn) {
        argsert('[string|array] [function|boolean|object] [function]', [args, shortCircuit, _parseFn], arguments.length);
        this[kFreeze]();
        if (typeof args === 'undefined') {
            args = __classPrivateFieldGet(this, _processArgs);
        }
        if (typeof shortCircuit === 'object') {
            __classPrivateFieldSet(this, _parseContext, shortCircuit);
            shortCircuit = _parseFn;
        }
        if (typeof shortCircuit === 'function') {
            __classPrivateFieldSet(this, _parseFn_1, shortCircuit);
            shortCircuit = false;
        }
        if (!shortCircuit)
            __classPrivateFieldSet(this, _processArgs, args);
        if (__classPrivateFieldGet(this, _parseFn_1))
            __classPrivateFieldSet(this, _exitProcess, false);
        const parsed = this[kRunYargsParserAndExecuteCommands](args, !!shortCircuit);
        const tmpParsed = this.parsed;
        __classPrivateFieldGet(this, _completion).setParsed(this.parsed);
        if (isPromise(parsed)) {
            return parsed
                .then(argv => {
                if (__classPrivateFieldGet(this, _parseFn_1))
                    __classPrivateFieldGet(this, _parseFn_1).call(this, __classPrivateFieldGet(this, _exitError), argv, __classPrivateFieldGet(this, _output));
                return argv;
            })
                .catch(err => {
                if (__classPrivateFieldGet(this, _parseFn_1)) {
                    __classPrivateFieldGet(this, _parseFn_1)(err, this.parsed.argv, __classPrivateFieldGet(this, _output));
                }
                throw err;
            })
                .finally(() => {
                this[kUnfreeze]();
                this.parsed = tmpParsed;
            });
        }
        else {
            if (__classPrivateFieldGet(this, _parseFn_1))
                __classPrivateFieldGet(this, _parseFn_1).call(this, __classPrivateFieldGet(this, _exitError), parsed, __classPrivateFieldGet(this, _output));
            this[kUnfreeze]();
            this.parsed = tmpParsed;
        }
        return parsed;
    }
    parseAsync(args, shortCircuit, _parseFn) {
        const maybePromise = this.parse(args, shortCircuit, _parseFn);
        if (!isPromise(maybePromise)) {
            return Promise.resolve(maybePromise);
        }
        else {
            return maybePromise;
        }
    }
    parseSync(args, shortCircuit, _parseFn) {
        const maybePromise = this.parse(args, shortCircuit, _parseFn);
        if (isPromise(maybePromise)) {
            throw new YError('.parseSync() must not be used with asynchronous builders, handlers, or middleware');
        }
        return maybePromise;
    }
    parserConfiguration(config) {
        argsert('<object>', [config], arguments.length);
        __classPrivateFieldSet(this, _parserConfig, config);
        return this;
    }
    pkgConf(key, rootPath) {
        argsert('<string> [string]', [key, rootPath], arguments.length);
        let conf = null;
        const obj = this[kPkgUp](rootPath || __classPrivateFieldGet(this, _cwd));
        if (obj[key] && typeof obj[key] === 'object') {
            conf = applyExtends(obj[key], rootPath || __classPrivateFieldGet(this, _cwd), this[kGetParserConfiguration]()['deep-merge-config'] || false, __classPrivateFieldGet(this, _shim_1));
            __classPrivateFieldGet(this, _options).configObjects = (__classPrivateFieldGet(this, _options).configObjects || []).concat(conf);
        }
        return this;
    }
    positional(key, opts) {
        argsert('<string> <object>', [key, opts], arguments.length);
        const supportedOpts = [
            'default',
            'defaultDescription',
            'implies',
            'normalize',
            'choices',
            'conflicts',
            'coerce',
            'type',
            'describe',
            'desc',
            'description',
            'alias',
        ];
        opts = objFilter(opts, (k, v) => {
            let accept = supportedOpts.indexOf(k) !== -1;
            if (k === 'type' && ['string', 'number', 'boolean'].indexOf(v) === -1)
                accept = false;
            return accept;
        });
        const fullCommand = __classPrivateFieldGet(this, _context).fullCommands[__classPrivateFieldGet(this, _context).fullCommands.length - 1];
        const parseOptions = fullCommand
            ? __classPrivateFieldGet(this, _command).cmdToParseOptions(fullCommand)
            : {
                array: [],
                alias: {},
                default: {},
                demand: {},
            };
        objectKeys(parseOptions).forEach(pk => {
            const parseOption = parseOptions[pk];
            if (Array.isArray(parseOption)) {
                if (parseOption.indexOf(key) !== -1)
                    opts[pk] = true;
            }
            else {
                if (parseOption[key] && !(pk in opts))
                    opts[pk] = parseOption[key];
            }
        });
        this.group(key, __classPrivateFieldGet(this, _usage).getPositionalGroupName());
        return this.option(key, opts);
    }
    recommendCommands(recommend = true) {
        argsert('[boolean]', [recommend], arguments.length);
        __classPrivateFieldSet(this, _recommendCommands, recommend);
        return this;
    }
    required(keys, max, msg) {
        return this.demand(keys, max, msg);
    }
    require(keys, max, msg) {
        return this.demand(keys, max, msg);
    }
    requiresArg(keys) {
        argsert('<array|string|object> [number]', [keys], arguments.length);
        if (typeof keys === 'string' && __classPrivateFieldGet(this, _options).narg[keys]) {
            return this;
        }
        else {
            this[kPopulateParserHintSingleValueDictionary](this.requiresArg.bind(this), 'narg', keys, NaN);
        }
        return this;
    }
    showCompletionScript($0, cmd) {
        argsert('[string] [string]', [$0, cmd], arguments.length);
        $0 = $0 || this.$0;
        __classPrivateFieldGet(this, _logger).log(__classPrivateFieldGet(this, _completion).generateCompletionScript($0, cmd || __classPrivateFieldGet(this, _completionCommand) || 'completion'));
        return this;
    }
    showHelp(level) {
        argsert('[string|function]', [level], arguments.length);
        __classPrivateFieldSet(this, _hasOutput, true);
        if (!__classPrivateFieldGet(this, _usage).hasCachedHelpMessage()) {
            if (!this.parsed) {
                const parse = this[kRunYargsParserAndExecuteCommands](__classPrivateFieldGet(this, _processArgs), undefined, undefined, 0, true);
                if (isPromise(parse)) {
                    parse.then(() => {
                        __classPrivateFieldGet(this, _usage).showHelp(level);
                    });
                    return this;
                }
            }
            const builderResponse = __classPrivateFieldGet(this, _command).runDefaultBuilderOn(this);
            if (isPromise(builderResponse)) {
                builderResponse.then(() => {
                    __classPrivateFieldGet(this, _usage).showHelp(level);
                });
                return this;
            }
        }
        __classPrivateFieldGet(this, _usage).showHelp(level);
        return this;
    }
    scriptName(scriptName) {
        this.customScriptName = true;
        this.$0 = scriptName;
        return this;
    }
    showHelpOnFail(enabled, message) {
        argsert('[boolean|string] [string]', [enabled, message], arguments.length);
        __classPrivateFieldGet(this, _usage).showHelpOnFail(enabled, message);
        return this;
    }
    showVersion(level) {
        argsert('[string|function]', [level], arguments.length);
        __classPrivateFieldGet(this, _usage).showVersion(level);
        return this;
    }
    skipValidation(keys) {
        argsert('<array|string>', [keys], arguments.length);
        this[kPopulateParserHintArray]('skipValidation', keys);
        return this;
    }
    strict(enabled) {
        argsert('[boolean]', [enabled], arguments.length);
        __classPrivateFieldSet(this, _strict, enabled !== false);
        return this;
    }
    strictCommands(enabled) {
        argsert('[boolean]', [enabled], arguments.length);
        __classPrivateFieldSet(this, _strictCommands, enabled !== false);
        return this;
    }
    strictOptions(enabled) {
        argsert('[boolean]', [enabled], arguments.length);
        __classPrivateFieldSet(this, _strictOptions, enabled !== false);
        return this;
    }
    string(key) {
        argsert('<array|string>', [key], arguments.length);
        this[kPopulateParserHintArray]('string', key);
        return this;
    }
    terminalWidth() {
        argsert([], 0);
        return __classPrivateFieldGet(this, _shim_1).process.stdColumns;
    }
    updateLocale(obj) {
        return this.updateStrings(obj);
    }
    updateStrings(obj) {
        argsert('<object>', [obj], arguments.length);
        __classPrivateFieldSet(this, _detectLocale, false);
        __classPrivateFieldGet(this, _shim_1).y18n.updateLocale(obj);
        return this;
    }
    usage(msg, description, builder, handler) {
        argsert('<string|null|undefined> [string|boolean] [function|object] [function]', [msg, description, builder, handler], arguments.length);
        if (description !== undefined) {
            assertNotStrictEqual(msg, null, __classPrivateFieldGet(this, _shim_1));
            if ((msg || '').match(/^\$0( |$)/)) {
                return this.command(msg, description, builder, handler);
            }
            else {
                throw new YError('.usage() description must start with $0 if being used as alias for .command()');
            }
        }
        else {
            __classPrivateFieldGet(this, _usage).usage(msg);
            return this;
        }
    }
    version(opt, msg, ver) {
        const defaultVersionOpt = 'version';
        argsert('[boolean|string] [string] [string]', [opt, msg, ver], arguments.length);
        if (__classPrivateFieldGet(this, _versionOpt)) {
            this[kDeleteFromParserHintObject](__classPrivateFieldGet(this, _versionOpt));
            __classPrivateFieldGet(this, _usage).version(undefined);
            __classPrivateFieldSet(this, _versionOpt, null);
        }
        if (arguments.length === 0) {
            ver = this[kGuessVersion]();
            opt = defaultVersionOpt;
        }
        else if (arguments.length === 1) {
            if (opt === false) {
                return this;
            }
            ver = opt;
            opt = defaultVersionOpt;
        }
        else if (arguments.length === 2) {
            ver = msg;
            msg = undefined;
        }
        __classPrivateFieldSet(this, _versionOpt, typeof opt === 'string' ? opt : defaultVersionOpt);
        msg = msg || __classPrivateFieldGet(this, _usage).deferY18nLookup('Show version number');
        __classPrivateFieldGet(this, _usage).version(ver || undefined);
        this.boolean(__classPrivateFieldGet(this, _versionOpt));
        this.describe(__classPrivateFieldGet(this, _versionOpt), msg);
        return this;
    }
    wrap(cols) {
        argsert('<number|null|undefined>', [cols], arguments.length);
        __classPrivateFieldGet(this, _usage).wrap(cols);
        return this;
    }
    [(_command = new WeakMap(), _cwd = new WeakMap(), _context = new WeakMap(), _completion = new WeakMap(), _completionCommand = new WeakMap(), _defaultShowHiddenOpt = new WeakMap(), _exitError = new WeakMap(), _detectLocale = new WeakMap(), _exitProcess = new WeakMap(), _frozens = new WeakMap(), _globalMiddleware = new WeakMap(), _groups = new WeakMap(), _hasOutput = new WeakMap(), _helpOpt = new WeakMap(), _logger = new WeakMap(), _output = new WeakMap(), _options = new WeakMap(), _parentRequire = new WeakMap(), _parserConfig = new WeakMap(), _parseFn_1 = new WeakMap(), _parseContext = new WeakMap(), _pkgs = new WeakMap(), _preservedGroups = new WeakMap(), _processArgs = new WeakMap(), _recommendCommands = new WeakMap(), _shim_1 = new WeakMap(), _strict = new WeakMap(), _strictCommands = new WeakMap(), _strictOptions = new WeakMap(), _usage = new WeakMap(), _versionOpt = new WeakMap(), _validation = new WeakMap(), kCopyDoubleDash)](argv) {
        if (!argv._ || !argv['--'])
            return argv;
        argv._.push.apply(argv._, argv['--']);
        try {
            delete argv['--'];
        }
        catch (_err) { }
        return argv;
    }
    [kCreateLogger]() {
        return {
            log: (...args) => {
                if (!this[kHasParseCallback]())
                    console.log(...args);
                __classPrivateFieldSet(this, _hasOutput, true);
                if (__classPrivateFieldGet(this, _output).length)
                    __classPrivateFieldSet(this, _output, __classPrivateFieldGet(this, _output) + '\n');
                __classPrivateFieldSet(this, _output, __classPrivateFieldGet(this, _output) + args.join(' '));
            },
            error: (...args) => {
                if (!this[kHasParseCallback]())
                    console.error(...args);
                __classPrivateFieldSet(this, _hasOutput, true);
                if (__classPrivateFieldGet(this, _output).length)
                    __classPrivateFieldSet(this, _output, __classPrivateFieldGet(this, _output) + '\n');
                __classPrivateFieldSet(this, _output, __classPrivateFieldGet(this, _output) + args.join(' '));
            },
        };
    }
    [kDeleteFromParserHintObject](optionKey) {
        objectKeys(__classPrivateFieldGet(this, _options)).forEach((hintKey) => {
            if (((key) => key === 'configObjects')(hintKey))
                return;
            const hint = __classPrivateFieldGet(this, _options)[hintKey];
            if (Array.isArray(hint)) {
                if (~hint.indexOf(optionKey))
                    hint.splice(hint.indexOf(optionKey), 1);
            }
            else if (typeof hint === 'object') {
                delete hint[optionKey];
            }
        });
        delete __classPrivateFieldGet(this, _usage).getDescriptions()[optionKey];
    }
    [kFreeze]() {
        __classPrivateFieldGet(this, _frozens).push({
            options: __classPrivateFieldGet(this, _options),
            configObjects: __classPrivateFieldGet(this, _options).configObjects.slice(0),
            exitProcess: __classPrivateFieldGet(this, _exitProcess),
            groups: __classPrivateFieldGet(this, _groups),
            strict: __classPrivateFieldGet(this, _strict),
            strictCommands: __classPrivateFieldGet(this, _strictCommands),
            strictOptions: __classPrivateFieldGet(this, _strictOptions),
            completionCommand: __classPrivateFieldGet(this, _completionCommand),
            output: __classPrivateFieldGet(this, _output),
            exitError: __classPrivateFieldGet(this, _exitError),
            hasOutput: __classPrivateFieldGet(this, _hasOutput),
            parsed: this.parsed,
            parseFn: __classPrivateFieldGet(this, _parseFn_1),
            parseContext: __classPrivateFieldGet(this, _parseContext),
        });
        __classPrivateFieldGet(this, _usage).freeze();
        __classPrivateFieldGet(this, _validation).freeze();
        __classPrivateFieldGet(this, _command).freeze();
        __classPrivateFieldGet(this, _globalMiddleware).freeze();
    }
    [kGetDollarZero]() {
        let $0 = '';
        let default$0;
        if (/\b(node|iojs|electron)(\.exe)?$/.test(__classPrivateFieldGet(this, _shim_1).process.argv()[0])) {
            default$0 = __classPrivateFieldGet(this, _shim_1).process.argv().slice(1, 2);
        }
        else {
            default$0 = __classPrivateFieldGet(this, _shim_1).process.argv().slice(0, 1);
        }
        $0 = default$0
            .map(x => {
            const b = this[kRebase](__classPrivateFieldGet(this, _cwd), x);
            return x.match(/^(\/|([a-zA-Z]:)?\\)/) && b.length < x.length ? b : x;
        })
            .join(' ')
            .trim();
        if (__classPrivateFieldGet(this, _shim_1).getEnv('_') &&
            __classPrivateFieldGet(this, _shim_1).getProcessArgvBin() === __classPrivateFieldGet(this, _shim_1).getEnv('_')) {
            $0 = __classPrivateFieldGet(this, _shim_1).getEnv('_')
                .replace(`${__classPrivateFieldGet(this, _shim_1).path.dirname(__classPrivateFieldGet(this, _shim_1).process.execPath())}/`, '');
        }
        return $0;
    }
    [kGetParserConfiguration]() {
        return __classPrivateFieldGet(this, _parserConfig);
    }
    [kGuessLocale]() {
        if (!__classPrivateFieldGet(this, _detectLocale))
            return;
        const locale = __classPrivateFieldGet(this, _shim_1).getEnv('LC_ALL') ||
            __classPrivateFieldGet(this, _shim_1).getEnv('LC_MESSAGES') ||
            __classPrivateFieldGet(this, _shim_1).getEnv('LANG') ||
            __classPrivateFieldGet(this, _shim_1).getEnv('LANGUAGE') ||
            'en_US';
        this.locale(locale.replace(/[.:].*/, ''));
    }
    [kGuessVersion]() {
        const obj = this[kPkgUp]();
        return obj.version || 'unknown';
    }
    [kParsePositionalNumbers](argv) {
        const args = argv['--'] ? argv['--'] : argv._;
        for (let i = 0, arg; (arg = args[i]) !== undefined; i++) {
            if (__classPrivateFieldGet(this, _shim_1).Parser.looksLikeNumber(arg) &&
                Number.isSafeInteger(Math.floor(parseFloat(`${arg}`)))) {
                args[i] = Number(arg);
            }
        }
        return argv;
    }
    [kPkgUp](rootPath) {
        const npath = rootPath || '*';
        if (__classPrivateFieldGet(this, _pkgs)[npath])
            return __classPrivateFieldGet(this, _pkgs)[npath];
        let obj = {};
        try {
            let startDir = rootPath || __classPrivateFieldGet(this, _shim_1).mainFilename;
            if (!rootPath && __classPrivateFieldGet(this, _shim_1).path.extname(startDir)) {
                startDir = __classPrivateFieldGet(this, _shim_1).path.dirname(startDir);
            }
            const pkgJsonPath = __classPrivateFieldGet(this, _shim_1).findUp(startDir, (dir, names) => {
                if (names.includes('package.json')) {
                    return 'package.json';
                }
                else {
                    return undefined;
                }
            });
            assertNotStrictEqual(pkgJsonPath, undefined, __classPrivateFieldGet(this, _shim_1));
            obj = JSON.parse(__classPrivateFieldGet(this, _shim_1).readFileSync(pkgJsonPath, 'utf8'));
        }
        catch (_noop) { }
        __classPrivateFieldGet(this, _pkgs)[npath] = obj || {};
        return __classPrivateFieldGet(this, _pkgs)[npath];
    }
    [kPopulateParserHintArray](type, keys) {
        keys = [].concat(keys);
        keys.forEach(key => {
            key = this[kSanitizeKey](key);
            __classPrivateFieldGet(this, _options)[type].push(key);
        });
    }
    [kPopulateParserHintSingleValueDictionary](builder, type, key, value) {
        this[kPopulateParserHintDictionary](builder, type, key, value, (type, key, value) => {
            __classPrivateFieldGet(this, _options)[type][key] = value;
        });
    }
    [kPopulateParserHintArrayDictionary](builder, type, key, value) {
        this[kPopulateParserHintDictionary](builder, type, key, value, (type, key, value) => {
            __classPrivateFieldGet(this, _options)[type][key] = (__classPrivateFieldGet(this, _options)[type][key] || []).concat(value);
        });
    }
    [kPopulateParserHintDictionary](builder, type, key, value, singleKeyHandler) {
        if (Array.isArray(key)) {
            key.forEach(k => {
                builder(k, value);
            });
        }
        else if (((key) => typeof key === 'object')(key)) {
            for (const k of objectKeys(key)) {
                builder(k, key[k]);
            }
        }
        else {
            singleKeyHandler(type, this[kSanitizeKey](key), value);
        }
    }
    [kSanitizeKey](key) {
        if (key === '__proto__')
            return '___proto___';
        return key;
    }
    [kSetKey](key, set) {
        this[kPopulateParserHintSingleValueDictionary](this[kSetKey].bind(this), 'key', key, set);
        return this;
    }
    [kUnfreeze]() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const frozen = __classPrivateFieldGet(this, _frozens).pop();
        assertNotStrictEqual(frozen, undefined, __classPrivateFieldGet(this, _shim_1));
        let configObjects;
        (_a = this, _b = this, _c = this, _d = this, _e = this, _f = this, _g = this, _h = this, _j = this, _k = this, _l = this, _m = this, {
            options: ({ set value(_o) { __classPrivateFieldSet(_a, _options, _o); } }).value,
            configObjects,
            exitProcess: ({ set value(_o) { __classPrivateFieldSet(_b, _exitProcess, _o); } }).value,
            groups: ({ set value(_o) { __classPrivateFieldSet(_c, _groups, _o); } }).value,
            output: ({ set value(_o) { __classPrivateFieldSet(_d, _output, _o); } }).value,
            exitError: ({ set value(_o) { __classPrivateFieldSet(_e, _exitError, _o); } }).value,
            hasOutput: ({ set value(_o) { __classPrivateFieldSet(_f, _hasOutput, _o); } }).value,
            parsed: this.parsed,
            strict: ({ set value(_o) { __classPrivateFieldSet(_g, _strict, _o); } }).value,
            strictCommands: ({ set value(_o) { __classPrivateFieldSet(_h, _strictCommands, _o); } }).value,
            strictOptions: ({ set value(_o) { __classPrivateFieldSet(_j, _strictOptions, _o); } }).value,
            completionCommand: ({ set value(_o) { __classPrivateFieldSet(_k, _completionCommand, _o); } }).value,
            parseFn: ({ set value(_o) { __classPrivateFieldSet(_l, _parseFn_1, _o); } }).value,
            parseContext: ({ set value(_o) { __classPrivateFieldSet(_m, _parseContext, _o); } }).value,
        } = frozen);
        __classPrivateFieldGet(this, _options).configObjects = configObjects;
        __classPrivateFieldGet(this, _usage).unfreeze();
        __classPrivateFieldGet(this, _validation).unfreeze();
        __classPrivateFieldGet(this, _command).unfreeze();
        __classPrivateFieldGet(this, _globalMiddleware).unfreeze();
    }
    [kValidateAsync](validation, argv) {
        return maybeAsyncResult(argv, result => {
            validation(result);
            return result;
        });
    }
    getInternalMethods() {
        return {
            getCommandInstance: this[kGetCommandInstance].bind(this),
            getContext: this[kGetContext].bind(this),
            getHasOutput: this[kGetHasOutput].bind(this),
            getLoggerInstance: this[kGetLoggerInstance].bind(this),
            getParseContext: this[kGetParseContext].bind(this),
            getParserConfiguration: this[kGetParserConfiguration].bind(this),
            getUsageInstance: this[kGetUsageInstance].bind(this),
            getValidationInstance: this[kGetValidationInstance].bind(this),
            hasParseCallback: this[kHasParseCallback].bind(this),
            postProcess: this[kPostProcess].bind(this),
            reset: this[kReset].bind(this),
            runValidation: this[kRunValidation].bind(this),
            runYargsParserAndExecuteCommands: this[kRunYargsParserAndExecuteCommands].bind(this),
            setHasOutput: this[kSetHasOutput].bind(this),
        };
    }
    [kGetCommandInstance]() {
        return __classPrivateFieldGet(this, _command);
    }
    [kGetContext]() {
        return __classPrivateFieldGet(this, _context);
    }
    [kGetHasOutput]() {
        return __classPrivateFieldGet(this, _hasOutput);
    }
    [kGetLoggerInstance]() {
        return __classPrivateFieldGet(this, _logger);
    }
    [kGetParseContext]() {
        return __classPrivateFieldGet(this, _parseContext) || {};
    }
    [kGetUsageInstance]() {
        return __classPrivateFieldGet(this, _usage);
    }
    [kGetValidationInstance]() {
        return __classPrivateFieldGet(this, _validation);
    }
    [kHasParseCallback]() {
        return !!__classPrivateFieldGet(this, _parseFn_1);
    }
    [kPostProcess](argv, populateDoubleDash, calledFromCommand, runGlobalMiddleware) {
        if (calledFromCommand)
            return argv;
        if (isPromise(argv))
            return argv;
        if (!populateDoubleDash) {
            argv = this[kCopyDoubleDash](argv);
        }
        const parsePositionalNumbers = this[kGetParserConfiguration]()['parse-positional-numbers'] ||
            this[kGetParserConfiguration]()['parse-positional-numbers'] === undefined;
        if (parsePositionalNumbers) {
            argv = this[kParsePositionalNumbers](argv);
        }
        if (runGlobalMiddleware) {
            argv = applyMiddleware(argv, this, __classPrivateFieldGet(this, _globalMiddleware).getMiddleware(), false);
        }
        return argv;
    }
    [kReset](aliases = {}) {
        __classPrivateFieldSet(this, _options, __classPrivateFieldGet(this, _options) || {});
        const tmpOptions = {};
        tmpOptions.local = __classPrivateFieldGet(this, _options).local ? __classPrivateFieldGet(this, _options).local : [];
        tmpOptions.configObjects = __classPrivateFieldGet(this, _options).configObjects
            ? __classPrivateFieldGet(this, _options).configObjects
            : [];
        const localLookup = {};
        tmpOptions.local.forEach(l => {
            localLookup[l] = true;
            (aliases[l] || []).forEach(a => {
                localLookup[a] = true;
            });
        });
        Object.assign(__classPrivateFieldGet(this, _preservedGroups), Object.keys(__classPrivateFieldGet(this, _groups)).reduce((acc, groupName) => {
            const keys = __classPrivateFieldGet(this, _groups)[groupName].filter(key => !(key in localLookup));
            if (keys.length > 0) {
                acc[groupName] = keys;
            }
            return acc;
        }, {}));
        __classPrivateFieldSet(this, _groups, {});
        const arrayOptions = [
            'array',
            'boolean',
            'string',
            'skipValidation',
            'count',
            'normalize',
            'number',
            'hiddenOptions',
        ];
        const objectOptions = [
            'narg',
            'key',
            'alias',
            'default',
            'defaultDescription',
            'config',
            'choices',
            'demandedOptions',
            'demandedCommands',
            'deprecatedOptions',
        ];
        arrayOptions.forEach(k => {
            tmpOptions[k] = (__classPrivateFieldGet(this, _options)[k] || []).filter((k) => !localLookup[k]);
        });
        objectOptions.forEach((k) => {
            tmpOptions[k] = objFilter(__classPrivateFieldGet(this, _options)[k], k => !localLookup[k]);
        });
        tmpOptions.envPrefix = __classPrivateFieldGet(this, _options).envPrefix;
        __classPrivateFieldSet(this, _options, tmpOptions);
        __classPrivateFieldSet(this, _usage, __classPrivateFieldGet(this, _usage) ? __classPrivateFieldGet(this, _usage).reset(localLookup)
            : Usage(this, __classPrivateFieldGet(this, _shim_1)));
        __classPrivateFieldSet(this, _validation, __classPrivateFieldGet(this, _validation) ? __classPrivateFieldGet(this, _validation).reset(localLookup)
            : Validation(this, __classPrivateFieldGet(this, _usage), __classPrivateFieldGet(this, _shim_1)));
        __classPrivateFieldSet(this, _command, __classPrivateFieldGet(this, _command) ? __classPrivateFieldGet(this, _command).reset()
            : Command(__classPrivateFieldGet(this, _usage), __classPrivateFieldGet(this, _validation), __classPrivateFieldGet(this, _globalMiddleware), __classPrivateFieldGet(this, _shim_1)));
        if (!__classPrivateFieldGet(this, _completion))
            __classPrivateFieldSet(this, _completion, Completion(this, __classPrivateFieldGet(this, _usage), __classPrivateFieldGet(this, _command), __classPrivateFieldGet(this, _shim_1)));
        __classPrivateFieldGet(this, _globalMiddleware).reset();
        __classPrivateFieldSet(this, _completionCommand, null);
        __classPrivateFieldSet(this, _output, '');
        __classPrivateFieldSet(this, _exitError, null);
        __classPrivateFieldSet(this, _hasOutput, false);
        this.parsed = false;
        return this;
    }
    [kRebase](base, dir) {
        return __classPrivateFieldGet(this, _shim_1).path.relative(base, dir);
    }
    [kRunYargsParserAndExecuteCommands](args, shortCircuit, calledFromCommand, commandIndex = 0, helpOnly = false) {
        let skipValidation = !!calledFromCommand || helpOnly;
        args = args || __classPrivateFieldGet(this, _processArgs);
        __classPrivateFieldGet(this, _options).__ = __classPrivateFieldGet(this, _shim_1).y18n.__;
        __classPrivateFieldGet(this, _options).configuration = this[kGetParserConfiguration]();
        const populateDoubleDash = !!__classPrivateFieldGet(this, _options).configuration['populate--'];
        const config = Object.assign({}, __classPrivateFieldGet(this, _options).configuration, {
            'populate--': true,
        });
        const parsed = __classPrivateFieldGet(this, _shim_1).Parser.detailed(args, Object.assign({}, __classPrivateFieldGet(this, _options), {
            configuration: { 'parse-positional-numbers': false, ...config },
        }));
        const argv = Object.assign(parsed.argv, __classPrivateFieldGet(this, _parseContext));
        let argvPromise = undefined;
        const aliases = parsed.aliases;
        let helpOptSet = false;
        let versionOptSet = false;
        Object.keys(argv).forEach(key => {
            if (key === __classPrivateFieldGet(this, _helpOpt) && argv[key]) {
                helpOptSet = true;
            }
            else if (key === __classPrivateFieldGet(this, _versionOpt) && argv[key]) {
                versionOptSet = true;
            }
        });
        argv.$0 = this.$0;
        this.parsed = parsed;
        if (commandIndex === 0) {
            __classPrivateFieldGet(this, _usage).clearCachedHelpMessage();
        }
        try {
            this[kGuessLocale]();
            if (shortCircuit) {
                return this[kPostProcess](argv, populateDoubleDash, !!calledFromCommand, false);
            }
            if (__classPrivateFieldGet(this, _helpOpt)) {
                const helpCmds = [__classPrivateFieldGet(this, _helpOpt)]
                    .concat(aliases[__classPrivateFieldGet(this, _helpOpt)] || [])
                    .filter(k => k.length > 1);
                if (~helpCmds.indexOf('' + argv._[argv._.length - 1])) {
                    argv._.pop();
                    helpOptSet = true;
                }
            }
            const handlerKeys = __classPrivateFieldGet(this, _command).getCommands();
            const requestCompletions = __classPrivateFieldGet(this, _completion).completionKey in argv;
            const skipRecommendation = helpOptSet || requestCompletions || helpOnly;
            if (argv._.length) {
                if (handlerKeys.length) {
                    let firstUnknownCommand;
                    for (let i = commandIndex || 0, cmd; argv._[i] !== undefined; i++) {
                        cmd = String(argv._[i]);
                        if (~handlerKeys.indexOf(cmd) && cmd !== __classPrivateFieldGet(this, _completionCommand)) {
                            const innerArgv = __classPrivateFieldGet(this, _command).runCommand(cmd, this, parsed, i + 1, helpOnly, helpOptSet || versionOptSet || helpOnly);
                            return this[kPostProcess](innerArgv, populateDoubleDash, !!calledFromCommand, false);
                        }
                        else if (!firstUnknownCommand &&
                            cmd !== __classPrivateFieldGet(this, _completionCommand)) {
                            firstUnknownCommand = cmd;
                            break;
                        }
                    }
                    if (!__classPrivateFieldGet(this, _command).hasDefaultCommand() && __classPrivateFieldGet(this, _recommendCommands) &&
                        firstUnknownCommand &&
                        !skipRecommendation) {
                        __classPrivateFieldGet(this, _validation).recommendCommands(firstUnknownCommand, handlerKeys);
                    }
                }
                if (__classPrivateFieldGet(this, _completionCommand) &&
                    ~argv._.indexOf(__classPrivateFieldGet(this, _completionCommand)) &&
                    !requestCompletions) {
                    if (__classPrivateFieldGet(this, _exitProcess))
                        setBlocking(true);
                    this.showCompletionScript();
                    this.exit(0);
                }
            }
            if (__classPrivateFieldGet(this, _command).hasDefaultCommand() && !skipRecommendation) {
                const innerArgv = __classPrivateFieldGet(this, _command).runCommand(null, this, parsed, 0, helpOnly, helpOptSet || versionOptSet || helpOnly);
                return this[kPostProcess](innerArgv, populateDoubleDash, !!calledFromCommand, false);
            }
            if (requestCompletions) {
                if (__classPrivateFieldGet(this, _exitProcess))
                    setBlocking(true);
                args = [].concat(args);
                const completionArgs = args.slice(args.indexOf(`--${__classPrivateFieldGet(this, _completion).completionKey}`) + 1);
                __classPrivateFieldGet(this, _completion).getCompletion(completionArgs, (err, completions) => {
                    if (err)
                        throw new YError(err.message);
                    (completions || []).forEach(completion => {
                        __classPrivateFieldGet(this, _logger).log(completion);
                    });
                    this.exit(0);
                });
                return this[kPostProcess](argv, !populateDoubleDash, !!calledFromCommand, false);
            }
            if (!__classPrivateFieldGet(this, _hasOutput)) {
                if (helpOptSet) {
                    if (__classPrivateFieldGet(this, _exitProcess))
                        setBlocking(true);
                    skipValidation = true;
                    this.showHelp('log');
                    this.exit(0);
                }
                else if (versionOptSet) {
                    if (__classPrivateFieldGet(this, _exitProcess))
                        setBlocking(true);
                    skipValidation = true;
                    __classPrivateFieldGet(this, _usage).showVersion('log');
                    this.exit(0);
                }
            }
            if (!skipValidation && __classPrivateFieldGet(this, _options).skipValidation.length > 0) {
                skipValidation = Object.keys(argv).some(key => __classPrivateFieldGet(this, _options).skipValidation.indexOf(key) >= 0 && argv[key] === true);
            }
            if (!skipValidation) {
                if (parsed.error)
                    throw new YError(parsed.error.message);
                if (!requestCompletions) {
                    const validation = this[kRunValidation](aliases, {}, parsed.error);
                    if (!calledFromCommand) {
                        argvPromise = applyMiddleware(argv, this, __classPrivateFieldGet(this, _globalMiddleware).getMiddleware(), true);
                    }
                    argvPromise = this[kValidateAsync](validation, argvPromise !== null && argvPromise !== void 0 ? argvPromise : argv);
                    if (isPromise(argvPromise) && !calledFromCommand) {
                        argvPromise = argvPromise.then(() => {
                            return applyMiddleware(argv, this, __classPrivateFieldGet(this, _globalMiddleware).getMiddleware(), false);
                        });
                    }
                }
            }
        }
        catch (err) {
            if (err instanceof YError)
                __classPrivateFieldGet(this, _usage).fail(err.message, err);
            else
                throw err;
        }
        return this[kPostProcess](argvPromise !== null && argvPromise !== void 0 ? argvPromise : argv, populateDoubleDash, !!calledFromCommand, true);
    }
    [kRunValidation](aliases, positionalMap, parseErrors, isDefaultCommand) {
        aliases = { ...aliases };
        positionalMap = { ...positionalMap };
        const demandedOptions = { ...this.getDemandedOptions() };
        return (argv) => {
            if (parseErrors)
                throw new YError(parseErrors.message);
            __classPrivateFieldGet(this, _validation).nonOptionCount(argv);
            __classPrivateFieldGet(this, _validation).requiredArguments(argv, demandedOptions);
            let failedStrictCommands = false;
            if (__classPrivateFieldGet(this, _strictCommands)) {
                failedStrictCommands = __classPrivateFieldGet(this, _validation).unknownCommands(argv);
            }
            if (__classPrivateFieldGet(this, _strict) && !failedStrictCommands) {
                __classPrivateFieldGet(this, _validation).unknownArguments(argv, aliases, positionalMap, !!isDefaultCommand);
            }
            else if (__classPrivateFieldGet(this, _strictOptions)) {
                __classPrivateFieldGet(this, _validation).unknownArguments(argv, aliases, {}, false, false);
            }
            __classPrivateFieldGet(this, _validation).limitedChoices(argv);
            __classPrivateFieldGet(this, _validation).implications(argv);
            __classPrivateFieldGet(this, _validation).conflicting(argv);
        };
    }
    [kSetHasOutput]() {
        __classPrivateFieldSet(this, _hasOutput, true);
    }
}
export function isYargsInstance(y) {
    return !!y && typeof y.getInternalMethods === 'function';
}
