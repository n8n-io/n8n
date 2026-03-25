import { isCommandBuilderCallback } from './command.js';
import { assertNotStrictEqual } from './typings/common-types.js';
import * as templates from './completion-templates.js';
import { isPromise } from './utils/is-promise.js';
import { parseCommand } from './parse-command.js';
export class Completion {
    constructor(yargs, usage, command, shim) {
        var _a, _b, _c;
        this.yargs = yargs;
        this.usage = usage;
        this.command = command;
        this.shim = shim;
        this.completionKey = 'get-yargs-completions';
        this.aliases = null;
        this.customCompletionFunction = null;
        this.zshShell =
            (_c = (((_a = this.shim.getEnv('SHELL')) === null || _a === void 0 ? void 0 : _a.includes('zsh')) ||
                ((_b = this.shim.getEnv('ZSH_NAME')) === null || _b === void 0 ? void 0 : _b.includes('zsh')))) !== null && _c !== void 0 ? _c : false;
    }
    defaultCompletion(args, argv, current, done) {
        const handlers = this.command.getCommandHandlers();
        for (let i = 0, ii = args.length; i < ii; ++i) {
            if (handlers[args[i]] && handlers[args[i]].builder) {
                const builder = handlers[args[i]].builder;
                if (isCommandBuilderCallback(builder)) {
                    const y = this.yargs.getInternalMethods().reset();
                    builder(y, true);
                    return y.argv;
                }
            }
        }
        const completions = [];
        this.commandCompletions(completions, args, current);
        this.optionCompletions(completions, args, argv, current);
        done(null, completions);
    }
    commandCompletions(completions, args, current) {
        const parentCommands = this.yargs.getInternalMethods().getContext()
            .commands;
        if (!current.match(/^-/) &&
            parentCommands[parentCommands.length - 1] !== current) {
            this.usage.getCommands().forEach(usageCommand => {
                const commandName = parseCommand(usageCommand[0]).cmd;
                if (args.indexOf(commandName) === -1) {
                    if (!this.zshShell) {
                        completions.push(commandName);
                    }
                    else {
                        const desc = usageCommand[1] || '';
                        completions.push(commandName.replace(/:/g, '\\:') + ':' + desc);
                    }
                }
            });
        }
    }
    optionCompletions(completions, args, argv, current) {
        if (current.match(/^-/) || (current === '' && completions.length === 0)) {
            const options = this.yargs.getOptions();
            const positionalKeys = this.yargs.getGroups()[this.usage.getPositionalGroupName()] || [];
            Object.keys(options.key).forEach(key => {
                const negable = !!options.configuration['boolean-negation'] &&
                    options.boolean.includes(key);
                const isPositionalKey = positionalKeys.includes(key);
                if (!isPositionalKey &&
                    !this.argsContainKey(args, argv, key, negable)) {
                    this.completeOptionKey(key, completions, current);
                    if (negable && !!options.default[key])
                        this.completeOptionKey(`no-${key}`, completions, current);
                }
            });
        }
    }
    argsContainKey(args, argv, key, negable) {
        if (args.indexOf(`--${key}`) !== -1)
            return true;
        if (negable && args.indexOf(`--no-${key}`) !== -1)
            return true;
        if (this.aliases) {
            for (const alias of this.aliases[key]) {
                if (argv[alias] !== undefined)
                    return true;
            }
        }
        return false;
    }
    completeOptionKey(key, completions, current) {
        const descs = this.usage.getDescriptions();
        const startsByTwoDashes = (s) => /^--/.test(s);
        const isShortOption = (s) => /^[^0-9]$/.test(s);
        const dashes = !startsByTwoDashes(current) && isShortOption(key) ? '-' : '--';
        if (!this.zshShell) {
            completions.push(dashes + key);
        }
        else {
            const desc = descs[key] || '';
            completions.push(dashes +
                `${key.replace(/:/g, '\\:')}:${desc.replace('__yargsString__:', '')}`);
        }
    }
    customCompletion(args, argv, current, done) {
        assertNotStrictEqual(this.customCompletionFunction, null, this.shim);
        if (isSyncCompletionFunction(this.customCompletionFunction)) {
            const result = this.customCompletionFunction(current, argv);
            if (isPromise(result)) {
                return result
                    .then(list => {
                    this.shim.process.nextTick(() => {
                        done(null, list);
                    });
                })
                    .catch(err => {
                    this.shim.process.nextTick(() => {
                        done(err, undefined);
                    });
                });
            }
            return done(null, result);
        }
        else if (isFallbackCompletionFunction(this.customCompletionFunction)) {
            return this.customCompletionFunction(current, argv, (onCompleted = done) => this.defaultCompletion(args, argv, current, onCompleted), completions => {
                done(null, completions);
            });
        }
        else {
            return this.customCompletionFunction(current, argv, completions => {
                done(null, completions);
            });
        }
    }
    getCompletion(args, done) {
        const current = args.length ? args[args.length - 1] : '';
        const argv = this.yargs.parse(args, true);
        const completionFunction = this.customCompletionFunction
            ? (argv) => this.customCompletion(args, argv, current, done)
            : (argv) => this.defaultCompletion(args, argv, current, done);
        return isPromise(argv)
            ? argv.then(completionFunction)
            : completionFunction(argv);
    }
    generateCompletionScript($0, cmd) {
        let script = this.zshShell
            ? templates.completionZshTemplate
            : templates.completionShTemplate;
        const name = this.shim.path.basename($0);
        if ($0.match(/\.js$/))
            $0 = `./${$0}`;
        script = script.replace(/{{app_name}}/g, name);
        script = script.replace(/{{completion_command}}/g, cmd);
        return script.replace(/{{app_path}}/g, $0);
    }
    registerFunction(fn) {
        this.customCompletionFunction = fn;
    }
    setParsed(parsed) {
        this.aliases = parsed.aliases;
    }
}
export function completion(yargs, usage, command, shim) {
    return new Completion(yargs, usage, command, shim);
}
function isSyncCompletionFunction(completionFunction) {
    return completionFunction.length < 3;
}
function isFallbackCompletionFunction(completionFunction) {
    return completionFunction.length > 3;
}
