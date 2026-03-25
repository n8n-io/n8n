"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
const ansis_1 = __importDefault(require("ansis"));
const node_url_1 = require("node:url");
const node_util_1 = require("node:util");
const cache_1 = __importDefault(require("./cache"));
const config_1 = require("./config");
const Errors = __importStar(require("./errors"));
const util_1 = require("./help/util");
const logger_1 = require("./logger");
const Parser = __importStar(require("./parser"));
const aggregate_flags_1 = require("./util/aggregate-flags");
const ids_1 = require("./util/ids");
const util_2 = require("./util/util");
const ux_1 = require("./ux");
const pjson = cache_1.default.getInstance().get('@oclif/core');
/**
 * swallows stdout epipe errors
 * this occurs when stdout closes such as when piping to head
 */
process.stdout.on('error', (err) => {
    if (err && err.code === 'EPIPE')
        return;
    throw err;
});
/**
 * An abstract class which acts as the base for each command
 * in your project.
 */
class Command {
    argv;
    config;
    /** An array of aliases for this command. */
    static aliases = [];
    /** An order-dependent object of arguments for the command */
    static args = {};
    static baseFlags;
    /**
     * Emit deprecation warning when a command alias is used
     */
    static deprecateAliases;
    static deprecationOptions;
    /**
     * A full description of how to use the command.
     *
     * If no summary, the first line of the description will be used as the summary.
     */
    static description;
    static enableJsonFlag = false;
    /**
     * An array of examples to show at the end of the command's help.
     *
     * IF only a string is provided, it will try to look for a line that starts
     * with the cmd.bin as the example command and the rest as the description.
     * If found, the command will be formatted appropriately.
     *
     * ```
     * EXAMPLES:
     *   A description of a particular use case.
     *
     *     $ <%= config.bin => command flags
     * ```
     */
    static examples;
    /** A hash of flags for the command */
    static flags;
    static hasDynamicHelp = false;
    static help;
    /** Hide the command from help */
    static hidden;
    /** An array of aliases for this command that are hidden from help. */
    static hiddenAliases = [];
    /** A command ID, used mostly in error or verbose reporting. */
    static id;
    static plugin;
    static pluginAlias;
    static pluginName;
    static pluginType;
    /** Mark the command as a given state (e.g. beta or deprecated) in help */
    static state;
    /** When set to false, allows a variable amount of arguments */
    static strict = true;
    /**
     * The tweet-sized description for your class, used in a parent-commands
     * sub-command listing and as the header for the command help.
     */
    static summary;
    /**
     * An override string (or strings) for the default usage documentation.
     */
    static usage;
    debug;
    id;
    static _base = `${pjson.name}@${pjson.version}`;
    constructor(argv, config) {
        this.argv = argv;
        this.config = config;
        this.id = this.ctor.id;
        try {
            this.debug = (0, logger_1.makeDebug)(this.id ? `${this.config.bin}:${this.id}` : this.config.bin);
        }
        catch {
            this.debug = () => {
                // noop
            };
        }
    }
    /**
     * instantiate and run the command
     *
     * @param {Command.Class} this - the command class
     * @param {string[]} argv argv
     * @param {LoadOptions} opts options
     * @returns {Promise<unknown>} result
     */
    static async run(argv, opts) {
        if (!argv)
            argv = process.argv.slice(2);
        // Handle the case when a file URL string is passed in such as 'import.meta.url'; covert to file path.
        if (typeof opts === 'string' && opts.startsWith('file://')) {
            opts = (0, node_url_1.fileURLToPath)(opts);
        }
        const config = await config_1.Config.load(opts || require.main?.filename || __dirname);
        const cache = cache_1.default.getInstance();
        if (!cache.has('config'))
            cache.set('config', config);
        const cmd = new this(argv, config);
        if (!cmd.id) {
            const id = cmd.constructor.name.toLowerCase();
            cmd.id = id;
            cmd.ctor.id = id;
        }
        return cmd._run();
    }
    get ctor() {
        return this.constructor;
    }
    async catch(err) {
        process.exitCode = process.exitCode ?? err.exitCode ?? 1;
        if (this.jsonEnabled()) {
            this.logJson(this.toErrorJson(err));
        }
        else {
            if (!err.message)
                throw err;
            try {
                ux_1.ux.action.stop(ansis_1.default.bold.red('!'));
            }
            catch { }
            throw err;
        }
    }
    error(input, options = {}) {
        return Errors.error(input, options);
    }
    exit(code = 0) {
        Errors.exit(code);
    }
    async finally(_) { }
    async init() {
        this.debug('init version: %s argv: %o', this.ctor._base, this.argv);
        const g = global;
        g['http-call'] = g['http-call'] || {};
        g['http-call'].userAgent = this.config.userAgent;
        this.warnIfCommandDeprecated();
    }
    /**
     * Determine if the command is being run with the --json flag in a command that supports it.
     *
     * @returns {boolean} true if the command supports json and the --json flag is present
     */
    jsonEnabled() {
        // If the command doesn't support json, return false
        if (!this.ctor.enableJsonFlag)
            return false;
        // If the CONTENT_TYPE env var is set to json, return true
        if (this.config.scopedEnvVar?.('CONTENT_TYPE')?.toLowerCase() === 'json')
            return true;
        const passThroughIndex = this.argv.indexOf('--');
        const jsonIndex = this.argv.indexOf('--json');
        return passThroughIndex === -1
            ? // If '--' is not present, then check for `--json` in this.argv
                jsonIndex > -1
            : // If '--' is present, return true only the --json flag exists and is before the '--'
                jsonIndex > -1 && jsonIndex < passThroughIndex;
    }
    log(message = '', ...args) {
        if (!this.jsonEnabled()) {
            message = typeof message === 'string' ? message : (0, node_util_1.inspect)(message);
            ux_1.ux.stdout(message, ...args);
        }
    }
    logJson(json) {
        ux_1.ux.stdout(ux_1.ux.colorizeJson(json, { pretty: true, theme: this.config.theme?.json }));
    }
    logToStderr(message = '', ...args) {
        if (!this.jsonEnabled()) {
            message = typeof message === 'string' ? message : (0, node_util_1.inspect)(message);
            ux_1.ux.stderr(message, ...args);
        }
    }
    async parse(options, argv = this.argv) {
        if (!options)
            options = this.ctor;
        const opts = {
            context: this,
            ...options,
            flags: (0, aggregate_flags_1.aggregateFlags)(options.flags, options.baseFlags, options.enableJsonFlag),
        };
        const hookResult = await this.config.runHook('preparse', { argv: [...argv], options: opts });
        // Since config.runHook will only run the hook for the root plugin, hookResult.successes will always have a length of 0 or 1
        // But to be extra safe, we find the result that matches the root plugin.
        const argvToParse = hookResult.successes?.length
            ? hookResult.successes.find((s) => s.plugin.root === cache_1.default.getInstance().get('rootPlugin')?.root)?.result ?? argv
            : argv;
        this.argv = [...argvToParse];
        const results = await Parser.parse(argvToParse, opts);
        this.warnIfFlagDeprecated(results.flags ?? {});
        return results;
    }
    toErrorJson(err) {
        return { error: err };
    }
    toSuccessJson(result) {
        return result;
    }
    warn(input) {
        if (!this.jsonEnabled())
            Errors.warn(input);
        return input;
    }
    warnIfCommandDeprecated() {
        const [id] = (0, util_1.normalizeArgv)(this.config);
        if (this.ctor.deprecateAliases && this.ctor.aliases.includes(id)) {
            const cmdName = (0, ids_1.toConfiguredId)(this.ctor.id, this.config);
            const aliasName = (0, ids_1.toConfiguredId)(id, this.config);
            this.warn((0, util_1.formatCommandDeprecationWarning)(aliasName, { to: cmdName }));
        }
        if (this.ctor.state === 'deprecated') {
            const cmdName = (0, ids_1.toConfiguredId)(this.ctor.id, this.config);
            this.warn((0, util_1.formatCommandDeprecationWarning)(cmdName, this.ctor.deprecationOptions));
        }
    }
    warnIfFlagDeprecated(flags) {
        const allFlags = (0, aggregate_flags_1.aggregateFlags)(this.ctor.flags, this.ctor.baseFlags, this.ctor.enableJsonFlag);
        for (const flag of Object.keys(flags)) {
            const flagDef = allFlags[flag];
            const deprecated = flagDef?.deprecated;
            if (deprecated) {
                this.warn((0, util_1.formatFlagDeprecationWarning)(flag, deprecated));
            }
            const deprecateAliases = flagDef?.deprecateAliases;
            if (deprecateAliases) {
                const aliases = (0, util_2.uniq)([...(flagDef?.aliases ?? []), ...(flagDef?.charAliases ?? [])]).map((a) => a.length === 1 ? `-${a}` : `--${a}`);
                if (aliases.length === 0)
                    return;
                const foundAliases = aliases.filter((alias) => this.argv.some((a) => a.startsWith(alias)));
                for (const alias of foundAliases) {
                    let preferredUsage = `--${flagDef?.name}`;
                    if (flagDef?.char) {
                        preferredUsage += ` | -${flagDef?.char}`;
                    }
                    this.warn((0, util_1.formatFlagDeprecationWarning)(alias, { to: preferredUsage }));
                }
            }
        }
    }
    async _run() {
        let err;
        let result;
        try {
            // remove redirected env var to allow subsessions to run autoupdated client
            this.removeEnvVar('REDIRECTED');
            await this.init();
            result = await this.run();
        }
        catch (error) {
            err = error;
            await this.catch(error);
        }
        finally {
            await this.finally(err);
        }
        if (result && this.jsonEnabled())
            this.logJson(this.toSuccessJson(result));
        return result;
    }
    removeEnvVar(envVar) {
        const keys = [];
        try {
            keys.push(...this.config.scopedEnvVarKeys(envVar));
        }
        catch {
            keys.push(this.config.scopedEnvVarKey(envVar));
        }
        keys.map((key) => delete process.env[key]);
    }
}
exports.Command = Command;
