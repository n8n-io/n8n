"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimatch_1 = require("minimatch");
const node_path_1 = require("node:path");
const performance_1 = require("../performance");
const fs_1 = require("../util/fs");
const util_1 = require("../util/util");
const plugin_1 = require("./plugin");
const util_2 = require("./util");
const debug = (0, util_2.makeDebug)();
function findMatchingDependencies(dependencies, patterns) {
    return Object.keys(dependencies).filter((p) => patterns.some((w) => (0, minimatch_1.minimatch)(p, w)));
}
class PluginLoader {
    options;
    errors = [];
    plugins = new Map();
    pluginsProvided = false;
    constructor(options) {
        this.options = options;
        if (options.plugins) {
            this.pluginsProvided = true;
            this.plugins = Array.isArray(options.plugins) ? new Map(options.plugins.map((p) => [p.name, p])) : options.plugins;
        }
    }
    async loadChildren(opts) {
        if (!this.pluginsProvided || opts.force) {
            await this.loadUserPlugins(opts);
            await this.loadDevPlugins(opts);
            await this.loadCorePlugins(opts);
        }
        return { errors: this.errors, plugins: this.plugins };
    }
    async loadRoot({ pjson }) {
        let rootPlugin;
        if (this.pluginsProvided) {
            const plugins = [...this.plugins.values()];
            rootPlugin = plugins.find((p) => p.root === this.options.root) ?? plugins[0];
        }
        else {
            const marker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, 'plugin.load#root');
            rootPlugin = new plugin_1.Plugin({ isRoot: true, pjson, root: this.options.root });
            await rootPlugin.load();
            marker?.addDetails({
                commandCount: rootPlugin.commands.length,
                hasManifest: rootPlugin.hasManifest ?? false,
                name: rootPlugin.name,
                topicCount: rootPlugin.topics.length,
                type: rootPlugin.type,
                usesMain: Boolean(rootPlugin.pjson.main),
            });
            marker?.stop();
        }
        this.plugins.set(rootPlugin.name, rootPlugin);
        return rootPlugin;
    }
    async loadCorePlugins(opts) {
        const { plugins: corePlugins } = opts.rootPlugin.pjson.oclif;
        if (corePlugins) {
            const plugins = findMatchingDependencies(opts.rootPlugin.pjson.dependencies ?? {}, corePlugins);
            await this.loadPlugins(opts.rootPlugin.root, 'core', plugins);
        }
        const { core: pluginAdditionsCore, path } = opts.pluginAdditions ?? { core: [] };
        if (pluginAdditionsCore) {
            if (path) {
                // If path is provided, load plugins from the path
                const pjson = await (0, fs_1.readJson)((0, node_path_1.join)(path, 'package.json'));
                const plugins = findMatchingDependencies(pjson.dependencies ?? {}, pluginAdditionsCore);
                await this.loadPlugins(path, 'core', plugins);
            }
            else {
                const plugins = findMatchingDependencies(opts.rootPlugin.pjson.dependencies ?? {}, pluginAdditionsCore);
                await this.loadPlugins(opts.rootPlugin.root, 'core', plugins);
            }
        }
    }
    async loadDevPlugins(opts) {
        if (opts.devPlugins !== false) {
            // do not load oclif.devPlugins in production
            if ((0, util_1.isProd)())
                return;
            try {
                const { devPlugins } = opts.rootPlugin.pjson.oclif;
                if (devPlugins) {
                    const allDeps = { ...opts.rootPlugin.pjson.dependencies, ...opts.rootPlugin.pjson.devDependencies };
                    const plugins = findMatchingDependencies(allDeps ?? {}, devPlugins);
                    await this.loadPlugins(opts.rootPlugin.root, 'dev', plugins);
                }
                const { dev: pluginAdditionsDev, path } = opts.pluginAdditions ?? { core: [] };
                if (pluginAdditionsDev) {
                    if (path) {
                        // If path is provided, load plugins from the path
                        const pjson = await (0, fs_1.readJson)((0, node_path_1.join)(path, 'package.json'));
                        const allDeps = { ...pjson.dependencies, ...pjson.devDependencies };
                        const plugins = findMatchingDependencies(allDeps ?? {}, pluginAdditionsDev);
                        await this.loadPlugins(path, 'dev', plugins);
                    }
                    else {
                        const allDeps = { ...opts.rootPlugin.pjson.dependencies, ...opts.rootPlugin.pjson.devDependencies };
                        const plugins = findMatchingDependencies(allDeps ?? {}, pluginAdditionsDev);
                        await this.loadPlugins(opts.rootPlugin.root, 'dev', plugins);
                    }
                }
            }
            catch (error) {
                process.emitWarning(error);
            }
        }
    }
    async loadPlugins(root, type, plugins, parent) {
        if (!plugins || plugins.length === 0)
            return;
        const mark = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, `config.loadPlugins#${type}`);
        debug('loading plugins', plugins);
        await Promise.all((plugins || []).map(async (plugin) => {
            try {
                const name = typeof plugin === 'string' ? plugin : plugin.name;
                const opts = {
                    name,
                    root,
                    type,
                };
                if (typeof plugin !== 'string') {
                    opts.tag = plugin.tag || opts.tag;
                    opts.root = plugin.root || opts.root;
                    opts.url = plugin.url;
                }
                if (parent) {
                    opts.parent = parent;
                }
                if (this.plugins.has(name))
                    return;
                const pluginMarker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, `plugin.load#${name}`);
                const instance = new plugin_1.Plugin(opts);
                await instance.load();
                pluginMarker?.addDetails({
                    commandCount: instance.commands.length,
                    hasManifest: instance.hasManifest,
                    name: instance.name,
                    topicCount: instance.topics.length,
                    type: instance.type,
                    usesMain: Boolean(instance.pjson.main),
                });
                pluginMarker?.stop();
                this.plugins.set(instance.name, instance);
                if (parent) {
                    instance.parent = parent;
                    if (!parent.children)
                        parent.children = [];
                    parent.children.push(instance);
                }
                if (instance.pjson.oclif.plugins) {
                    const allDeps = type === 'dev'
                        ? { ...instance.pjson.dependencies, ...instance.pjson.devDependencies }
                        : instance.pjson.dependencies;
                    const plugins = findMatchingDependencies(allDeps ?? {}, instance.pjson.oclif.plugins);
                    await this.loadPlugins(instance.root, type, plugins, instance);
                }
            }
            catch (error) {
                this.errors.push(error);
            }
        }));
        mark?.addDetails({ pluginCount: plugins.length });
        mark?.stop();
    }
    async loadUserPlugins(opts) {
        if (opts.userPlugins !== false) {
            try {
                const userPJSONPath = (0, node_path_1.join)(opts.dataDir, 'package.json');
                debug('reading user plugins pjson %s', userPJSONPath);
                // ignore cache because the file might have changed within the same process (e.g. during a JIT plugin install)
                const pjson = await (0, fs_1.readJson)(userPJSONPath, false);
                if (!pjson.oclif)
                    pjson.oclif = { schema: 1 };
                if (!pjson.oclif.plugins)
                    pjson.oclif.plugins = [];
                await this.loadPlugins(userPJSONPath, 'user', pjson.oclif.plugins.filter((p) => p.type === 'user'));
                await this.loadPlugins(userPJSONPath, 'link', pjson.oclif.plugins.filter((p) => p.type === 'link'));
            }
            catch (error) {
                if (error.code !== 'ENOENT')
                    process.emitWarning(error);
            }
        }
    }
}
exports.default = PluginLoader;
