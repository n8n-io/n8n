"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = exports.readStdin = void 0;
/* eslint-disable no-await-in-loop */
const node_readline_1 = require("node:readline");
const cache_1 = __importDefault(require("../cache"));
const logger_1 = require("../logger");
const util_1 = require("../util/util");
const errors_1 = require("./errors");
let debug;
try {
    debug =
        process.env.CLI_FLAGS_DEBUG === '1'
            ? (0, logger_1.makeDebug)('parser')
            : () => {
                // noop
            };
}
catch {
    debug = () => {
        // noop
    };
}
const readStdin = async () => {
    const { stdin, stdout } = process;
    // process.stdin.isTTY is true whenever it's running in a terminal.
    // process.stdin.isTTY is undefined when it's running in a pipe, e.g. echo 'foo' | my-cli command
    // process.stdin.isTTY is undefined when it's running in a spawned process, even if there's no pipe.
    // This means that reading from stdin could hang indefinitely while waiting for a non-existent pipe.
    // Because of this, we have to set a timeout to prevent the process from hanging.
    if (stdin.isTTY)
        return null;
    if (global.oclif?.stdinCache) {
        debug('resolved stdin from global cache', global.oclif.stdinCache);
        return global.oclif.stdinCache;
    }
    return new Promise((resolve) => {
        let result = '';
        const ac = new AbortController();
        const { signal } = ac;
        const timeout = setTimeout(() => ac.abort(), 10);
        const rl = (0, node_readline_1.createInterface)({
            input: stdin,
            output: stdout,
            terminal: false,
        });
        rl.on('line', (line) => {
            result += line;
        });
        rl.once('close', () => {
            clearTimeout(timeout);
            debug('resolved from stdin', result);
            global.oclif = { ...global.oclif, stdinCache: result };
            resolve(result);
        });
        signal.addEventListener('abort', () => {
            debug('stdin aborted');
            clearTimeout(timeout);
            rl.close();
            resolve(null);
        }, { once: true });
    });
};
exports.readStdin = readStdin;
function isNegativeNumber(input) {
    return /^-\d/g.test(input);
}
const validateOptions = (flag, input) => {
    if (flag.options && !flag.options.includes(input))
        throw new errors_1.FlagInvalidOptionError(flag, input);
    return input;
};
class Parser {
    input;
    argv;
    booleanFlags;
    context;
    currentFlag;
    flagAliases;
    raw = [];
    constructor(input) {
        this.input = input;
        this.context = input.context ?? {};
        this.argv = [...input.argv];
        this._setNames();
        this.booleanFlags = (0, util_1.pickBy)(input.flags, (f) => f.type === 'boolean');
        this.flagAliases = Object.fromEntries(Object.values(input.flags).flatMap((flag) => [...(flag.aliases ?? []), ...(flag.charAliases ?? [])].map((a) => [a, flag])));
    }
    async parse() {
        this._debugInput();
        // eslint-disable-next-line complexity
        const parseFlag = async (arg) => {
            const { isLong, name } = this.findFlag(arg);
            if (!name) {
                const i = arg.indexOf('=');
                if (i !== -1) {
                    const sliced = arg.slice(i + 1);
                    this.argv.unshift(sliced);
                    const equalsParsed = await parseFlag(arg.slice(0, i));
                    if (!equalsParsed) {
                        this.argv.shift();
                    }
                    return equalsParsed;
                }
                return false;
            }
            const flag = this.input.flags[name];
            if (flag.type === 'option') {
                if (!flag.multiple && this.raw.some((o) => o.type === 'flag' && o.flag === name)) {
                    throw new errors_1.CLIError(`Flag --${name} can only be specified once`);
                }
                this.currentFlag = flag;
                let input = isLong || arg.length < 3 ? this.argv.shift() : arg.slice(arg[2] === '=' ? 3 : 2);
                if (flag.allowStdin === 'only' && input !== '-' && input !== undefined && !this.findFlag(input).name) {
                    throw new errors_1.CLIError(`Flag --${name} can only be read from stdin. The value must be "-" or not provided at all.`);
                }
                if ((flag.allowStdin && input === '-') || flag.allowStdin === 'only') {
                    const stdin = await (0, exports.readStdin)();
                    if (stdin) {
                        input = stdin.trim();
                    }
                }
                // if the value ends up being one of the command's flags, the user didn't provide an input
                if (typeof input !== 'string' || this.findFlag(input).name) {
                    if (flag.options) {
                        throw new errors_1.CLIError(`Flag --${name} expects one of these values: ${flag.options.join(', ')}`);
                    }
                    throw new errors_1.CLIError(`Flag --${name} expects a value`);
                }
                this.raw.push({ flag: flag.name, input, type: 'flag' });
            }
            else {
                this.raw.push({ flag: flag.name, input: arg, type: 'flag' });
                // push the rest of the short characters back on the stack
                if (!isLong && arg.length > 2) {
                    this.argv.unshift(`-${arg.slice(2)}`);
                }
            }
            return true;
        };
        let parsingFlags = true;
        const nonExistentFlags = [];
        let dashdash = false;
        const originalArgv = [...this.argv];
        while (this.argv.length > 0) {
            const input = this.argv.shift();
            if (parsingFlags && input.startsWith('-') && input !== '-') {
                // attempt to parse as arg
                if (this.input['--'] !== false && input === '--') {
                    parsingFlags = false;
                    continue;
                }
                if (await parseFlag(input)) {
                    continue;
                }
                if (input === '--') {
                    dashdash = true;
                    continue;
                }
                if (this.input['--'] !== false && !isNegativeNumber(input)) {
                    // At this point we have a value that begins with '-' or '--'
                    // but doesn't match up to a flag definition. So we assume that
                    // this is a misspelled flag or a non-existent flag,
                    // e.g. --hekp instead of --help
                    nonExistentFlags.push(input);
                    continue;
                }
            }
            if (parsingFlags && this.currentFlag && this.currentFlag.multiple && !this.currentFlag.multipleNonGreedy) {
                this.raw.push({ flag: this.currentFlag.name, input, type: 'flag' });
                continue;
            }
            // not a flag, parse as arg
            const arg = Object.keys(this.input.args)[this._argTokens.length];
            this.raw.push({ arg, input, type: 'arg' });
        }
        const [{ args, argv }, { flags, metadata }] = await Promise.all([this._args(), this._flags()]);
        this._debugOutput(argv, args, flags);
        const unsortedArgv = (dashdash ? [...argv, ...nonExistentFlags, '--'] : [...argv, ...nonExistentFlags]);
        return {
            args: args,
            argv: unsortedArgv.sort((a, b) => originalArgv.indexOf(a) - originalArgv.indexOf(b)),
            flags,
            metadata,
            nonExistentFlags,
            raw: this.raw,
        };
    }
    async _args() {
        const argv = [];
        const args = {};
        const tokens = this._argTokens;
        let stdinRead = false;
        const ctx = this.context;
        for (const [name, arg] of Object.entries(this.input.args)) {
            const token = tokens.find((t) => t.arg === name);
            ctx.token = token;
            if (token) {
                if (arg.options && !arg.options.includes(token.input)) {
                    throw new errors_1.ArgInvalidOptionError(arg, token.input);
                }
                const parsed = await arg.parse(token.input, ctx, arg);
                argv.push(parsed);
                args[token.arg] = parsed;
            }
            else if (!arg.ignoreStdin && !stdinRead) {
                let stdin = await (0, exports.readStdin)();
                if (stdin) {
                    stdin = stdin.trim();
                    const parsed = await arg.parse(stdin, ctx, arg);
                    argv.push(parsed);
                    args[name] = parsed;
                }
                stdinRead = true;
            }
            if (!args[name] && (arg.default || arg.default === false)) {
                if (typeof arg.default === 'function') {
                    const f = await arg.default();
                    argv.push(f);
                    args[name] = f;
                }
                else {
                    argv.push(arg.default);
                    args[name] = arg.default;
                }
            }
        }
        for (const token of tokens) {
            if (args[token.arg] !== undefined)
                continue;
            argv.push(token.input);
        }
        return { args, argv };
    }
    get _argTokens() {
        return this.raw.filter((o) => o.type === 'arg');
    }
    _debugInput() {
        debug('input: %s', this.argv.join(' '));
        const args = Object.keys(this.input.args);
        if (args.length > 0) {
            debug('available args: %s', args.join(' '));
        }
        if (Object.keys(this.input.flags).length === 0)
            return;
        debug('available flags: %s', Object.keys(this.input.flags)
            .map((f) => `--${f}`)
            .join(' '));
    }
    _debugOutput(args, flags, argv) {
        if (argv.length > 0) {
            debug('argv: %o', argv);
        }
        if (Object.keys(args).length > 0) {
            debug('args: %o', args);
        }
        if (Object.keys(flags).length > 0) {
            debug('flags: %o', flags);
        }
    }
    async _flags() {
        const parseFlagOrThrowError = async (input, flag, context, token) => {
            if (!flag.parse)
                return input;
            const ctx = {
                ...context,
                error: context?.error,
                exit: context?.exit,
                log: context?.log,
                logToStderr: context?.logToStderr,
                token,
                warn: context?.warn,
            };
            try {
                if (flag.type === 'boolean') {
                    return await flag.parse(input, ctx, flag);
                }
                return await flag.parse(input, ctx, flag);
            }
            catch (error) {
                error.message = `Parsing --${flag.name} \n\t${error.message}\nSee more help with --help`;
                if (cache_1.default.getInstance().get('exitCodes')?.failedFlagParsing)
                    error.oclif = { exit: cache_1.default.getInstance().get('exitCodes')?.failedFlagParsing };
                throw error;
            }
        };
        /* Could add a valueFunction (if there is a value/env/default) and could metadata.
         *  Value function can be resolved later.
         */
        const addValueFunction = (fws) => {
            const tokenLength = fws.tokens?.length;
            // user provided some input
            if (tokenLength) {
                // boolean
                if (fws.inputFlag.flag.type === 'boolean' && (0, util_1.last)(fws.tokens)?.input) {
                    return {
                        ...fws,
                        valueFunction: async (i) => parseFlagOrThrowError((0, util_1.last)(i.tokens)?.input !== `--no-${i.inputFlag.name}`, i.inputFlag.flag, this.context, (0, util_1.last)(i.tokens)),
                    };
                }
                // multiple with custom delimiter
                if (fws.inputFlag.flag.type === 'option' && fws.inputFlag.flag.delimiter && fws.inputFlag.flag.multiple) {
                    return {
                        ...fws,
                        valueFunction: async (i) => (await Promise.all((i.tokens ?? [])
                            .flatMap((token) => token.input.split(i.inputFlag.flag.delimiter ?? ','))
                            // trim, and remove surrounding doubleQuotes (which would hav been needed if the elements contain spaces)
                            .map((v) => v
                            .trim()
                            .replace(/^"(.*)"$/, '$1')
                            .replace(/^'(.*)'$/, '$1'))
                            .map(async (v) => parseFlagOrThrowError(v, i.inputFlag.flag, this.context, {
                            ...(0, util_1.last)(i.tokens),
                            input: v,
                        })))).map((v) => validateOptions(i.inputFlag.flag, v)),
                    };
                }
                // multiple in the oclif-core style
                if (fws.inputFlag.flag.type === 'option' && fws.inputFlag.flag.multiple) {
                    return {
                        ...fws,
                        valueFunction: async (i) => Promise.all((fws.tokens ?? []).map((token) => parseFlagOrThrowError(validateOptions(i.inputFlag.flag, token.input), i.inputFlag.flag, this.context, token))),
                    };
                }
                // simple option flag
                if (fws.inputFlag.flag.type === 'option') {
                    return {
                        ...fws,
                        valueFunction: async (i) => parseFlagOrThrowError(validateOptions(i.inputFlag.flag, (0, util_1.last)(fws.tokens)?.input), i.inputFlag.flag, this.context, (0, util_1.last)(fws.tokens)),
                    };
                }
            }
            // no input: env flags
            if (fws.inputFlag.flag.env && process.env[fws.inputFlag.flag.env]) {
                const valueFromEnv = process.env[fws.inputFlag.flag.env];
                if (fws.inputFlag.flag.type === 'option' && valueFromEnv) {
                    return {
                        ...fws,
                        valueFunction: async (i) => parseFlagOrThrowError(validateOptions(i.inputFlag.flag, valueFromEnv), i.inputFlag.flag, this.context),
                    };
                }
                if (fws.inputFlag.flag.type === 'boolean') {
                    return {
                        ...fws,
                        valueFunction: async (i) => (0, util_1.isTruthy)(process.env[i.inputFlag.flag.env] ?? 'false'),
                    };
                }
            }
            // no input, but flag has default value
            // eslint-disable-next-line no-constant-binary-expression, valid-typeof
            if (typeof fws.inputFlag.flag.default !== undefined) {
                return {
                    ...fws,
                    metadata: { setFromDefault: true },
                    valueFunction: typeof fws.inputFlag.flag.default === 'function'
                        ? (i, allFlags = {}) => fws.inputFlag.flag.default({ flags: allFlags, options: i.inputFlag.flag })
                        : async () => fws.inputFlag.flag.default,
                };
            }
            // base case (no value function)
            return fws;
        };
        const addHelpFunction = (fws) => {
            if (fws.inputFlag.flag.type === 'option' && fws.inputFlag.flag.defaultHelp) {
                return {
                    ...fws,
                    helpFunction: typeof fws.inputFlag.flag.defaultHelp === 'function'
                        ? (i, flags, ...context) => 
                        // @ts-expect-error flag type isn't specific enough to know defaultHelp will definitely be there
                        i.inputFlag.flag.defaultHelp({ flags, options: i.inputFlag }, ...context)
                        : // @ts-expect-error flag type isn't specific enough to know defaultHelp will definitely be there
                            (i) => i.inputFlag.flag.defaultHelp,
                };
            }
            return fws;
        };
        const addDefaultHelp = async (fwsArray) => {
            const valueReferenceForHelp = fwsArrayToObject(flagsWithAllValues.filter((fws) => !fws.metadata?.setFromDefault));
            return Promise.all(fwsArray.map(async (fws) => {
                try {
                    if (fws.helpFunction) {
                        return {
                            ...fws,
                            metadata: {
                                ...fws.metadata,
                                defaultHelp: await fws.helpFunction?.(fws, valueReferenceForHelp, this.context),
                            },
                        };
                    }
                }
                catch {
                    // no-op
                }
                return fws;
            }));
        };
        const fwsArrayToObject = (fwsArray) => Object.fromEntries(fwsArray.filter((fws) => fws.value !== undefined).map((fws) => [fws.inputFlag.name, fws.value]));
        const flagTokenMap = this.mapAndValidateFlags();
        const flagsWithValues = await Promise.all(Object.entries(this.input.flags)
            // we check them if they have a token, or might have env, default, or defaultHelp.  Also include booleans so they get their default value
            .filter(([name, flag]) => flag.type === 'boolean' ||
            flag.env ||
            flag.default !== undefined ||
            'defaultHelp' in flag ||
            flagTokenMap.has(name))
            // match each possible flag to its token, if there is one
            .map(([name, flag]) => ({ inputFlag: { flag, name }, tokens: flagTokenMap.get(name) }))
            .map((fws) => addValueFunction(fws))
            .filter((fws) => fws.valueFunction !== undefined)
            .map((fws) => addHelpFunction(fws))
            // we can't apply the default values until all the other flags are resolved because `flag.default` can reference other flags
            .map(async (fws) => (fws.metadata?.setFromDefault ? fws : { ...fws, value: await fws.valueFunction?.(fws) })));
        const valueReference = fwsArrayToObject(flagsWithValues.filter((fws) => !fws.metadata?.setFromDefault));
        const flagsWithAllValues = await Promise.all(flagsWithValues.map(async (fws) => fws.metadata?.setFromDefault ? { ...fws, value: await fws.valueFunction?.(fws, valueReference) } : fws));
        const finalFlags = flagsWithAllValues.some((fws) => typeof fws.helpFunction === 'function')
            ? await addDefaultHelp(flagsWithAllValues)
            : flagsWithAllValues;
        return {
            flags: fwsArrayToObject(finalFlags),
            metadata: {
                flags: Object.fromEntries(finalFlags.filter((fws) => fws.metadata).map((fws) => [fws.inputFlag.name, fws.metadata])),
            },
        };
    }
    _setNames() {
        for (const k of Object.keys(this.input.flags)) {
            this.input.flags[k].name = k;
        }
        for (const k of Object.keys(this.input.args)) {
            this.input.args[k].name = k;
        }
    }
    findFlag(arg) {
        const isLong = arg.startsWith('--');
        const short = isLong ? false : arg.startsWith('-');
        const name = isLong ? this.findLongFlag(arg) : short ? this.findShortFlag(arg) : undefined;
        return { isLong, name };
    }
    findLongFlag(arg) {
        const name = arg.slice(2);
        if (this.input.flags[name]) {
            return name;
        }
        if (this.flagAliases[name]) {
            return this.flagAliases[name].name;
        }
        if (arg.startsWith('--no-')) {
            const flag = this.booleanFlags[arg.slice(5)];
            if (flag && flag.allowNo)
                return flag.name;
        }
    }
    findShortFlag([_, char]) {
        if (this.flagAliases[char]) {
            return this.flagAliases[char].name;
        }
        return Object.keys(this.input.flags).find((k) => this.input.flags[k].char === char && char !== undefined && this.input.flags[k].char !== undefined);
    }
    mapAndValidateFlags() {
        const flagTokenMap = new Map();
        for (const token of this.raw.filter((o) => o.type === 'flag')) {
            // fail fast if there are any invalid flags
            if (!(token.flag in this.input.flags)) {
                throw new errors_1.CLIError(`Unexpected flag ${token.flag}`);
            }
            const existing = flagTokenMap.get(token.flag) ?? [];
            flagTokenMap.set(token.flag, [...existing, token]);
        }
        return flagTokenMap;
    }
}
exports.Parser = Parser;
