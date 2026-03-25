"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveConfigFileAndRefs = resolveConfigFileAndRefs;
exports.resolveConfig = resolveConfig;
exports.resolvePlugins = resolvePlugins;
exports.resolveApis = resolveApis;
exports.resolveStyleguideConfig = resolveStyleguideConfig;
exports.resolvePreset = resolvePreset;
const path = require("path");
const url_1 = require("url");
const fs_1 = require("fs");
const ref_utils_1 = require("../ref-utils");
const utils_1 = require("../utils");
const resolve_1 = require("../resolve");
const builtIn_1 = require("./builtIn");
const utils_2 = require("./utils");
const env_1 = require("../env");
const config_1 = require("./config");
const logger_1 = require("../logger");
const asserts_1 = require("../rules/common/assertions/asserts");
const types_1 = require("../types");
const redocly_yaml_1 = require("../types/redocly-yaml");
const DEFAULT_PROJECT_PLUGIN_PATHS = ['@theme/plugin.js', '@theme/plugin.cjs', '@theme/plugin.mjs'];
// Cache instantiated plugins during a single execution
const pluginsCache = new Map();
async function resolveConfigFileAndRefs({ configPath, externalRefResolver = new resolve_1.BaseResolver(), base = null, }) {
    if (!configPath) {
        throw new Error('Reference to a config is required.\n');
    }
    const document = await externalRefResolver.resolveDocument(base, configPath, true);
    if (document instanceof Error) {
        throw document;
    }
    const types = (0, types_1.normalizeTypes)(redocly_yaml_1.ConfigTypes);
    const resolvedRefMap = await (0, resolve_1.resolveDocument)({
        rootDocument: document,
        rootType: types.ConfigRoot,
        externalRefResolver,
    });
    return { document, resolvedRefMap };
}
async function resolveConfig({ rawConfig, configPath, externalRefResolver, }) {
    if (rawConfig.styleguide?.extends?.some(utils_1.isNotString)) {
        throw new Error(`Error configuration format not detected in extends value must contain strings`);
    }
    const resolver = externalRefResolver ?? new resolve_1.BaseResolver((0, utils_2.getResolveConfig)(rawConfig.resolve));
    const apis = await resolveApis({
        rawConfig,
        configPath,
        resolver,
    });
    const styleguide = await resolveStyleguideConfig({
        styleguideConfig: rawConfig.styleguide,
        configPath,
        resolver,
    });
    return new config_1.Config({
        ...rawConfig,
        apis,
        styleguide,
    }, configPath);
}
function getDefaultPluginPath(configDir) {
    for (const pluginPath of DEFAULT_PROJECT_PLUGIN_PATHS) {
        const absolutePluginPath = path.resolve(configDir, pluginPath);
        if ((0, fs_1.existsSync)(absolutePluginPath)) {
            return pluginPath;
        }
    }
    return;
}
async function resolvePlugins(plugins, configDir = '') {
    if (!plugins)
        return [];
    // TODO: implement or reuse Resolver approach so it will work in node and browser envs
    const requireFunc = async (plugin) => {
        if ((0, utils_1.isString)(plugin)) {
            try {
                const maybeAbsolutePluginPath = path.resolve(configDir, plugin);
                const absolutePluginPath = (0, fs_1.existsSync)(maybeAbsolutePluginPath)
                    ? maybeAbsolutePluginPath
                    : // For plugins imported from packages specifically
                        require.resolve(plugin, {
                            paths: [
                                // Plugins imported from the node_modules in the project directory
                                configDir,
                                // Plugins imported from the node_modules in the package install directory (for example, npx cache directory)
                                __dirname,
                            ],
                        });
                if (!pluginsCache.has(absolutePluginPath)) {
                    let requiredPlugin;
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    if (typeof __webpack_require__ === 'function') {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        requiredPlugin = __non_webpack_require__(absolutePluginPath);
                    }
                    else {
                        // Workaround for dynamic imports being transpiled to require by Typescript: https://github.com/microsoft/TypeScript/issues/43329#issuecomment-811606238
                        const _importDynamic = new Function('modulePath', 'return import(modulePath)');
                        // you can import both cjs and mjs
                        const mod = await _importDynamic((0, url_1.pathToFileURL)(absolutePluginPath).href);
                        requiredPlugin = mod.default || mod;
                    }
                    const pluginCreatorOptions = { contentDir: configDir };
                    const pluginModule = (0, utils_2.isDeprecatedPluginFormat)(requiredPlugin)
                        ? requiredPlugin
                        : (0, utils_2.isCommonJsPlugin)(requiredPlugin)
                            ? await requiredPlugin(pluginCreatorOptions)
                            : await requiredPlugin?.default?.(pluginCreatorOptions);
                    if (pluginModule?.id && (0, utils_2.isDeprecatedPluginFormat)(requiredPlugin)) {
                        logger_1.logger.info(`Deprecated plugin format detected: ${pluginModule.id}\n`);
                    }
                    if (pluginModule) {
                        pluginsCache.set(absolutePluginPath, {
                            ...pluginModule,
                            path: plugin,
                            absolutePath: absolutePluginPath,
                        });
                    }
                }
                return pluginsCache.get(absolutePluginPath);
            }
            catch (e) {
                throw new Error(`Failed to load plugin "${plugin}": ${e.message}\n\n${e.stack}`);
            }
        }
        return plugin;
    };
    const seenPluginIds = new Map();
    /**
     * Include the default plugin automatically if it's not in configuration
     */
    const defaultPluginPath = getDefaultPluginPath(configDir);
    if (defaultPluginPath) {
        plugins.push(defaultPluginPath);
    }
    const resolvedPlugins = new Set();
    const instances = await Promise.all(plugins.map(async (p) => {
        if ((0, utils_1.isString)(p)) {
            if ((0, ref_utils_1.isAbsoluteUrl)(p)) {
                throw new Error(logger_1.colorize.red(`We don't support remote plugins yet.`));
            }
            if (resolvedPlugins.has(p)) {
                return;
            }
            resolvedPlugins.add(p);
        }
        const pluginModule = await requireFunc(p);
        if (!pluginModule) {
            return;
        }
        const id = pluginModule.id;
        if (typeof id !== 'string') {
            throw new Error(logger_1.colorize.red(`Plugin must define \`id\` property in ${logger_1.colorize.blue(p.toString())}.`));
        }
        if (seenPluginIds.has(id)) {
            const pluginPath = seenPluginIds.get(id);
            throw new Error(logger_1.colorize.red(`Plugin "id" must be unique. Plugin ${logger_1.colorize.blue(p.toString())} uses id "${logger_1.colorize.blue(id)}" already seen in ${logger_1.colorize.blue(pluginPath)}`));
        }
        seenPluginIds.set(id, p.toString());
        const plugin = {
            id,
            ...(pluginModule.configs ? { configs: pluginModule.configs } : {}),
            ...(pluginModule.typeExtension ? { typeExtension: pluginModule.typeExtension } : {}),
        };
        if (pluginModule.rules) {
            if (!pluginModule.rules.oas3 && !pluginModule.rules.oas2 && !pluginModule.rules.async2) {
                throw new Error(`Plugin rules must have \`oas3\`, \`oas2\`, \`async2\`, \`async3\` or \`arazzo\` rules "${p}.`);
            }
            plugin.rules = {};
            if (pluginModule.rules.oas3) {
                plugin.rules.oas3 = (0, utils_2.prefixRules)(pluginModule.rules.oas3, id);
            }
            if (pluginModule.rules.oas2) {
                plugin.rules.oas2 = (0, utils_2.prefixRules)(pluginModule.rules.oas2, id);
            }
            if (pluginModule.rules.async2) {
                plugin.rules.async2 = (0, utils_2.prefixRules)(pluginModule.rules.async2, id);
            }
            if (pluginModule.rules.async3) {
                plugin.rules.async3 = (0, utils_2.prefixRules)(pluginModule.rules.async3, id);
            }
            if (pluginModule.rules.arazzo1) {
                plugin.rules.arazzo1 = (0, utils_2.prefixRules)(pluginModule.rules.arazzo1, id);
            }
        }
        if (pluginModule.preprocessors) {
            if (!pluginModule.preprocessors.oas3 &&
                !pluginModule.preprocessors.oas2 &&
                !pluginModule.preprocessors.async2 &&
                !pluginModule.preprocessors.async3 &&
                !pluginModule.preprocessors.arazzo1) {
                throw new Error(`Plugin \`preprocessors\` must have \`oas3\`, \`oas2\` or \`async2\` preprocessors "${p}.`);
            }
            plugin.preprocessors = {};
            if (pluginModule.preprocessors.oas3) {
                plugin.preprocessors.oas3 = (0, utils_2.prefixRules)(pluginModule.preprocessors.oas3, id);
            }
            if (pluginModule.preprocessors.oas2) {
                plugin.preprocessors.oas2 = (0, utils_2.prefixRules)(pluginModule.preprocessors.oas2, id);
            }
            if (pluginModule.preprocessors.async2) {
                plugin.preprocessors.async2 = (0, utils_2.prefixRules)(pluginModule.preprocessors.async2, id);
            }
            if (pluginModule.preprocessors.async3) {
                plugin.preprocessors.async3 = (0, utils_2.prefixRules)(pluginModule.preprocessors.async3, id);
            }
            if (pluginModule.preprocessors.arazzo1) {
                plugin.preprocessors.arazzo1 = (0, utils_2.prefixRules)(pluginModule.preprocessors.arazzo1, id);
            }
        }
        if (pluginModule.decorators) {
            if (!pluginModule.decorators.oas3 &&
                !pluginModule.decorators.oas2 &&
                !pluginModule.decorators.async2 &&
                !pluginModule.decorators.async3 &&
                !pluginModule.decorators.arazzo1) {
                throw new Error(`Plugin \`decorators\` must have \`oas3\`, \`oas2\`, \`async2\` or \`async3\` decorators "${p}.`);
            }
            plugin.decorators = {};
            if (pluginModule.decorators.oas3) {
                plugin.decorators.oas3 = (0, utils_2.prefixRules)(pluginModule.decorators.oas3, id);
            }
            if (pluginModule.decorators.oas2) {
                plugin.decorators.oas2 = (0, utils_2.prefixRules)(pluginModule.decorators.oas2, id);
            }
            if (pluginModule.decorators.async2) {
                plugin.decorators.async2 = (0, utils_2.prefixRules)(pluginModule.decorators.async2, id);
            }
            if (pluginModule.decorators.async3) {
                plugin.decorators.async3 = (0, utils_2.prefixRules)(pluginModule.decorators.async3, id);
            }
            if (pluginModule.decorators.arazzo1) {
                plugin.decorators.arazzo1 = (0, utils_2.prefixRules)(pluginModule.decorators.arazzo1, id);
            }
        }
        if (pluginModule.assertions) {
            plugin.assertions = pluginModule.assertions;
        }
        return {
            ...pluginModule,
            ...plugin,
        };
    }));
    return instances.filter(utils_1.isDefined);
}
async function resolveApis({ rawConfig, configPath = '', resolver, }) {
    const { apis = {}, styleguide: styleguideConfig = {} } = rawConfig;
    const resolvedApis = {};
    for (const [apiName, apiContent] of Object.entries(apis || {})) {
        if (apiContent.styleguide?.extends?.some(utils_1.isNotString)) {
            throw new Error(`Error configuration format not detected in extends value must contain strings`);
        }
        const rawStyleguideConfig = getMergedRawStyleguideConfig(styleguideConfig, apiContent.styleguide);
        const resolvedApiConfig = await resolveStyleguideConfig({
            styleguideConfig: rawStyleguideConfig,
            configPath,
            resolver,
        });
        resolvedApis[apiName] = { ...apiContent, styleguide: resolvedApiConfig };
    }
    return resolvedApis;
}
async function resolveAndMergeNestedStyleguideConfig({ styleguideConfig, configPath = '', resolver = new resolve_1.BaseResolver(), parentConfigPaths = [], extendPaths = [], }) {
    if (parentConfigPaths.includes(configPath)) {
        throw new Error(`Circular dependency in config file: "${configPath}"`);
    }
    const plugins = env_1.isBrowser
        ? // In browser, we don't support plugins from config file yet
            [builtIn_1.defaultPlugin]
        : (0, utils_2.getUniquePlugins)(await resolvePlugins([...(styleguideConfig?.plugins || []), builtIn_1.defaultPlugin], path.dirname(configPath)));
    const pluginPaths = styleguideConfig?.plugins
        ?.filter(utils_1.isString)
        .map((p) => path.resolve(path.dirname(configPath), p));
    const resolvedConfigPath = (0, ref_utils_1.isAbsoluteUrl)(configPath)
        ? configPath
        : configPath && path.resolve(configPath);
    const extendConfigs = await Promise.all(styleguideConfig?.extends?.map(async (presetItem) => {
        if (!(0, ref_utils_1.isAbsoluteUrl)(presetItem) && !path.extname(presetItem)) {
            return resolvePreset(presetItem, plugins);
        }
        const pathItem = (0, ref_utils_1.isAbsoluteUrl)(presetItem)
            ? presetItem
            : (0, ref_utils_1.isAbsoluteUrl)(configPath)
                ? new URL(presetItem, configPath).href
                : path.resolve(path.dirname(configPath), presetItem);
        const extendedStyleguideConfig = await loadExtendStyleguideConfig(pathItem, resolver);
        return await resolveAndMergeNestedStyleguideConfig({
            styleguideConfig: extendedStyleguideConfig,
            configPath: pathItem,
            resolver,
            parentConfigPaths: [...parentConfigPaths, resolvedConfigPath],
            extendPaths,
        });
    }) || []);
    const { plugins: mergedPlugins = [], ...styleguide } = (0, utils_2.mergeExtends)([
        ...extendConfigs,
        {
            ...styleguideConfig,
            plugins,
            extends: undefined,
            extendPaths: [...parentConfigPaths, resolvedConfigPath],
            pluginPaths,
        },
    ]);
    return {
        ...styleguide,
        extendPaths: styleguide.extendPaths?.filter((path) => path && !(0, ref_utils_1.isAbsoluteUrl)(path)),
        plugins: (0, utils_2.getUniquePlugins)(mergedPlugins),
        recommendedFallback: styleguideConfig?.recommendedFallback,
        doNotResolveExamples: styleguideConfig?.doNotResolveExamples,
    };
}
async function resolveStyleguideConfig(opts) {
    const resolvedStyleguideConfig = await resolveAndMergeNestedStyleguideConfig(opts);
    return {
        ...resolvedStyleguideConfig,
        rules: resolvedStyleguideConfig.rules && groupStyleguideAssertionRules(resolvedStyleguideConfig),
    };
}
function resolvePreset(presetName, plugins) {
    const { pluginId, configName } = (0, utils_2.parsePresetName)(presetName);
    const plugin = plugins.find((p) => p.id === pluginId);
    if (!plugin) {
        throw new Error(`Invalid config ${logger_1.colorize.red(presetName)}: plugin ${pluginId} is not included.`);
    }
    const preset = plugin.configs?.[configName];
    if (!preset) {
        throw new Error(pluginId
            ? `Invalid config ${logger_1.colorize.red(presetName)}: plugin ${pluginId} doesn't export config with name ${configName}.`
            : `Invalid config ${logger_1.colorize.red(presetName)}: there is no such built-in config.`);
    }
    return preset;
}
async function loadExtendStyleguideConfig(filePath, resolver) {
    try {
        const { parsed } = (await resolver.resolveDocument(null, filePath));
        const rawConfig = (0, utils_2.transformConfig)(parsed);
        if (!rawConfig.styleguide) {
            throw new Error(`Styleguide configuration format not detected: "${filePath}"`);
        }
        return rawConfig.styleguide;
    }
    catch (error) {
        throw new Error(`Failed to load "${filePath}": ${error.message}`);
    }
}
function getMergedRawStyleguideConfig(rootStyleguideConfig, apiStyleguideConfig) {
    const resultLint = {
        ...rootStyleguideConfig,
        ...(0, utils_1.pickDefined)(apiStyleguideConfig),
        rules: { ...rootStyleguideConfig?.rules, ...apiStyleguideConfig?.rules },
        oas2Rules: { ...rootStyleguideConfig?.oas2Rules, ...apiStyleguideConfig?.oas2Rules },
        oas3_0Rules: { ...rootStyleguideConfig?.oas3_0Rules, ...apiStyleguideConfig?.oas3_0Rules },
        oas3_1Rules: { ...rootStyleguideConfig?.oas3_1Rules, ...apiStyleguideConfig?.oas3_1Rules },
        async2Rules: { ...rootStyleguideConfig?.async2Rules, ...apiStyleguideConfig?.async2Rules },
        async3Rules: { ...rootStyleguideConfig?.async3Rules, ...apiStyleguideConfig?.async3Rules },
        arazzo1Rules: { ...rootStyleguideConfig?.arazzo1Rules, ...apiStyleguideConfig?.arazzo1Rules },
        preprocessors: {
            ...rootStyleguideConfig?.preprocessors,
            ...apiStyleguideConfig?.preprocessors,
        },
        oas2Preprocessors: {
            ...rootStyleguideConfig?.oas2Preprocessors,
            ...apiStyleguideConfig?.oas2Preprocessors,
        },
        oas3_0Preprocessors: {
            ...rootStyleguideConfig?.oas3_0Preprocessors,
            ...apiStyleguideConfig?.oas3_0Preprocessors,
        },
        oas3_1Preprocessors: {
            ...rootStyleguideConfig?.oas3_1Preprocessors,
            ...apiStyleguideConfig?.oas3_1Preprocessors,
        },
        decorators: { ...rootStyleguideConfig?.decorators, ...apiStyleguideConfig?.decorators },
        oas2Decorators: {
            ...rootStyleguideConfig?.oas2Decorators,
            ...apiStyleguideConfig?.oas2Decorators,
        },
        oas3_0Decorators: {
            ...rootStyleguideConfig?.oas3_0Decorators,
            ...apiStyleguideConfig?.oas3_0Decorators,
        },
        oas3_1Decorators: {
            ...rootStyleguideConfig?.oas3_1Decorators,
            ...apiStyleguideConfig?.oas3_1Decorators,
        },
        recommendedFallback: apiStyleguideConfig?.extends
            ? false
            : rootStyleguideConfig.recommendedFallback,
    };
    return resultLint;
}
function groupStyleguideAssertionRules({ rules, plugins, }) {
    if (!rules) {
        return rules;
    }
    // Create a new record to avoid mutating original
    const transformedRules = {};
    // Collect assertion rules
    const assertions = [];
    for (const [ruleKey, rule] of Object.entries(rules)) {
        // keep the old assert/ syntax as an alias
        if ((ruleKey.startsWith('rule/') || ruleKey.startsWith('assert/')) &&
            typeof rule === 'object' &&
            rule !== null) {
            const assertion = rule;
            if (plugins) {
                registerCustomAssertions(plugins, assertion);
                // We may have custom assertion inside where block
                for (const context of assertion.where || []) {
                    registerCustomAssertions(plugins, context);
                }
            }
            assertions.push({
                ...assertion,
                assertionId: ruleKey,
            });
        }
        else {
            // If it's not an assertion, keep it as is
            transformedRules[ruleKey] = rule;
        }
    }
    if (assertions.length > 0) {
        transformedRules.assertions = assertions;
    }
    return transformedRules;
}
function registerCustomAssertions(plugins, assertion) {
    for (const field of (0, utils_1.keysOf)(assertion.assertions)) {
        const [pluginId, fn] = field.split('/');
        if (!pluginId || !fn)
            continue;
        const plugin = plugins.find((plugin) => plugin.id === pluginId);
        if (!plugin) {
            throw Error(logger_1.colorize.red(`Plugin ${logger_1.colorize.blue(pluginId)} isn't found.`));
        }
        if (!plugin.assertions || !plugin.assertions[fn]) {
            throw Error(`Plugin ${logger_1.colorize.red(pluginId)} doesn't export assertions function with name ${logger_1.colorize.red(fn)}.`);
        }
        asserts_1.asserts[field] = (0, asserts_1.buildAssertCustomFunction)(plugin.assertions[fn]);
    }
}
