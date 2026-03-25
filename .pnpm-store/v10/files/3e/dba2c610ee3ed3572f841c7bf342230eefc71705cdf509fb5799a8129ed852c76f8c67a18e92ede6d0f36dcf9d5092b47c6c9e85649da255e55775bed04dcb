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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const ejs = __importStar(require("ejs"));
const is_wsl_1 = __importDefault(require("is-wsl"));
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const cache_1 = __importDefault(require("../cache"));
const errors_1 = require("../errors");
const util_1 = require("../help/util");
const logger_1 = require("../logger");
const module_loader_1 = require("../module-loader");
const performance_1 = require("../performance");
const settings_1 = require("../settings");
const determine_priority_1 = require("../util/determine-priority");
const fs_1 = require("../util/fs");
const ids_1 = require("../util/ids");
const os_1 = require("../util/os");
const util_2 = require("../util/util");
const ux_1 = require("../ux");
const theme_1 = require("../ux/theme");
const plugin_loader_1 = __importDefault(require("./plugin-loader"));
const ts_path_1 = require("./ts-path");
const util_3 = require("./util");
const debug = (0, util_3.makeDebug)();
const _pjson = cache_1.default.getInstance().get('@oclif/core');
const BASE = `${_pjson.name}@${_pjson.version}`;
const ROOT_ONLY_HOOKS = new Set(['preparse']);
function displayWarnings() {
    if (process.listenerCount('warning') > 1)
        return;
    process.on('warning', (warning) => {
        console.error(warning.stack);
        if (warning.detail)
            console.error(warning.detail);
    });
}
function channelFromVersion(version) {
    const m = version.match(/[^-]+(?:-([^.]+))?/);
    return (m && m[1]) || 'stable';
}
function isConfig(o) {
    return o && Boolean(o._base);
}
class Permutations extends Map {
    validPermutations = new Map();
    add(permutation, commandId) {
        this.validPermutations.set(permutation, commandId);
        for (const id of (0, util_3.collectUsableIds)([permutation])) {
            if (this.has(id)) {
                this.set(id, this.get(id).add(commandId));
            }
            else {
                this.set(id, new Set([commandId]));
            }
        }
    }
    get(key) {
        return super.get(key) ?? new Set();
    }
    getAllValid() {
        return [...this.validPermutations.keys()];
    }
    getValid(key) {
        return this.validPermutations.get(key);
    }
    hasValid(key) {
        return this.validPermutations.has(key);
    }
}
class Config {
    options;
    arch;
    bin;
    binAliases;
    binPath;
    cacheDir;
    channel;
    configDir;
    dataDir;
    dirname;
    flexibleTaxonomy;
    home;
    isSingleCommandCLI = false;
    name;
    npmRegistry;
    nsisCustomization;
    pjson;
    platform;
    plugins = new Map();
    root;
    shell;
    theme;
    topicSeparator = ':';
    updateConfig;
    userAgent;
    userPJSON;
    valid;
    version;
    warned = false;
    windows;
    _base = BASE;
    _commandIDs;
    _commands = new Map();
    _topics = new Map();
    commandPermutations = new Permutations();
    pluginLoader;
    rootPlugin;
    topicPermutations = new Permutations();
    constructor(options) {
        this.options = options;
    }
    static async load(opts = module.filename || __dirname) {
        (0, logger_1.setLogger)(opts);
        // Handle the case when a file URL string is passed in such as 'import.meta.url'; covert to file path.
        if (typeof opts === 'string' && opts.startsWith('file://')) {
            opts = (0, node_url_1.fileURLToPath)(opts);
        }
        if (typeof opts === 'string')
            opts = { root: opts };
        if (isConfig(opts)) {
            /**
             * Reload the Config based on the version required by the command.
             * This is needed because the command is given the Config instantiated
             * by the root plugin, which may be a different version than the one
             * required by the command.
             *
             * Doing this ensures that the command can freely use any method on Config that
             * exists in the version of Config required by the command but may not exist on the
             * root's instance of Config.
             */
            if (BASE !== opts._base) {
                debug(`reloading config from ${opts._base} to ${BASE}`);
                const config = new Config({ ...opts.options, plugins: opts.plugins });
                await config.load();
                return config;
            }
            return opts;
        }
        const config = new Config(opts);
        await config.load();
        return config;
    }
    get commandIDs() {
        if (this._commandIDs)
            return this._commandIDs;
        this._commandIDs = this.commands.map((c) => c.id);
        return this._commandIDs;
    }
    get commands() {
        return [...this._commands.values()];
    }
    get isProd() {
        return (0, util_2.isProd)();
    }
    static get rootPlugin() {
        return this.rootPlugin;
    }
    get topics() {
        return [...this._topics.values()];
    }
    get versionDetails() {
        const [cliVersion, architecture, nodeVersion] = this.userAgent.split(' ');
        return {
            architecture,
            cliVersion,
            nodeVersion,
            osVersion: `${(0, node_os_1.type)()} ${(0, node_os_1.release)()}`,
            pluginVersions: Object.fromEntries([...this.plugins.values()].map((p) => [p.name, { root: p.root, type: p.type, version: p.version }])),
            rootPath: this.root,
            shell: this.shell,
        };
    }
    _shell() {
        let shellPath;
        const { COMSPEC } = process.env;
        const SHELL = process.env.SHELL ?? (0, node_os_1.userInfo)().shell?.split(node_path_1.sep)?.pop();
        if (SHELL) {
            shellPath = SHELL.split('/');
        }
        else if (this.windows && process.title.toLowerCase().includes('powershell')) {
            shellPath = ['powershell'];
        }
        else if (this.windows && process.title.toLowerCase().includes('command prompt')) {
            shellPath = ['cmd.exe'];
        }
        else if (this.windows && COMSPEC) {
            shellPath = COMSPEC.split(/\\|\//);
        }
        else {
            shellPath = ['unknown'];
        }
        return shellPath.at(-1) ?? 'unknown';
    }
    dir(category) {
        const base = process.env[`XDG_${category.toUpperCase()}_HOME`] ||
            (this.windows && process.env.LOCALAPPDATA) ||
            (0, node_path_1.join)(this.home, category === 'data' ? '.local/share' : '.' + category);
        return (0, node_path_1.join)(base, this.dirname);
    }
    findCommand(id, opts = {}) {
        const lookupId = this.getCmdLookupId(id);
        const command = this._commands.get(lookupId);
        if (opts.must && !command)
            (0, errors_1.error)(`command ${lookupId} not found`);
        return command;
    }
    /**
     * Find all command ids that include the provided command id.
     *
     * For example, if the command ids are:
     * - foo:bar:baz
     * - one:two:three
     *
     * `bar` would return `foo:bar:baz`
     *
     * @param partialCmdId string
     * @param argv string[] process.argv containing the flags and arguments provided by the user
     * @returns string[]
     */
    findMatches(partialCmdId, argv) {
        const flags = argv
            .filter((arg) => !(0, util_1.getHelpFlagAdditions)(this).includes(arg) && arg.startsWith('-'))
            .map((a) => a.replaceAll('-', ''));
        const possibleMatches = [...this.commandPermutations.get(partialCmdId)].map((k) => this._commands.get(k));
        const matches = possibleMatches.filter((command) => {
            const cmdFlags = Object.entries(command.flags).flatMap(([flag, def]) => def.char ? [def.char, flag] : [flag]);
            // A command is a match if the provided flags belong to the full command
            return flags.every((f) => cmdFlags.includes(f));
        });
        return matches;
    }
    findTopic(name, opts = {}) {
        const lookupId = this.getTopicLookupId(name);
        const topic = this._topics.get(lookupId);
        if (topic)
            return topic;
        if (opts.must)
            throw new Error(`topic ${name} not found`);
    }
    /**
     * Returns an array of all command ids. If flexible taxonomy is enabled then all permutations will be appended to the array.
     * @returns string[]
     */
    getAllCommandIDs() {
        return this.getAllCommands().map((c) => c.id);
    }
    /**
     * Returns an array of all commands. If flexible taxonomy is enabled then all permutations will be appended to the array.
     * @returns Command.Loadable[]
     */
    getAllCommands() {
        const commands = [...this._commands.values()];
        const validPermutations = [...this.commandPermutations.getAllValid()];
        for (const permutation of validPermutations) {
            if (!this._commands.has(permutation)) {
                const cmd = this._commands.get(this.getCmdLookupId(permutation));
                commands.push({ ...cmd, id: permutation });
            }
        }
        return commands;
    }
    getPluginsList() {
        return [...this.plugins.values()];
    }
    // eslint-disable-next-line complexity
    async load() {
        settings_1.settings.performanceEnabled =
            (settings_1.settings.performanceEnabled === undefined ? this.options.enablePerf : settings_1.settings.performanceEnabled) ?? false;
        if (settings_1.settings.debug)
            displayWarnings();
        (0, logger_1.setLogger)(this.options);
        const marker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, 'config.load');
        this.pluginLoader = new plugin_loader_1.default({ plugins: this.options.plugins, root: this.options.root });
        this.rootPlugin = await this.pluginLoader.loadRoot({ pjson: this.options.pjson });
        // Cache the root plugin so that we can reference it later when determining if
        // we should skip ts-node registration for an ESM plugin.
        const cache = cache_1.default.getInstance();
        cache.set('rootPlugin', this.rootPlugin);
        cache.set('exitCodes', this.rootPlugin.pjson.oclif.exitCodes ?? {});
        this.root = this.rootPlugin.root;
        this.pjson = this.rootPlugin.pjson;
        this.plugins.set(this.rootPlugin.name, this.rootPlugin);
        this.root = this.rootPlugin.root;
        this.pjson = this.rootPlugin.pjson;
        this.name = this.pjson.name;
        this.version = this.options.version || this.pjson.version || '0.0.0';
        this.channel = this.options.channel || channelFromVersion(this.version);
        this.valid = this.rootPlugin.valid;
        this.arch = (0, node_os_1.arch)() === 'ia32' ? 'x86' : (0, node_os_1.arch)();
        this.platform = is_wsl_1.default ? 'wsl' : (0, os_1.getPlatform)();
        this.windows = this.platform === 'win32';
        this.bin = this.pjson.oclif.bin || this.name;
        this.binAliases = this.pjson.oclif.binAliases;
        this.nsisCustomization = this.pjson.oclif.nsisCustomization;
        this.dirname = this.pjson.oclif.dirname || this.name;
        this.flexibleTaxonomy = this.pjson.oclif.flexibleTaxonomy || false;
        // currently, only colons or spaces are valid separators
        if (this.pjson.oclif.topicSeparator && [' ', ':'].includes(this.pjson.oclif.topicSeparator))
            this.topicSeparator = this.pjson.oclif.topicSeparator;
        if (this.platform === 'win32')
            this.dirname = this.dirname.replace('/', '\\');
        this.userAgent = `${this.name}/${this.version} ${this.platform}-${this.arch} node-${process.version}`;
        this.shell = this._shell();
        this.home = process.env.HOME || (this.windows && this.windowsHome()) || (0, os_1.getHomeDir)() || (0, node_os_1.tmpdir)();
        this.cacheDir = this.scopedEnvVar('CACHE_DIR') || this.macosCacheDir() || this.dir('cache');
        this.configDir = this.scopedEnvVar('CONFIG_DIR') || this.dir('config');
        this.dataDir = this.scopedEnvVar('DATA_DIR') || this.dir('data');
        this.binPath = this.scopedEnvVar('BINPATH');
        this.npmRegistry = this.scopedEnvVar('NPM_REGISTRY') || this.pjson.oclif.npmRegistry;
        this.theme = await this.loadTheme();
        this.updateConfig = {
            ...this.pjson.oclif.update,
            node: this.pjson.oclif.update?.node ?? {},
            s3: this.buildS3Config(),
        };
        this.isSingleCommandCLI = Boolean(typeof this.pjson.oclif.commands !== 'string' &&
            this.pjson.oclif.commands?.strategy === 'single' &&
            this.pjson.oclif.commands?.target);
        this.maybeAdjustDebugSetting();
        await this.loadPluginsAndCommands();
        debug('config done');
        marker?.addDetails({
            commandPermutations: this.commands.length,
            commands: [...this.plugins.values()].reduce((acc, p) => acc + p.commands.length, 0),
            plugins: this.plugins.size,
            topics: this.topics.length,
        });
        marker?.stop();
    }
    async loadPluginsAndCommands(opts) {
        const pluginsMarker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, 'config.loadAllPlugins');
        const { errors, plugins } = await this.pluginLoader.loadChildren({
            dataDir: this.dataDir,
            devPlugins: this.options.devPlugins,
            force: opts?.force ?? false,
            pluginAdditions: this.options.pluginAdditions,
            rootPlugin: this.rootPlugin,
            userPlugins: this.options.userPlugins,
        });
        this.plugins = plugins;
        pluginsMarker?.stop();
        const commandsMarker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, 'config.loadAllCommands');
        for (const plugin of this.plugins.values()) {
            this.loadCommands(plugin);
            this.loadTopics(plugin);
        }
        commandsMarker?.stop();
        for (const error of errors) {
            this.warn(error);
        }
    }
    async loadTheme() {
        if (this.scopedEnvVarTrue('DISABLE_THEME'))
            return;
        const userThemeFile = (0, node_path_1.resolve)(this.configDir, 'theme.json');
        const getDefaultTheme = async () => {
            if (!this.pjson.oclif.theme)
                return;
            if (typeof this.pjson.oclif.theme === 'string') {
                return (0, fs_1.safeReadJson)((0, node_path_1.resolve)(this.root, this.pjson.oclif.theme));
            }
            return this.pjson.oclif.theme;
        };
        const [defaultTheme, userTheme] = await Promise.all([
            getDefaultTheme(),
            (0, fs_1.safeReadJson)(userThemeFile),
        ]);
        // Merge the default theme with the user theme, giving the user theme precedence.
        const merged = { ...defaultTheme, ...userTheme };
        return Object.keys(merged).length > 0 ? (0, theme_1.parseTheme)(merged) : undefined;
    }
    macosCacheDir() {
        return (this.platform === 'darwin' && (0, node_path_1.join)(this.home, 'Library', 'Caches', this.dirname)) || undefined;
    }
    async runCommand(id, argv = [], cachedCommand = null) {
        const marker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, `config.runCommand#${id}`);
        debug('runCommand %s %o', id, argv);
        let c = cachedCommand ?? this.findCommand(id);
        if (!c) {
            const matches = this.flexibleTaxonomy ? this.findMatches(id, argv) : [];
            const hookResult = this.flexibleTaxonomy && matches.length > 0
                ? await this.runHook('command_incomplete', { argv, id, matches })
                : await this.runHook('command_not_found', { argv, id });
            if (hookResult.successes[0])
                return hookResult.successes[0].result;
            if (hookResult.failures[0])
                throw hookResult.failures[0].error;
            throw new errors_1.CLIError(`command ${id} not found`);
        }
        if (this.isJitPluginCommand(c)) {
            const pluginName = c.pluginName;
            const pluginVersion = this.pjson.oclif.jitPlugins[pluginName];
            const jitResult = await this.runHook('jit_plugin_not_installed', {
                argv,
                command: c,
                id,
                pluginName,
                pluginVersion,
            });
            if (jitResult.failures[0])
                throw jitResult.failures[0].error;
            if (jitResult.successes[0]) {
                await this.loadPluginsAndCommands({ force: true });
                c = this.findCommand(id) ?? c;
            }
            else {
                // this means that no jit_plugin_not_installed hook exists, so we should run the default behavior
                const result = await this.runHook('command_not_found', { argv, id });
                if (result.successes[0])
                    return result.successes[0].result;
                if (result.failures[0])
                    throw result.failures[0].error;
                throw new errors_1.CLIError(`command ${id} not found`);
            }
        }
        const command = await c.load();
        await this.runHook('prerun', { argv, Command: command });
        const result = (await command.run(argv, this));
        // If plugins:uninstall was run, we need to remove all the uninstalled plugins
        // from this.plugins so that the postrun hook doesn't attempt to run any
        // hooks that might have existed in the uninstalled plugins.
        if (c.id === 'plugins:uninstall') {
            for (const arg of argv)
                this.plugins.delete(arg);
        }
        await this.runHook('postrun', { argv, Command: command, result });
        marker?.addDetails({ command: id, plugin: c.pluginName });
        marker?.stop();
        return result;
    }
    async runHook(event, opts, timeout, captureErrors) {
        const marker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, `config.runHook#${event}`);
        debug('start %s hook', event);
        const search = (m) => {
            if (typeof m === 'function')
                return m;
            if (m.default && typeof m.default === 'function')
                return m.default;
            return Object.values(m).find((m) => typeof m === 'function');
        };
        const withTimeout = async (ms, promise) => {
            let id;
            const timeout = new Promise((_, reject) => {
                id = setTimeout(() => {
                    reject(new Error(`Timed out after ${ms} ms.`));
                }, ms).unref();
            });
            return Promise.race([promise, timeout]).then((result) => {
                clearTimeout(id);
                return result;
            });
        };
        const final = {
            failures: [],
            successes: [],
        };
        const plugins = ROOT_ONLY_HOOKS.has(event) ? [this.rootPlugin] : [...this.plugins.values()];
        const promises = plugins.map(async (p) => {
            const debug = (0, logger_1.makeDebug)([p.name, 'hooks', event].join(':'));
            const context = {
                config: this,
                debug,
                error(message, options = {}) {
                    (0, errors_1.error)(message, options);
                },
                exit(code = 0) {
                    (0, errors_1.exit)(code);
                },
                log(message, ...args) {
                    ux_1.ux.stdout(message, ...args);
                },
                warn(message) {
                    (0, errors_1.warn)(message);
                },
            };
            const hooks = p.hooks[event] || [];
            for (const hook of hooks) {
                const marker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, `config.runHook#${p.name}(${hook.target})`);
                try {
                    /* eslint-disable no-await-in-loop */
                    const { filePath, isESM, module } = await (0, module_loader_1.loadWithData)(p, await (0, ts_path_1.tsPath)(p.root, hook.target, p));
                    debug('start', isESM ? '(import)' : '(require)', filePath);
                    // If no hook is found using the identifier, then we should `search` for the hook but only if the hook identifier is 'default'
                    // A named identifier (e.g. MY_HOOK) that isn't found indicates that the hook isn't implemented in the plugin.
                    const hookFn = module[hook.identifier] ?? (hook.identifier === 'default' ? search(module) : undefined);
                    if (!hookFn) {
                        debug('No hook found for hook definition:', hook);
                        continue;
                    }
                    const result = timeout
                        ? await withTimeout(timeout, hookFn.call(context, { ...opts, config: this, context }))
                        : await hookFn.call(context, { ...opts, config: this, context });
                    final.successes.push({ plugin: p, result });
                    if (p.name === '@oclif/plugin-legacy' && event === 'init') {
                        this.insertLegacyPlugins(result);
                    }
                    debug('done');
                }
                catch (error) {
                    final.failures.push({ error: error, plugin: p });
                    debug(error);
                    // Do not throw the error if
                    // captureErrors is set to true
                    // error.oclif.exit is undefined or 0
                    // error.code is MODULE_NOT_FOUND
                    if (!captureErrors &&
                        error.oclif?.exit !== undefined &&
                        error.oclif?.exit !== 0 &&
                        error.code !== 'MODULE_NOT_FOUND')
                        throw error;
                }
                marker?.addDetails({
                    event,
                    hook: hook.target,
                    plugin: p.name,
                });
                marker?.stop();
            }
        });
        await Promise.all(promises);
        debug('%s hook done', event);
        marker?.stop();
        return final;
    }
    s3Key(type, ext, options = {}) {
        if (typeof ext === 'object')
            options = ext;
        else if (ext)
            options.ext = ext;
        const template = this.updateConfig.s3?.templates?.[options.platform ? 'target' : 'vanilla'][type] ?? '';
        return ejs.render(template, { ...this, ...options });
    }
    s3Url(key) {
        const { host } = this.updateConfig.s3 ?? { host: undefined };
        if (!host)
            throw new Error('no s3 host is set');
        const url = new node_url_1.URL(host);
        url.pathname = (0, node_path_1.join)(url.pathname, key);
        return url.toString();
    }
    scopedEnvVar(k) {
        return process.env[this.scopedEnvVarKeys(k).find((k) => process.env[k])];
    }
    /**
     * this DOES NOT account for bin aliases, use scopedEnvVarKeys instead which will account for bin aliases
     * @param k {string}, the unscoped key you want to get the value for
     * @returns {string} returns the env var key
     */
    scopedEnvVarKey(k) {
        return [this.bin, k]
            .map((p) => p.replaceAll('@', '').replaceAll(/[/-]/g, '_'))
            .join('_')
            .toUpperCase();
    }
    /**
     * gets the scoped env var keys for a given key, including bin aliases
     * @param k {string}, the env key e.g. 'debug'
     * @returns {string[]} e.g. ['SF_DEBUG', 'SFDX_DEBUG']
     */
    scopedEnvVarKeys(k) {
        return [this.bin, ...(this.binAliases ?? [])]
            .filter(Boolean)
            .map((alias) => [alias.replaceAll('@', '').replaceAll(/[/-]/g, '_'), k].join('_').toUpperCase());
    }
    scopedEnvVarTrue(k) {
        const v = this.scopedEnvVar(k);
        return v === '1' || v === 'true';
    }
    windowsHome() {
        return this.windowsHomedriveHome() || this.windowsUserprofileHome();
    }
    windowsHomedriveHome() {
        return process.env.HOMEDRIVE && process.env.HOMEPATH && (0, node_path_1.join)(process.env.HOMEDRIVE, process.env.HOMEPATH);
    }
    windowsUserprofileHome() {
        return process.env.USERPROFILE;
    }
    buildS3Config() {
        const s3 = this.pjson.oclif.update?.s3;
        const bucket = this.scopedEnvVar('S3_BUCKET') ?? s3?.bucket;
        const host = s3?.host ?? (bucket && `https://${bucket}.s3.amazonaws.com`);
        const templates = {
            ...s3?.templates,
            target: {
                baseDir: '<%- bin %>',
                manifest: "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- platform %>-<%- arch %>",
                unversioned: "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- bin %>-<%- platform %>-<%- arch %><%- ext %>",
                versioned: "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- bin %>-v<%- version %>/<%- bin %>-v<%- version %>-<%- platform %>-<%- arch %><%- ext %>",
                ...(s3?.templates && s3?.templates.target),
            },
            vanilla: {
                baseDir: '<%- bin %>',
                manifest: "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %>version",
                unversioned: "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- bin %><%- ext %>",
                versioned: "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- bin %>-v<%- version %>/<%- bin %>-v<%- version %><%- ext %>",
                ...(s3?.templates && s3?.templates.vanilla),
            },
        };
        return {
            bucket,
            host,
            templates,
        };
    }
    getCmdLookupId(id) {
        if (this._commands.has(id))
            return id;
        if (this.commandPermutations.hasValid(id))
            return this.commandPermutations.getValid(id);
        return id;
    }
    getTopicLookupId(id) {
        if (this._topics.has(id))
            return id;
        if (this.topicPermutations.hasValid(id))
            return this.topicPermutations.getValid(id);
        return id;
    }
    /**
     * Insert legacy plugins
     *
     * Replace invalid CLI plugins (cli-engine plugins, mostly Heroku) loaded via `this.loadPlugins`
     * with oclif-compatible ones returned by @oclif/plugin-legacy init hook.
     *
     * @param plugins array of oclif-compatible plugins
     */
    insertLegacyPlugins(plugins) {
        for (const plugin of plugins) {
            this.plugins.set(plugin.name, plugin);
            // Delete all commands from the legacy plugin so that we can re-add them.
            // This is necessary because determinePriority will pick the initial
            // command that was added, which won't have been converted by PluginLegacy yet.
            for (const cmd of plugin.commands ?? []) {
                this._commands.delete(cmd.id);
                for (const alias of [...(cmd.aliases ?? []), ...(cmd.hiddenAliases ?? [])]) {
                    this._commands.delete(alias);
                }
            }
            this.loadCommands(plugin);
        }
    }
    isJitPluginCommand(c) {
        // Return true if the command's plugin is listed under oclif.jitPlugins AND if the plugin hasn't been loaded to this.plugins
        return (Object.keys(this.pjson.oclif.jitPlugins ?? {}).includes(c.pluginName ?? '') &&
            Boolean(c?.pluginName && !this.plugins.has(c.pluginName)));
    }
    loadCommands(plugin) {
        const marker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, `config.loadCommands#${plugin.name}`, { plugin: plugin.name });
        for (const command of plugin.commands) {
            // set canonical command id
            if (this._commands.has(command.id)) {
                const prioritizedCommand = (0, determine_priority_1.determinePriority)(this.pjson.oclif.plugins ?? [], [
                    this._commands.get(command.id),
                    command,
                ]);
                this._commands.set(prioritizedCommand.id, prioritizedCommand);
            }
            else {
                this._commands.set(command.id, command);
            }
            // v3 moved command id permutations to the manifest, but some plugins may not have
            // the new manifest yet. For those, we need to calculate the permutations here.
            const permutations = this.flexibleTaxonomy && command.permutations === undefined
                ? (0, util_3.getCommandIdPermutations)(command.id)
                : (command.permutations ?? [command.id]);
            // set every permutation
            for (const permutation of permutations) {
                this.commandPermutations.add(permutation, command.id);
            }
            const handleAlias = (alias, hidden = false) => {
                const aliasWithDefaultTopicSeparator = (0, ids_1.toStandardizedId)(alias, this);
                if (this._commands.has(aliasWithDefaultTopicSeparator)) {
                    const prioritizedCommand = (0, determine_priority_1.determinePriority)(this.pjson.oclif.plugins ?? [], [
                        this._commands.get(aliasWithDefaultTopicSeparator),
                        command,
                    ]);
                    this._commands.set(aliasWithDefaultTopicSeparator, {
                        ...prioritizedCommand,
                        id: aliasWithDefaultTopicSeparator,
                    });
                }
                else {
                    this._commands.set(aliasWithDefaultTopicSeparator, { ...command, hidden, id: aliasWithDefaultTopicSeparator });
                }
                // set every permutation of the aliases
                // v3 moved command alias permutations to the manifest, but some plugins may not have
                // the new manifest yet. For those, we need to calculate the permutations here.
                const aliasPermutations = this.flexibleTaxonomy && command.aliasPermutations === undefined
                    ? (0, util_3.getCommandIdPermutations)(aliasWithDefaultTopicSeparator)
                    : (command.permutations ?? [aliasWithDefaultTopicSeparator]);
                // set every permutation
                for (const permutation of aliasPermutations) {
                    this.commandPermutations.add(permutation, command.id);
                }
            };
            // set command aliases
            for (const alias of command.aliases ?? []) {
                handleAlias(alias);
            }
            // set hidden command aliases
            for (const alias of command.hiddenAliases ?? []) {
                handleAlias(alias, true);
            }
        }
        marker?.addDetails({ commandCount: plugin.commands.length });
        marker?.stop();
    }
    loadTopics(plugin) {
        const marker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, `config.loadTopics#${plugin.name}`, { plugin: plugin.name });
        for (const topic of (0, util_2.compact)(plugin.topics)) {
            const existing = this._topics.get(topic.name);
            if (existing) {
                existing.description = topic.description || existing.description;
                existing.hidden = existing.hidden || topic.hidden;
            }
            else {
                this._topics.set(topic.name, topic);
            }
            const permutations = this.flexibleTaxonomy ? (0, util_3.getCommandIdPermutations)(topic.name) : [topic.name];
            for (const permutation of permutations) {
                this.topicPermutations.add(permutation, topic.name);
            }
        }
        // Add missing topics for displaying help when partial commands are entered.
        for (const c of plugin.commands.filter((c) => !c.hidden)) {
            const parts = c.id.split(':');
            while (parts.length > 0) {
                const name = parts.join(':');
                if (name && !this._topics.has(name)) {
                    this._topics.set(name, { description: c.summary || c.description, name });
                }
                parts.pop();
            }
        }
        marker?.stop();
    }
    maybeAdjustDebugSetting() {
        if (this.scopedEnvVarTrue('DEBUG')) {
            settings_1.settings.debug = true;
            displayWarnings();
        }
    }
    warn(err, scope) {
        if (this.warned)
            return;
        if (typeof err === 'string') {
            process.emitWarning(err);
            return;
        }
        if (err instanceof Error) {
            const modifiedErr = err;
            modifiedErr.name = `${err.name} Plugin: ${this.name}`;
            modifiedErr.detail = (0, util_2.compact)([
                err.detail,
                `module: ${this._base}`,
                scope && `task: ${scope}`,
                `plugin: ${this.name}`,
                `root: ${this.root}`,
                'See more details with DEBUG=*',
            ]).join('\n');
            process.emitWarning(err);
            return;
        }
        // err is an object
        process.emitWarning('Config.warn expected either a string or Error, but instead received an object');
        err.name = `${err.name} Plugin: ${this.name}`;
        err.detail = (0, util_2.compact)([
            err.detail,
            `module: ${this._base}`,
            scope && `task: ${scope}`,
            `plugin: ${this.name}`,
            `root: ${this.root}`,
            'See more details with DEBUG=*',
        ]).join('\n');
        process.emitWarning(JSON.stringify(err));
    }
}
exports.Config = Config;
